"""Batch tools that run the full SEO pipeline once per article title.

Provides:
  - run_single_pipeline(title): one title, with self-healing retry discipline.
  - run_article_batch(titles): many titles in parallel (bounded concurrency),
    with a live progress journal (batch_progress.json) served over HTTP.
"""

import os
import glob
import json
import uuid
import asyncio
import threading
from datetime import datetime, timezone
from typing import Any

from google.adk.runners import Runner
from google.adk.apps.app import App
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.genai import types

from ..ai_router import ai_router_completion_kwargs
from .docx_generator import generate_docx

_SEO_APP_NAME = "seo_v2"
_BATCH_PROGRESS_FILENAME = "batch_progress.json"
_TRIVIAL_CONTENT_LEN = 200
_PIPELINE_TIMEOUT_SECONDS = 120
_FALLBACK_TIMEOUT_SECONDS = 60

_batch_progress_lock = threading.Lock()


def _parse_curated_titles(final_text: str, field: str) -> list[str]:
    """Extract five usable titles while discarding model formatting metadata."""
    titles: list[str] = []
    in_titles = False
    for line in final_text.splitlines():
        line = line.strip()
        low = line.lower()
        if low.startswith("# curated titles"):
            in_titles = True
            continue
        if low.startswith("##") or low.startswith("#"):
            if in_titles and low.startswith("##"):
                break
            continue
        if not in_titles and not (
            line[:1].isdigit() and len(line) > 1 and line[1] in ". )\t"
        ):
            continue

        stripped = line.lstrip("0123456789.)- \t").replace("**", "").strip()
        if not stripped or len(stripped) < 8:
            continue
        if any(
            marker in stripped.lower()
            for marker in (
                "i need to",
                "let me",
                "call get_google_trends",
                "call web_search_with_grounding",
                "these are independent",
                "these are parallel",
                "the user wants",
                "i'll",
                "i can",
                "i'm going to",
                "combine data",
                "google trends",
                "web search:",
                "trend evidence",
                "the most recent",
                "field:",
                "topic:",
                "category:",
                "craft 5 titles",
            )
        ):
            continue

        if " - \"" in stripped:
            stripped = stripped.split(" - \"", 1)[0].strip()
        if stripped and stripped.lower() not in {title.lower() for title in titles}:
            titles.append(stripped)

    field_label = field.strip().strip("-:").title() or "This Topic"
    year = datetime.now(timezone.utc).year
    fallback_titles = [
        f"How {field_label} Is Changing in {year}",
        f"A Practical Guide to {field_label} for Beginners",
        f"The Biggest {field_label} Trends to Watch This Year",
        f"What {field_label} Means for Businesses and Everyday Users",
        f"How to Evaluate New {field_label} Products and Ideas",
    ]
    for fallback in fallback_titles:
        if len(titles) >= 5:
            break
        if fallback.lower() not in {title.lower() for title in titles}:
            titles.append(fallback)
    return titles[:5]


def _docx_snapshot(output_dir: str) -> dict[str, float]:
    """Map of .docx filename -> last mtime currently present in output_dir."""
    snap: dict[str, float] = {}
    for f in glob.glob(os.path.join(output_dir, "*.docx")):
        snap[os.path.basename(f)] = os.path.getmtime(f)
    return snap


def _new_docx_files(before: dict[str, float], after: dict[str, float]) -> dict[str, float]:
    """Files created (or rewritten) since the `before` snapshot, name -> mtime."""
    return {name: mtime for name, mtime in after.items() if before.get(name) != mtime}


def _docx_from_tool_events(events) -> str | None:
    """Return the exact .docx path reported by this run's generate_docx tool call."""
    for ev in events:
        for part in ev.content.parts or []:
            fr = getattr(part, "function_response", None)
            if not fr or getattr(fr, "name", "") != "generate_docx":
                continue
            resp = getattr(fr, "response", None)
            if isinstance(resp, str):
                try:
                    resp = json.loads(resp)
                except Exception:
                    continue
            if isinstance(resp, dict) and resp.get("status") == "success":
                fp = resp.get("filepath")
                if fp and os.path.isfile(fp):
                    return fp
    return None


def _strip_thinking(text: str) -> str:
    thought_markers = (
        "let me analyze",
        "let me think",
        "let me outline",
        "let me plan",
        "let me structure",
        "i need to write",
        "i'm going to",
        "i will write",
        "first,",
        "second,",
        "now, let me",
        "here's my plan",
        "as the",
        "my job is to",
        "according to the guard",
        "the guard check",
        "the chain-of-thought",
        "cannot generate social versions",
        "this is a problem",
    )
    lines: list[str] = []
    for line in text.splitlines():
        low = line.strip().lower()
        if not low:
            lines.append(line)
            continue
        if any(low.startswith(m) for m in thought_markers) and len(low) < 120:
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _extract_content(events) -> str:
    """Best-effort article content from the pipeline events.

    Returns the longest full model turn (usually the article), with the last
    model turn (usually the social package) appended when different.
    """
    turns: list[str] = []
    for ev in events:
        if ev.partial:
            continue
        text = "".join(getattr(p, "text", None) or "" for p in ev.content.parts or [])
        if text.strip():
            turns.append(text)
    if not turns:
        buffer = ""
        for ev in events:
            for part in ev.content.parts or []:
                txt = getattr(part, "text", None)
                if txt:
                    buffer += txt
        if buffer.strip():
            turns.append(buffer)
    if not turns:
        return ""
    longest = max(turns, key=len)
    last = turns[-1]
    content = longest
    if last != longest:
        content = longest + "\n\n" + last
    return _strip_thinking(content).strip()


def _resolve_output_dir() -> str:
    """The dir where generate_docx writes files = the app root (seo_v2 folder).

    In a container, SEO_DATA_DIR points at a mounted volume so generated
    .docx files, sessions.json and batch_progress.json survive restarts
    while the code itself stays read-only in the image.
    """
    data_dir = os.environ.get("SEO_DATA_DIR", "").strip()
    if data_dir:
        return data_dir
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_env_once() -> None:
    """Ensure the app's .env keys are available even when run standalone."""
    try:
        from dotenv import load_dotenv

        env_path = os.path.join(_resolve_output_dir(), ".env")
        if os.path.isfile(env_path):
            load_dotenv(env_path, override=False)
    except Exception:
        pass


def _build_runner() -> tuple[Runner, InMemorySessionService]:
    """Fresh in-memory runner wired to the full SEO pipeline."""
    # Deferred import avoids a circular import with agent.py at module load.
    from ..sub_agents.seo_pipeline import seo_pipeline_agent

    session_service = InMemorySessionService()
    memory_service = InMemoryMemoryService()
    app = App(
        name=_SEO_APP_NAME,
        root_agent=seo_pipeline_agent,
    )
    runner = Runner(
        app=app,
        app_name=_SEO_APP_NAME,
        session_service=session_service,
        memory_service=memory_service,
    )
    return runner, session_service


async def curate_titles(field: str) -> dict[str, Any]:
    """Run the TitleCurator agent for a field of interest.

    Returns {"status": "success", "titles": [str, ...]} with at least 5
    curated titles, or {"status": "error", "error_message": str}.
    """
    if not field or len(field.strip()) < 2:
        return {"status": "error", "error_message": "Field of interest is too short."}
    field = field.strip()

    _load_env_once()
    from ..sub_agents.title_curator import title_curator_agent

    session_service = InMemorySessionService()
    memory_service = InMemoryMemoryService()
    app = App(name=_SEO_APP_NAME, root_agent=title_curator_agent)
    runner = Runner(
        app=app,
        app_name=_SEO_APP_NAME,
        session_service=session_service,
        memory_service=memory_service,
    )
    session_id = f"curate_{uuid.uuid4().hex[:12]}"

    try:
        await session_service.create_session(
            app_name=_SEO_APP_NAME,
            user_id="ui_user",
            session_id=session_id,
        )
        events = []
        async for event in runner.run_async(
            user_id="ui_user",
            session_id=session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=f"Curate article titles for the field of interest: {field}")],
            ),
        ):
            events.append(event)

        # Concatenate all non-partial model turns (the curator may stream
        # research notes before the final title list).
        final_text = ""
        for ev in events:
            if getattr(ev, "partial", False):
                continue
            text = "".join(getattr(p, "text", None) or "" for p in ev.content.parts or [])
            if text.strip():
                final_text += "\n" + text

        titles = _parse_curated_titles(final_text, field)
        if len(titles) < 5:
            return {
                "status": "error",
                "error_message": f"Curator produced only {len(titles)} titles: {final_text[:200]}",
            }
        return {"status": "success", "titles": titles, "raw": final_text[:500]}
    except Exception as e:
        return {"status": "error", "error_message": f"Title curation failed: {str(e)}"}


def _result_dict(
    title: str,
    docx_path: str,
    fallback_used: bool = False,
    note: str = "",
    job_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from urllib.parse import quote

    filename = os.path.basename(docx_path)
    result: dict[str, Any] = {
        "status": "success",
        "title": title,
        "job_id": job_id or "",
        "filename": filename,
        "filepath": docx_path,
        "url": f"/files/{quote(filename)}",
        "fallback_used": bool(fallback_used),
    }
    if note:
        result["note"] = note
    if extra:
        result.update(extra)
    return result


def _rename_embed_job_id(docx_path: str, job_id: str) -> str:
    """Rename a generated file so its name carries the job_id."""
    base = os.path.basename(docx_path)
    if job_id and job_id in base:
        return docx_path
    stem, ext = os.path.splitext(base)
    new_path = os.path.join(os.path.dirname(docx_path), f"{stem}_{job_id}{ext}")
    if os.path.exists(new_path):
        raise RuntimeError(f"Cannot embed job_id: target already exists: {new_path}")
    os.rename(docx_path, new_path)
    return new_path


async def _execute_pipeline(
    title: str, user_message: str, job_id: str | None = None
) -> tuple[dict[str, Any], str]:
    """Run the nested SEO pipeline once.

    Returns (result_dict, fallback_content). fallback_content is the text that
    was used to build the fallback docx ("" when the pipeline itself produced a
    real .docx file). When job_id is given, the returned filepath ALWAYS
    contains it (asserted); a file without the job_id is never associated
    with this title.
    """
    session_id = f"single_{uuid.uuid4().hex[:12]}"
    runner, session_service = _build_runner()

    try:
        before = _docx_snapshot(_resolve_output_dir())
        events = []

        await session_service.create_session(
            app_name=_SEO_APP_NAME,
            user_id="batch_user",
            session_id=session_id,
        )

        async for event in runner.run_async(
            user_id="batch_user",
            session_id=session_id,
            new_message=types.Content(
                role="user",
                parts=[types.Part(text=user_message)],
            ),
        ):
            events.append(event)

        if not events:
            return {
                "status": "error",
                "error_message": "Pipeline produced no output for this title.",
            }, ""

        own_docx = _docx_from_tool_events(events)

        if own_docx:
            docx_path = own_docx
            if os.path.isfile(docx_path):
                if job_id:
                    docx_path = _rename_embed_job_id(docx_path, job_id)
                    assert job_id in docx_path, f"job_id {job_id} missing from {docx_path}"
                return _result_dict(title, docx_path, job_id=job_id), ""

        after = _docx_snapshot(_resolve_output_dir())
        new_files = _new_docx_files(before, after)

        # anti-collision: never accept a sibling's file from the shared dir
        if job_id:
            new_files = {name: mtime for name, mtime in new_files.items() if job_id in name}
        if new_files:
            docx_path = max(
                (f for f in new_files),
                key=lambda f: new_files[f],
            )
            docx_path = os.path.join(_resolve_output_dir(), docx_path)
            if job_id:
                assert job_id in docx_path, f"job_id {job_id} missing from {docx_path}"
            return _result_dict(title, docx_path, job_id=job_id), ""

        fallback_content = _extract_content(events)
        if not fallback_content:
            fallback_content = title
        res = await generate_docx(
            article_text=fallback_content,
            title=title,
            output_dir=_resolve_output_dir(),
            job_id=job_id,
        )
        if res.get("status") != "success":
            return {
                "status": "error",
                "error_message": f"Pipeline produced no .docx and fallback generation failed: {res.get('error_message', 'unknown')}",
            }, fallback_content
        docx_path = res.get("filepath")
        if job_id:
            assert job_id in docx_path, f"job_id {job_id} missing from {docx_path}"
        return (
            _result_dict(
                title,
                docx_path,
                fallback_used=True,
                note="Pipeline produced no .docx; document was generated from the pipeline output.",
                job_id=job_id,
            ),
            fallback_content,
        )
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Pipeline run failed: {str(e)}",
        }, ""


async def _generate_fallback_article(title: str, job_id: str | None = None) -> dict[str, Any]:
    """Generate an article directly when the enrichment pipeline cannot finish."""
    from litellm import acompletion

    prompt = f"""Write a complete, publication-ready SEO article about this exact title:
{title}

Requirements:
- 900-1400 words with a strong introduction, useful subheadings, and a conclusion.
- Stay strictly on the subject in the title; never substitute a different product,
  company, or topic.
- Use clear, factual language. Do not invent statistics, quotes, or citations.
- If current research is unavailable, state that the article is a general overview.
- Return only the article in Markdown. Do not include analysis or a plan."""

    try:
        response = await asyncio.wait_for(
            acompletion(
                **ai_router_completion_kwargs(),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.45,
                max_tokens=2200,
            ),
            timeout=_FALLBACK_TIMEOUT_SECONDS,
        )
        content = ""
        choices = getattr(response, "choices", None) or []
        if choices:
            message = getattr(choices[0], "message", None)
            content = getattr(message, "content", None) or ""
        content = _strip_thinking(str(content)).strip()
        if len(content) < _TRIVIAL_CONTENT_LEN:
            return {
                "status": "error",
                "error_message": "AI Router fallback returned an article that was too short.",
            }

        document = await generate_docx(
            article_text=content,
            title=title,
            output_dir=_resolve_output_dir(),
            job_id=job_id,
        )
        if document.get("status") != "success":
            return {
                "status": "error",
                "error_message": document.get("error_message", "Fallback document generation failed."),
            }
        filepath = str(document.get("filepath", ""))
        if job_id:
            assert job_id in filepath, f"job_id {job_id} missing from {filepath}"
        return _result_dict(
            title,
            filepath,
            fallback_used=True,
            note="The full enrichment pipeline exceeded its time limit; a direct article was generated.",
            job_id=job_id,
        )
    except Exception as e:
        return {"status": "error", "error_message": f"Direct article fallback failed: {e}"}


async def run_single_pipeline(title: str, job_id: str | None = None) -> dict[str, Any]:
    """Run the full Trending Article SEO pipeline for a single article title.

    Use this tool when:
      - You have ONE specific article title/topic and need the complete
        article + social media versions + .docx generated for it.
      - The user wants a document produced for a single title.

    Do NOT use this tool when:
      - There are MULTIPLE titles to process (use run_article_batch instead).
      - There is no concrete topic/title yet (use research tools first).

    Args:
        title: The article title/topic to research and write about.
               Example: "The Best Gaming Laptops of 2026 on a Budget"

    Returns:
        dict:
        {
            "status": "success",
            "title": str,
            "filename": str,
            "filepath": str,
            "url": str
        }
        or {"status": "error", "error_message": str}
    """
    _load_env_once()

    if not title or len(title.strip()) < 5:
        return {
            "status": "error",
            "error_message": "Title is too short to generate an article.",
        }

    title = title.strip()

    try:
        result, content = await asyncio.wait_for(
            _execute_pipeline(
                title,
                f"Write a complete article based on this title: {title}. SUBJECT LOCK: the article must be about the exact subject named in the title ({title}). If research results concern a different product, brand, or company (e.g. a similarly-named competitor), IGNORE them - never substitute another subject.",
                job_id=job_id,
            ),
            timeout=_PIPELINE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        result, content = (
            {
                "status": "error",
                "error_message": f"Full pipeline timed out after {_PIPELINE_TIMEOUT_SECONDS} seconds.",
            },
            "",
        )

    if result.get("status") == "error":
        result = {**result, "title": title}
        if job_id:
            result["job_id"] = job_id
        fallback = await _generate_fallback_article(title, job_id=job_id)
        if fallback.get("status") == "success":
            return {**fallback, "fallback_after_pipeline_error": True}
        if fallback.get("error_message"):
            result["error_message"] = (
                f"{result.get('error_message', 'Pipeline failed')} "
                f"Fallback: {fallback['error_message']}"
            )
        return result

    if result.get("fallback_used") and len(content) < _TRIVIAL_CONTENT_LEN:
        fallback = await _generate_fallback_article(title, job_id=job_id)
        if fallback.get("status") == "success":
            return {**fallback, "fallback_after_short_content": True}

    return result


def _write_journal(payload: dict[str, Any]) -> None:
    try:
        path = os.path.join(_resolve_output_dir(), _BATCH_PROGRESS_FILENAME)
        with _batch_progress_lock:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
    except Exception:
        pass


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


async def run_article_batch(
    titles: list[str],
    concurrency: int = 2,
    max_rounds: int = 0,
) -> dict[str, Any]:
    """Generate a downloadable .docx for MULTIPLE article titles in parallel.

    Use this tool when:
      - The user has a list of curated titles and needs a document for EACH
        one, with a download link per title.
      - You need to produce 2+ documents in one batch.

    Do NOT use this tool when:
      - There is only one title (use run_single_pipeline).
      - No titles are known yet.

    Args:
        titles: List of article titles to process. All titles are processed,
                one pipeline run each, concurrently (bounded by concurrency).
        concurrency: Max number of pipelines running at the same time
                     (default 2; use 1 for strictly sequential).
        max_rounds: Ultra-completion retries. 0 (default) = single pass.
                    N > 0 = keep re-running any failed titles for up to N
                    extra rounds until every title has a document, or the
                    retry budget is spent. Use 3 when the user demands that
                    every title MUST get a link no matter what.

    Returns:
        dict:
        {
            "status": "success",
            "batch_id": str,
            "total": int,
            "completed": int,
            "failed": int,
            "rounds_used": int,
            "ok": [
                {
                    "title": str,
                    "job_id": str,
                    "filename": str,
                    "filepath": str,
                    "url": str,
                    ...
                },
                ...
            ],
            "failures": [
                {"title": str, "error": str},
                ...
            ],
            "results": [combined success + failure entries]
        }
        or {"status": "error", "error_message": str}
    """
    if not titles:
        return {"status": "error", "error_message": "No titles provided."}

    clean_titles = [t for t in (t.strip() for t in titles) if t]
    if not clean_titles:
        return {"status": "error", "error_message": "No valid titles provided."}

    _load_env_once()
    batch_id = uuid.uuid4().hex[:8]
    if len(clean_titles) == 1:
        concurrency = 1
    concurrency = max(1, int(concurrency))
    max_rounds = max(0, int(max_rounds))

    # Each title gets a job_id at dispatch; {job_id, title} travel together
    # and the job_id is embedded in the output filename, so a title can never
    # be associated with a sibling's file by position or timing.
    jobs: list[dict[str, Any]] = [
        {"job_id": f"{batch_id}_{i + 1}", "title": t, "index": i}
        for i, t in enumerate(clean_titles)
    ]
    results: dict[int, dict[str, Any]] = {}
    retries_used = 0

    def _journal_pass(status: str) -> None:
        completed = sum(1 for r in results.values() if r.get("status") == "success")
        payload: dict[str, Any] = {
            "batch_id": batch_id,
            "started_at": _now_iso(),
            "updated_at": _now_iso(),
            "status": status,
            "total": len(clean_titles),
            "completed": completed,
            "retries_used": retries_used,
            "pending": [j["title"] for j in jobs if j["index"] not in results],
            "results": [results[i] for i in sorted(results)],
        }
        _write_journal(payload)

    async def _run_pass(pass_jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        nonlocal retries_used
        semaphore = asyncio.Semaphore(concurrency)

        async def worker(job: dict[str, Any]) -> dict[str, Any]:
            async with semaphore:
                return await run_single_pipeline(job["title"], job_id=job["job_id"])

        tasks = [asyncio.create_task(worker(job)) for job in pass_jobs]
        # return_exceptions=True keeps the outcome list exactly as long as the
        # input list: a crashed title becomes an explicit failed entry instead
        # of shifting every subsequent index.
        outcomes = await asyncio.gather(*tasks, return_exceptions=True)
        for job, outcome in zip(pass_jobs, outcomes):
            if isinstance(outcome, BaseException):
                results[job["index"]] = {
                    "status": "error",
                    "title": job["title"],
                    "job_id": job["job_id"],
                    "error_message": f"Pipeline crashed: {outcome}",
                }
            else:
                results[job["index"]] = outcome
            _journal_pass("running")
        retries_used += 1
        return [job for job in pass_jobs if results[job["index"]].get("status") != "success"]

    pending = list(jobs)
    _journal_pass("starting")
    rounds_run = 1
    while pending:
        pending = await _run_pass(pending)
        if not pending or retries_used > max_rounds:
            break
        rounds_run += 1

    done = [r for r in results.values() if r.get("status") == "success"]
    failed = [r for r in results.values() if r.get("status") != "success"]

    for r in done:
        jid = r.get("job_id", "")
        assert jid and jid in r.get("filepath", ""), f"job_id {jid} not in {r.get('filepath')}"

    ok = [
        {
            "title": r.get("title", ""),
            "job_id": r.get("job_id", ""),
            "filename": r.get("filename", ""),
            "filepath": r.get("filepath", ""),
            "url": r.get("url", ""),
            "fallback_used": r.get("fallback_used", False),
        }
        for r in done
    ]
    failed_out = [
        {"title": r.get("title", ""), "error": r.get("error_message", "failed")}
        for r in failed
    ]
    _journal_pass("complete" if not failed_out else "partial")

    return {
        "status": "success",
        "batch_id": batch_id,
        "total": len(clean_titles),
        "completed": len(done),
        "failed": len(failed_out),
        "rounds_used": rounds_run,
        "ok": ok,
        "failures": failed_out,
        "results": done + failed,
    }
