"""Google Trends data retrieval tool using pytrends."""

import time
from typing import Any


async def get_google_trends(topic: str, geo: str = "US") -> dict[str, Any]:
    """
    Get trending searches and related keywords for a given topic from Google Trends.

    Use this tool when:
      - The user provides a topic and you need to discover what's currently trending
        around that topic.
      - You need related/breaking keywords to guide further research.

    Do NOT use this tool when:
      - The user wants a specific question answered (use web_search instead).
      - The topic is too vague (e.g., "stuff") — ask user to clarify first.

    Args:
        topic: The main subject/keyword to explore on Google Trends.
              Example: "artificial intelligence", "electric vehicles", "fitness"
        geo: Geographic region for trends. Default "US".
             Use ISO 2-letter codes: "US", "IN", "GB", "GLOBAL", etc.

    Returns:
        dict with status and data:
        {
          "status": "success",
          "trending_searches": [list of currently trending queries],
          "related_queries_top": [list of top related keywords],
          "related_queries_rising": [list of rising/breakout keywords],
          "topic": str,
          "geo": str
        }
        or {"status": "error", "error_message": str} on failure.
    """
    if not topic or len(topic.strip()) < 2:
        return {"status": "error", "error_message": "Topic must be at least 2 characters long."}

    topic = topic.strip()

    try:
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl="en-US", tz=360)

        pytrends.build_payload(
            [topic],
            cat=0,
            timeframe="today 1-m",
            geo=geo if geo != "GLOBAL" else "",
            gprop="",
        )

        related = pytrends.related_queries()
        topic_data = related.get(topic, {})

        top_queries = topic_data.get("top", None)
        rising_queries = topic_data.get("rising", None)

        top_list = []
        if top_queries is not None and not top_queries.empty:
            top_list = top_queries["query"].tolist()[:10]

        rising_list = []
        if rising_queries is not None and not rising_queries.empty:
            rising_list = rising_queries["query"].tolist()[:10]

        time.sleep(2)

        trending_list = []
        try:
            trending = pytrends.trending_searches(pn="united_states")
            if trending is not None and not trending.empty:
                trending_list = trending[0].tolist()[:10]
        except Exception:
            pass

        return {
            "status": "success",
            "trending_searches": trending_list,
            "related_queries_top": top_list,
            "related_queries_rising": rising_list,
            "topic": topic,
            "geo": geo,
        }

    except Exception as e:
        return {"status": "error", "error_message": f"Google Trends retrieval failed: {str(e)}"}
