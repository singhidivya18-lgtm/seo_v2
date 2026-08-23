"""URL content extraction tool using readability-lxml and BeautifulSoup."""

from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from readability import Document

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}
BLOCKED_PREFIXES = ("10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.")
MAX_RESPONSE_SIZE = 1_000_000  # 1MB


def _is_safe_url(url: str) -> bool:
    """Check if URL is safe to fetch (HTTPS only, no private IPs)."""
    if not url.startswith("https://"):
        return False
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    if hostname in BLOCKED_HOSTS:
        return False
    for prefix in BLOCKED_PREFIXES:
        if hostname.startswith(prefix):
            return False
    return True


async def extract_url_content(url: str, max_chars: int = 5000) -> dict[str, Any]:
    """
    Fetch a URL and extract its main text content (article body).

    Use this tool when:
      - You have a search result URL and need the actual content.
      - You need to read a source to extract facts and quotes.

    Do NOT use this tool when:
      - The URL is just for citation (no need to read the full content).
      - The URL is a PDF, video, or non-text content.

    Args:
        url: Full HTTPS URL. Example: "https://www.nature.com/articles/xxx"
        max_chars: Max characters to return. Default 5000.

    Returns:
        dict:
        {
          "status": "success",
          "url": str,
          "title": str,
          "content": str,
          "domain": str,
          "publish_date": str | None,
          "word_count": int
        }
        or {"status": "error", "error_message": str}
    """
    if not url or not url.strip():
        return {"status": "error", "error_message": "URL cannot be empty."}

    max_chars = int(max_chars) if not isinstance(max_chars, int) else max_chars
    url = url.strip()

    if not _is_safe_url(url):
        return {"status": "error", "error_message": f"URL rejected: must be HTTPS and not a private IP. Got: {url}"}

    try:
        parsed = urlparse(url)
        domain = parsed.hostname or url

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        response.raise_for_status()

        content_length = int(response.headers.get("content-length", 0))
        if content_length > MAX_RESPONSE_SIZE:
            return {"status": "error", "error_message": f"Response too large ({content_length} bytes). Limit: {MAX_RESPONSE_SIZE}."}

        html = response.text[:MAX_RESPONSE_SIZE]

        soup = BeautifulSoup(html, "html.parser")

        title = ""
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)

        publish_date = None
        for meta_name in ["date", "pubdate", "publish_date", "article:published_time"]:
            meta = soup.find("meta", attrs={"name": meta_name}) or soup.find("meta", attrs={"property": meta_name})
            if meta and meta.get("content"):
                publish_date = meta["content"]
                break

        try:
            doc = Document(html)
            content_html = doc.summary()
            content_soup = BeautifulSoup(content_html, "html.parser")
            content_text = content_soup.get_text(separator="\n", strip=True)
        except Exception:
            body = soup.find("body")
            if body:
                content_text = body.get_text(separator="\n", strip=True)
            else:
                content_text = soup.get_text(separator="\n", strip=True)

        content_text = content_text[:max_chars]
        word_count = len(content_text.split())

        return {
            "status": "success",
            "url": url,
            "title": title,
            "content": content_text,
            "domain": domain,
            "publish_date": publish_date,
            "word_count": word_count,
        }

    except requests.exceptions.Timeout:
        return {"status": "error", "error_message": f"Request timed out for URL: {url}"}
    except requests.exceptions.HTTPError as e:
        return {"status": "error", "error_message": f"HTTP error {e.response.status_code} for URL: {url}"}
    except Exception as e:
        return {"status": "error", "error_message": f"Extraction failed for {url}: {str(e)}"}
