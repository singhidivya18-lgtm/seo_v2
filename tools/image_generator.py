"""Real image search tool for LinkedIn posts.

Searches Pexels (real stock photos, requires free API key) first, then
falls back to Openverse (free, no API key) if Pexels is unavailable or
returns no match.
"""

import os
import re
import uuid
from typing import Any
from urllib.parse import quote

import aiohttp


def _query_ladder(description: str, article_title: str) -> list[str]:
    """Build progressively simpler search queries.

    Article-title terms are searched first since the title is the most
    reliable signal of the topic; the freeform description is used only
    as a fallback.
    """
    stopwords = {
        "with", "that", "this", "about", "your", "image", "show", "shows",
        "graphic", "design", "clean", "modern", "professional", "style",
        "suitable", "post", "photo", "picture", "the", "and", "for", "of",
        "in", "on", "to", "a", "an", "is", "are", "how", "why", "what",
        "infographic", "diagram", "tiny", "coin", "showing", "minimalist",
        "editorial", "emotional", "cozy", "simple", "illustration",
    }

    def significant(text: str) -> list[str]:
        tokens = re.findall(r"[A-Za-z]{2,}", text)
        out = []
        for t in tokens:
            if t.lower() in stopwords:
                continue
            if len(t) >= 4 or t.isupper():
                out.append(t.lower())
        return out

    queries = []
    desc_terms = significant(description)
    title_terms = significant(article_title)

    ai_context = {"deepseek", "gemini", "gpt", "openai", "anthropic", "claude",
                  "llama", "mistral", "qwen", "ai", "llm", "neural", "model"}
    if any(t in ai_context for t in title_terms + desc_terms):
        named = next((t for t in title_terms + desc_terms if t in ai_context and t != "model"), "")
        queries.append(f"{named} artificial intelligence" if named else "artificial intelligence")
        queries.append("artificial intelligence technology")
        queries.append("computer chip technology")
        return queries

    if title_terms:
        queries.append(" ".join(title_terms[:5]))
    if desc_terms:
        queries.append(" ".join(desc_terms[:5]))
    combined = " ".join((title_terms + desc_terms)[:5])
    if combined not in queries:
        queries.append(combined)
    queries.append(f"{description} {article_title}".strip())
    queries.append(description)
    if desc_terms:
        queries.append(" ".join(desc_terms[:2]))
    if desc_terms:
        queries.append(max(desc_terms, key=len))
    return queries


async def _search_pexels(session, query: str, api_key: str) -> list[dict]:
    """Search Pexels API. Returns photo dicts with src URLs."""
    url = (
        "https://api.pexels.com/v1/search/"
        f"?query={quote(query)}&per_page=5&orientation=landscape"
    )
    async with session.get(
        url,
        headers={
            "Authorization": api_key,
            "User-Agent": "TrendingArticleAgent/1.0 (python-aiohttp)",
        },
        timeout=aiohttp.ClientTimeout(total=30),
    ) as resp:
        if resp.status != 200:
            return []
        payload = await resp.json()
        return payload.get("photos") or []


async def _download_pexels_first(session, photos: list[dict]) -> tuple[bytes | None, str | None]:
    for photo in photos:
        src = photo.get("src") or {}
        candidate = src.get("large2x") or src.get("large") or src.get("original")
        if not candidate:
            continue
        try:
            async with session.get(
                candidate,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as img_resp:
                if img_resp.status == 200:
                    data = await img_resp.read()
                    if data and len(data) >= 1000:
                        return data, candidate
        except Exception:
            continue
    return None, None


async def _search_openverse(session, query: str, commercial: bool) -> list[dict]:
    license_part = "&license_type=commercial" if commercial else ""
    url = (
        "https://api.openverse.org/v1/images/"
        f"?q={quote(query)}{license_part}&page_size=5&mature=false"
    )
    async with session.get(
        url,
        headers={"User-Agent": "TrendingArticleAgent/1.0"},
        timeout=aiohttp.ClientTimeout(total=30),
    ) as resp:
        if resp.status != 200:
            return []
        payload = await resp.json()
        return payload.get("results") or []


async def _download_first(session, results: list[dict]) -> tuple[bytes | None, str | None]:
    for item in results:
        candidate = item.get("url") or item.get("thumbnail")
        if not candidate:
            continue
        try:
            async with session.get(
                candidate,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as img_resp:
                if img_resp.status == 200:
                    data = await img_resp.read()
                    if data and len(data) >= 1000:
                        return data, candidate
        except Exception:
            continue
    return None, None


async def generate_image(description: str, article_title: str = "Article") -> dict[str, Any]:
    """Find and download a real image matching the description.

    Use this tool when:
      - The user wants a real photo for a LinkedIn post or article.
      - A visual suggestion needs to be turned into an actual image file.

    Do NOT use this tool when:
      - No description of the desired image is available.
      - Image generation is not needed for the task.

    Args:
        description: A description of the image to find (e.g. "magnesium supplement bottle").
        article_title: The title of the article, used as extra search context.

    Returns:
        dict:
        {
            "status": "success",
            "image_path": str,
            "filename": str,
            "description": str,
            "image_url": str
        }
        or {"status": "error", "error_message": str}
    """
    if not description or len(description.strip()) < 5:
        return {"status": "error", "error_message": "Image description too short."}

    try:
        image_data = None
        image_url = None
        pexels_key = os.environ.get("PEXELS_API_KEY", "").strip()

        async with aiohttp.ClientSession() as session:
            if pexels_key:
                for query in _query_ladder(description, article_title):
                    try:
                        photos = await _search_pexels(session, query, pexels_key)
                        image_data, image_url = await _download_pexels_first(session, photos)
                    except Exception:
                        continue
                    if image_data:
                        break

            if not image_data:
                for query in _query_ladder(description, article_title):
                    try:
                        results = await _search_openverse(session, query, commercial=True)
                        if not results:
                            results = await _search_openverse(session, query, commercial=False)
                        image_data, image_url = await _download_first(session, results)
                    except Exception:
                        continue
                    if image_data:
                        break

            if not image_data:
                commons_url = (
                    "https://commons.wikimedia.org/w/api.php"
                    "?action=query&generator=search&gsrsearch="
                    f"{quote(_query_ladder(description, article_title)[1])}"
                    "&gsrnamespace=6&gsrlimit=5&prop=imageinfo"
                    "&iiprop=url&iiurlwidth=1024&format=json"
                )
                try:
                    async with session.get(
                        commons_url,
                        headers={"User-Agent": "TrendingArticleAgent/1.0"},
                        timeout=aiohttp.ClientTimeout(total=30),
                    ) as resp:
                        if resp.status == 200:
                            payload = await resp.json()
                            pages = (payload.get("query") or {}).get("pages") or {}
                            for page in pages.values():
                                infos = page.get("imageinfo") or []
                                for info in infos:
                                    candidate = info.get("thumburl") or info.get("url")
                                    if not candidate:
                                        continue
                                    try:
                                        async with session.get(
                                            candidate,
                                            timeout=aiohttp.ClientTimeout(total=30),
                                        ) as img_resp:
                                            if img_resp.status == 200:
                                                data = await img_resp.read()
                                                if data and len(data) >= 1000:
                                                    image_data = data
                                                    image_url = candidate
                                                    break
                                    except Exception:
                                        continue
                                if image_data:
                                    break
                except Exception:
                    pass

        if not image_data:
            raise Exception(f"No real image found for: {description}")

        output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "generated_images",
        )
        os.makedirs(output_dir, exist_ok=True)

        safe_name = "".join(c if c.isalnum() or c in (" ", "-", "_") else "" for c in description)[:40]
        ext = "jpg"
        if image_url:
            path_part = image_url.split("?")[0].lower()
            if path_part.endswith(".png"):
                ext = "png"
            elif path_part.endswith(".gif"):
                ext = "gif"
        filename = f"{safe_name}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, "wb") as f:
            f.write(image_data)

        return {
            "status": "success",
            "image_path": filepath,
            "filename": filename,
            "description": description,
            "image_url": image_url or "",
        }

    except Exception as e:
        return {"status": "error", "error_message": f"Image fetch failed: {str(e)}"}
