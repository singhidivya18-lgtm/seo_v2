"""Web search tool with Google Search grounding or fallback providers."""

import os
import re
from typing import Any
from urllib.parse import urlparse

import requests


BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}
BLOCKED_PREFIXES = ("10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.")


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


async def web_search_with_grounding(query: str, num_results: int = 5) -> dict[str, Any]:
    """
    Search the web using Google and return results with source URLs and snippets.

    Use this tool when:
      - You need to find authoritative sources on a topic.
      - You need URLs to cite in an article.
      - You need current information not in your training data.

    Do NOT use this tool when:
      - You already have a URL and want its content (use extract_url_content).
      - The query is conversational or not research-oriented.

    Args:
        query: The search query. Be specific. Example: "Tesla FSD safety statistics 2026"
        num_results: How many results to return (1-10). Default 5.

    Returns:
        dict:
        {
          "status": "success",
          "results": [
            {"title": str, "url": str, "snippet": str, "source": str},
            ...
          ],
          "query": str
        }
        or {"status": "error", "error_message": str}
    """
    if not query or len(query.strip()) < 2:
        return {"status": "error", "error_message": "Query must be at least 2 characters long."}

    num_results = int(num_results) if not isinstance(num_results, int) else num_results
    num_results = max(1, min(10, num_results))
    query = query.strip()

    tavily_key = os.environ.get("TAVILY_API_KEY")
    google_key = os.environ.get("GOOGLE_API_KEY")
    cse_id = os.environ.get("GOOGLE_CSE_ID")

    if google_key and cse_id:
        try:
            return await _search_google_cse(query, num_results, google_key, cse_id)
        except Exception:
            pass

    if tavily_key:
        try:
            return await _search_tavily(query, num_results, tavily_key)
        except Exception:
            pass

    return {
        "status": "success",
        "results": [],
        "query": query,
        "note": "No search API configured. Set TAVILY_API_KEY or GOOGLE_API_KEY+GOOGLE_CSE_ID in .env",
    }


async def _search_google_cse(
    query: str, num_results: int, api_key: str, cse_id: str
) -> dict[str, Any]:
    """Search using Google Custom Search API."""
    url = "https://www.googleapis.com/customsearch/v1"
    params = {"key": api_key, "cx": cse_id, "q": query, "num": num_results}

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("items", [])[:num_results]:
        link = item.get("link", "")
        if not _is_safe_url(link):
            continue
        parsed = urlparse(link)
        results.append({
            "title": item.get("title", ""),
            "url": link,
            "snippet": item.get("snippet", ""),
            "source": parsed.hostname or link,
        })

    return {"status": "success", "results": results, "query": query}


async def _search_tavily(query: str, num_results: int, api_key: str) -> dict[str, Any]:
    """Search using Tavily API."""
    url = "https://api.tavily.com/search"
    payload = {"api_key": api_key, "query": query, "max_results": num_results, "search_depth": "basic"}

    response = requests.post(url, json=payload, timeout=15)
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("results", [])[:num_results]:
        link = item.get("url", "")
        if not _is_safe_url(link):
            continue
        parsed = urlparse(link)
        results.append({
            "title": item.get("title", ""),
            "url": link,
            "snippet": item.get("content", "")[:300],
            "source": parsed.hostname or link,
        })

    return {"status": "success", "results": results, "query": query}
