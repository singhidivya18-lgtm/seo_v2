"""Social media formatting tools for LinkedIn and Twitter."""

import re
from typing import Any
from datetime import date

from litellm import acompletion

_TODAY = date.today().strftime('%B %d, %Y')


async def format_linkedin_post(article: str, author_role: str = "Industry Expert", include_image: bool = True) -> dict[str, Any]:
    """
    Convert a long-form article into a LinkedIn post (1300-3000 characters).

    Use this tool when:
      - You have a finalized article and need a LinkedIn version.
      - User wants the article published on LinkedIn.

    Do NOT use this tool when:
      - The article is not finalized (still being edited).
      - The user only wants a Twitter version.

    Args:
        article: The full article text.
        author_role: The author's professional role to use in tone/hook.
                     Example: "AI Researcher", "Marketing Director"
        include_image: If True, suggests a relevant image description
                       for the LinkedIn post.

    Returns:
        dict:
        {
          "status": "success",
          "platform": "linkedin",
          "post": str,
          "char_count": int,
          "hashtags": [str],
          "image_suggestion": str | None
        }
        or {"status": "error", "error_message": str}
    """
    if not article or len(article.strip()) < 100:
        return {"status": "error", "error_message": "Article too short for LinkedIn adaptation."}

    try:
        image_prompt = ""
        if include_image:
            image_prompt = """
10. Include a suggestion for a relevant image at the top of the post.
    Describe the image in one sentence (e.g., "Image: A clean minimalist graphic showing...").
    The image should be relevant to the article's primary keyword or hook.

Return the LinkedIn post with the image suggestion as a separate field called "image_suggestion" above the post text."""

        prompt = f"""You are a LinkedIn content strategist. Today's date: {_TODAY}.
Convert the following article into a high-engagement LinkedIn post.

AUTHOR ROLE: {author_role}

ARTICLE:
{article[:4000]}

RULES:
1. Start with a STRONG hook (line 1) that stops the scroll â€” no clickbait
2. Use short paragraphs separated by blank lines
3. Keep total length between 1300-3000 characters
4. Include 3-5 relevant hashtags at the end
5. End with a question to drive comments
6. Use professional but conversational tone
7. Summarize key insights, do NOT copy the full article
8. Do NOT use ALL CAPS in the hook{image_prompt}

Return the LinkedIn post formatted as:
IMAGE SUGGESTION: <one sentence image description>
POST: <the LinkedIn post text>"""

        response = await acompletion(
            model="openai/deepseek-v4-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        raw = response.choices[0].message.content.strip()

        image_suggestion = None
        post = raw
        if "IMAGE SUGGESTION:" in raw:
            parts = raw.split("IMAGE SUGGESTION:", 1)
            if len(parts) > 1:
                post_section = parts[1].split("POST:", 1)
                if len(post_section) > 1:
                    image_suggestion = post_section[0].strip()
                    post = "POST:" + post_section[1] if len(post_section) > 1 else post_section[0].strip()
                    post = post.replace("POST:", "").strip()
                else:
                    image_suggestion = post_section[0].strip()
                    post = ""

        post = post.strip()
        char_count = len(post)

        hashtags = re.findall(r"#\w+", post)

        linkedin_result = {
            "status": "success",
            "platform": "linkedin",
            "post": post,
            "char_count": char_count,
            "hashtags": hashtags,
            "image_suggestion": image_suggestion,
        }

        return linkedin_result

    except Exception as e:
        return {"status": "error", "error_message": f"LinkedIn formatting failed: {str(e)}"}


async def format_twitter_thread(article: str, max_tweets: int = 8) -> dict[str, Any]:
    """
    Convert a long-form article into a Twitter/X thread (multiple tweets).

    Use this tool when:
      - You have a finalized article and need a Twitter thread version.
      - User wants the article as a tweetstorm.

    Do NOT use this tool when:
      - The article is not finalized.
      - The user only wants LinkedIn.

    Args:
        article: The full article text.
        max_tweets: Max number of tweets in thread (5-10). Default 8.

    Returns:
        dict:
        {
          "status": "success",
          "platform": "twitter",
          "thread": [str],
          "char_counts": [int],
          "total_tweets": int
        }
        or {"status": "error", "error_message": str}
    """
    if not article or len(article.strip()) < 100:
        return {"status": "error", "error_message": "Article too short for Twitter adaptation."}

    max_tweets = int(max_tweets) if max_tweets else 8
    max_tweets = max(3, min(10, max_tweets))

    try:
        prompt = f"""Convert the following article into a Twitter/X thread.

ARTICLE:
{article[:4000]}

RULES:
1. Create {max_tweets} tweets maximum
2. Each tweet MUST be <= 280 characters
3. Number each tweet: 1/, 2/, 3/, etc.
4. First tweet = strongest hook with the most compelling insight
5. Middle tweets = key facts, statistics, insights
6. Last tweet = CTA with question + placeholder link
7. Each tweet must be self-contained and readable
8. Do NOT invent new facts â€” only summarize the article
9. Use concise, punchy language

Return ONLY the numbered tweets, one per line, no other text."""

        response = await acompletion(
            model="openai/deepseek-v4-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        raw_text = response.choices[0].message.content.strip()

        tweets = []
        for line in raw_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            match = re.match(r"^(\d+/)\s*(.*)", line)
            if match:
                tweet_text = match.group(2).strip()
                if len(tweet_text) > 280:
                    tweet_text = tweet_text[:277] + "..."
                tweets.append(tweet_text)

        if not tweets:
            for line in raw_text.split("\n"):
                line = line.strip()
                if line and len(line) > 10:
                    if len(line) > 280:
                        line = line[:277] + "..."
                    tweets.append(line)

        tweets = tweets[:max_tweets]

        char_counts = [len(t) for t in tweets]

        return {
            "status": "success",
            "platform": "twitter",
            "thread": tweets,
            "char_counts": char_counts,
            "total_tweets": len(tweets),
        }

    except Exception as e:
        return {"status": "error", "error_message": f"Twitter formatting failed: {str(e)}"}
