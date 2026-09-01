"""A2UI FastAPI backend for the seo_v2 batch pipeline.

Serves the built A2UI Lit client, streams A2UI v0.9 JSONL messages over SSE
(/api/stream), accepts user actions (/api/action), and serves generated .docx
files (/files/{name}).

Run:  python -m uvicorn ui_server:app --host 127.0.0.1 --port 8001
"""

import asyncio
import json
import os
import socket
import sys
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from seo_v2.tools.batch_tools import curate_titles, run_article_batch


def _port_8001_in_use() -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", 8001)) == 0


def _guard_single_instance() -> None:
    """Refuse to boot a second instance racing on port 8001."""
    if _port_8001_in_use():
        print(
            "[FATAL] Port 8001 is already bound - another seo_v2 server is running. "
            "Kill the existing process or leave it running; refusing to start a second instance.",
            flush=True,
        )
        sys.exit(1)


if os.environ.get("SEO_SKIP_PORT_CHECK") != "1" and any(
    "uvicorn" in a.lower() for a in sys.argv
):
    _guard_single_instance()

APP_DIR = os.path.dirname(os.path.abspath(__file__))
# Container: SEO_DATA_DIR is a mounted volume for state; code stays read-only.
DATA_DIR = os.environ.get("SEO_DATA_DIR", "").strip() or APP_DIR
UI_DIST = os.path.join(APP_DIR, "ui", "dist")

CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
SURFACE_ID = "seo_dashboard"

app = FastAPI(title="seo_v2 A2UI dashboard")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_subscribers: set[asyncio.Queue] = set()
_job: dict[str, Any] = {
    "state": "idle",  # idle | curating | ready | running | complete | partial | error
    "titles": [],
    "field": "",
    "concurrency": 2,
    "max_rounds": 0,
    "batch_id": "",
    "results": [],
    "message": "Enter a field of interest or paste titles.",
}
_job_lock = asyncio.Lock()
_SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
_session_lock = asyncio.Lock()


def _load_sessions() -> list[dict[str, Any]]:
    try:
        if os.path.isfile(_SESSIONS_FILE):
            with open(_SESSIONS_FILE, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


async def _save_session(record: dict[str, Any]) -> None:
    async with _session_lock:
        try:
            sessions = _load_sessions()
            sessions.append(record)
            with open(_SESSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(sessions[-200:], f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def _msg(mtype: str, payload: dict[str, Any]) -> str:
    return json.dumps({"version": "v0.9", mtype: payload})


def _surface_envelope() -> str:
    return _msg("createSurface", {"surfaceId": SURFACE_ID, "catalogId": CATALOG_ID})


def _components_message() -> str:
    comps: list[dict[str, Any]] = [
        {
            "id": "root",
            "component": "Column",
            "children": [
                "header",
                "field_label",
                "field_input",
                "titles_label",
                "titles_input",
                "controls_row",
                "status_text",
                "divider",
                "results_card",
            ],
        },
        {"id": "header", "component": "Text", "text": "SEO Article Batch Generator", "variant": "h1"},
        {"id": "field_label", "component": "Text", "text": "Field of interest (e.g. 'astrology')", "variant": "caption"},
        {
            "id": "field_input",
            "component": "TextField",
            "label": "Field",
            "value": {"path": "/field"},
            "variant": "shortText",
        },
        {"id": "titles_label", "component": "Text", "text": "…or paste titles, one per line", "variant": "caption"},
        {
            "id": "titles_input",
            "component": "TextField",
            "label": "Titles (one per line)",
            "value": {"path": "/titlesRaw"},
            "variant": "longText",
        },
        {
            "id": "controls_row",
            "component": "Row",
            "children": ["curate_btn_label", "curate_btn", "run_btn_label", "run_btn"],
            "justify": "start",
        },
        {"id": "curate_btn_label", "component": "Text", "text": "Curate Titles"},
        {
            "id": "curate_btn",
            "component": "Button",
            "child": "curate_btn_label",
            "variant": "primary",
            "action": {
                "event": {
                    "name": "curate_titles",
                    "context": {"field": {"path": "/field"}},
                }
            },
        },
        {"id": "run_btn_label", "component": "Text", "text": "Run Batch"},
        {
            "id": "run_btn",
            "component": "Button",
            "child": "run_btn_label",
            "variant": "primary",
            "action": {
                "event": {
                    "name": "run_batch",
                    "context": {
                        "titlesRaw": {"path": "/titlesRaw"},
                        "field": {"path": "/field"},
                    },
                }
            },
        },
        {
            "id": "status_text",
            "component": "Text",
            "text": {"path": "/status"},
            "variant": "body",
        },
        {"id": "divider", "component": "Divider", "axis": "horizontal"},
        {
            "id": "results_card",
            "component": "Card",
            "child": "results_list",
        },
        {
            "id": "results_list",
            "component": "List",
            "children": {
                "path": "/results",
                "componentId": "result_item",
            },
        },
        {
            "id": "result_item",
            "component": "Column",
            "children": ["result_title", "result_status"],
        },
        {
            "id": "result_title",
            "component": "Text",
            "text": {"path": "title"},
            "variant": "body",
        },
        {
            "id": "result_status",
            "component": "Text",
            "text": {"path": "status"},
            "variant": "caption",
        },
    ]
    return _msg("updateComponents", {"surfaceId": SURFACE_ID, "components": comps})


def _initial_data_message() -> str:
    return _msg(
        "updateDataModel",
        {"surfaceId": SURFACE_ID, "path": "/status", "value": _job["message"]},
    )


def _results_data_message() -> str:
    return _msg(
        "updateDataModel",
        {"surfaceId": SURFACE_ID, "path": "/results", "value": _job["results"]},
    )


def _stream_messages() -> list[str]:
    return [
        _surface_envelope(),
        _components_message(),
        _initial_data_message(),
        _results_data_message(),
    ]


async def _broadcast(payload: str) -> None:
    for q in list(_subscribers):
        try:
            q.put_nowait(payload)
        except Exception:
            pass


async def _publish_state(extra: dict[str, Any] | None = None) -> None:
    state: dict[str, Any] = {
        "status": _job["message"],
        "results": _job["results"],
    }
    if extra:
        state.update(extra)
    messages: list[str] = []
    if "status" in state:
        messages.append(
            _msg(
                "updateDataModel",
                {"surfaceId": SURFACE_ID, "path": "/status", "value": state["status"]},
            )
        )
    if "results" in state:
        messages.append(
            _msg(
                "updateDataModel",
                {"surfaceId": SURFACE_ID, "path": "/results", "value": state["results"]},
            )
        )
    for m in messages:
        await _broadcast(m)


@app.get("/api/stream")
async def stream(request: Request):
    async def gen():
        q: asyncio.Queue = asyncio.Queue()
        _subscribers.add(q)
        try:
            for m in _stream_messages():
                yield f"data: {m}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    text = await asyncio.wait_for(q.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                yield f"data: {text}\n\n"
        finally:
            _subscribers.discard(q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _run_curate(field: str, claimed: bool = False) -> None:
    global _job
    async with _job_lock:
        if not claimed and _job["state"] in ("curating", "running"):
            return
        if not claimed:
            _job.update(
                state="curating",
                field=field,
                titles=[],
                results=[],
                batch_id="",
                message="Curating titles…",
            )
            await _publish_state()
    try:
        result = await curate_titles(field)
        async with _job_lock:
            if result.get("status") == "success":
                titles = result["titles"]
                _job.update(
                    state="ready",
                    titles=titles,
                    message=f"Curated {len(titles)} titles. Edit or run the batch.",
                )
                _job["results"] = [
                    {"title": t, "status": "pending"} for t in titles
                ]
            else:
                _job.update(state="error", message=result.get("error_message", "Curation failed"))
        await _publish_state()
    except Exception as e:
        async with _job_lock:
            _job.update(state="error", message=f"Curation failed: {e}")
        await _publish_state()


async def _run_batch(
    titles: list[str], concurrency: int, max_rounds: int, claimed: bool = False
) -> None:
    global _job
    async with _job_lock:
        if not claimed and _job["state"] in ("curating", "running"):
            return
        if not claimed:
            _job.update(
                state="running",
                field=field,
                titles=titles,
                concurrency=concurrency,
                max_rounds=max_rounds,
                results=[{"title": t, "status": "queued"} for t in titles],
                message=f"Running batch for {len(titles)} titles…",
            )
            await _publish_state()
    try:
        result = await run_article_batch(titles, concurrency=concurrency, max_rounds=max_rounds)
        async with _job_lock:
            if result.get("status") == "success":
                ok_entries = result.get("ok", [])
                failed_entries = result.get("failures", [])
                mapped = []
                for r in ok_entries:
                    mapped.append(
                        {
                            "title": r.get("title", ""),
                            "status": f"**[{r.get('filename', '')}]({r.get('url', '')})**",
                        }
                    )
                for r in failed_entries:
                    mapped.append(
                        {
                            "title": r.get("title", ""),
                            "status": f"❌ {r.get('error', 'failed')}",
                        }
                    )
                _job["results"] = mapped
                _job["batch_id"] = result.get("batch_id", "")
                failed = result.get("failed", 0)
                _job["message"] = (
                    f"Batch complete: {result.get('completed', 0)}/{result.get('total', 0)} "
                    f"documents, {failed} failed."
                )
                _job["state"] = "partial" if failed else "complete"
                await _save_session(
                    {
                        "id": result.get("batch_id", ""),
                        "type": "batch",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "titles": titles,
                        "total": result.get("total", len(titles)),
                        "completed": result.get("completed", 0),
                        "failed": result.get("failed", 0),
                        "rounds_used": result.get("rounds_used", 1),
                        "results": [
                            {
                                "title": r.get("title", ""),
                                "status": "success",
                                "filename": r.get("filename", ""),
                                "url": r.get("url", ""),
                                "error": "",
                            }
                            for r in ok_entries
                        ]
                        + [
                            {
                                "title": r.get("title", ""),
                                "status": "error",
                                "filename": "",
                                "url": "",
                                "error": r.get("error", ""),
                            }
                            for r in failed_entries
                        ],
                    }
                )
            else:
                _job.update(
                    state="error",
                    message=result.get("error_message", "Batch failed"),
                )
        await _publish_state()
    except Exception as e:
        async with _job_lock:
            _job.update(state="error", message=f"Batch failed: {e}")
        await _publish_state()


@app.post("/api/action")
async def action(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Invalid JSON"}, status_code=400)

    ua = body.get("userAction") or body
    name = ua.get("name", "")
    ctx = ua.get("context") or {}
    if name == "curate_titles":
        field = str(ctx.get("field", "")).strip()
        if not field:
            return JSONResponse({"ok": False, "error": "Field is required"}, status_code=400)
        async with _job_lock:
            if _job["state"] in ("curating", "running"):
                return JSONResponse(
                    {"ok": False, "error": "Another job is already running. Wait for it to finish."},
                    status_code=409,
                )
            _job.update(
                state="curating",
                field=field,
                titles=[],
                results=[],
                batch_id="",
                message="Curating titles…",
            )
            await _publish_state()
        asyncio.create_task(_run_curate(field, claimed=True))
        return {"ok": True, "message": "Curation started"}
    if name == "run_batch":
        raw = str(ctx.get("titlesRaw", "")).strip()
        field = str(ctx.get("field", "")).strip()
        titles = [t.strip() for t in raw.splitlines() if t.strip()]
        async with _job_lock:
            if _job["state"] in ("curating", "running"):
                return JSONResponse(
                    {"ok": False, "error": "Another job is already running. Wait for it to finish."},
                    status_code=409,
                )
            if not titles:
                titles = list(_job["titles"])
            concurrency = _job["concurrency"]
            max_rounds = _job["max_rounds"]
            if not titles:
                return JSONResponse({"ok": False, "error": "No titles provided"}, status_code=400)
            titles = titles[:10]
            _job.update(
                state="running",
                titles=titles,
                concurrency=concurrency,
                max_rounds=max_rounds,
                results=[{"title": t, "status": "queued"} for t in titles],
                message=f"Running batch for {len(titles)} titles…",
            )
            await _publish_state()
        asyncio.create_task(_run_batch(titles, concurrency, max_rounds, claimed=True))
        return {"ok": True, "message": f"Batch started for {len(titles)} titles"}

    return JSONResponse({"ok": False, "error": "Unknown action"}, status_code=400)


@app.get("/api/sessions")
async def sessions():
    return {"sessions": _load_sessions()[-50:]}


@app.get("/api/sessions/{session_id}")
async def session_detail(session_id: str):
    for s in _load_sessions():
        if s.get("id") == session_id:
            return s
    return JSONResponse({"error": "session not found"}, status_code=404)


@app.get("/api/state")
async def state():
    async with _job_lock:
        return {
            "state": _job["state"],
            "field": _job["field"],
            "titles": _job["titles"],
            "message": _job["message"],
            "results": _job["results"],
        }


@app.get("/api/state_a2ui")
async def state_a2ui():
    async with _job_lock:
        return {
            "messages": [json.loads(m) for m in _stream_messages()],
        }


@app.get("/files/{name}")
async def file_download(name: str):
    safe = os.path.basename(name)
    path = os.path.join(DATA_DIR, safe)
    if not os.path.isfile(path):
        return JSONResponse({"error": "not found"}, status_code=404)
    return FileResponse(path, filename=safe)


if os.path.isdir(UI_DIST):
    app.mount("/", StaticFiles(directory=UI_DIST, html=True), name="ui")


@app.on_event("startup")
async def _startup():
    asyncio.create_task(_publish_state())
