"""Fact-checking tool that verifies claims against source URLs."""

from typing import Any
from datetime import date

from litellm import acompletion

from ..ai_router import ai_router_completion_kwargs
from .extraction_tools import extract_url_content

_TODAY = date.today().strftime('%B %d, %Y')


async def verify_claim(claim: str, sources: list[str]) -> dict[str, Any]:
    """
    Verify a factual claim by cross-referencing it against provided source URLs.

    This tool fetches each source, looks for supporting or contradicting evidence
    for the claim, and returns a verdict with confidence score.

    Use this tool when:
      - You have extracted a specific claim from a source.
      - You need to determine if a claim is supported, contradicted, or unverifiable.
      - You need a confidence score for fact-checking in an article.

    Do NOT use this tool when:
      - The "claim" is an opinion or speculation (not factual).
      - You have no sources to verify against.

    Args:
        claim: A specific factual statement to verify.
               Example: "Tesla delivered 1.8M vehicles in 2025"
        sources: List of source URLs to check. Max 3 URLs.

    Returns:
        dict:
        {
          "status": "success",
          "claim": str,
          "verdict": "supported" | "contradicted" | "unverifiable" | "partial",
          "confidence": float,
          "evidence": [
            {"url": str, "supports": bool, "excerpt": str}
          ],
          "summary": str
        }
        or {"status": "error", "error_message": str}
    """
    if not claim or not claim.strip():
        return {"status": "error", "error_message": "Claim cannot be empty."}

    if not sources:
        return {"status": "error", "error_message": "At least one source URL is required."}

    sources = sources[:3]
    claim = claim.strip()

    evidence_list = []
    verdicts = []

    for source_url in sources:
        try:
            extraction = await extract_url_content(source_url)
            if extraction.get("status") != "success":
                evidence_list.append({
                    "url": source_url,
                    "supports": False,
                    "excerpt": f"Could not extract content: {extraction.get('error_message', 'unknown error')}",
                })
                continue

            content = extraction["content"]
            content_chunk = content[:3000]

            prompt = f"""You are a fact-checker. Today's date: {_TODAY}.
Analyze the following claim against the source content.

CLAIM: "{claim}"

SOURCE CONTENT:
{content_chunk}

Determine if the claim is:
- "supported": The source clearly supports the claim with evidence
- "contradicted": The source contradicts the claim
- "partial": The source partially supports but with caveats
- "unverifiable": The source does not contain enough information

Respond with ONLY a JSON object (no other text):
{{"verdict": "supported|contradicted|partial|unverifiable", "supports_claim": true|false, "excerpt": "relevant quote from source (max 100 chars)"}}"""

            response = await acompletion(
                **ai_router_completion_kwargs(),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )

            response_text = response.choices[0].message.content.strip()

            import json
            import re

            json_match = re.search(r"\{[^{}]*\}", response_text)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {"verdict": "unverifiable", "supports_claim": False, "excerpt": "Could not parse LLM response"}

            verdicts.append(result.get("verdict", "unverifiable"))
            evidence_list.append({
                "url": source_url,
                "supports": result.get("supports_claim", False),
                "excerpt": result.get("excerpt", "")[:200],
            })

        except Exception as e:
            evidence_list.append({
                "url": source_url,
                "supports": False,
                "excerpt": f"Verification error: {str(e)}",
            })
            verdicts.append("unverifiable")

    if not verdicts:
        return {
            "status": "success",
            "claim": claim,
            "verdict": "unverifiable",
            "confidence": 0.0,
            "evidence": evidence_list,
            "summary": "No sources could be verified against.",
        }

    supported_count = verdicts.count("supported")
    contradicted_count = verdicts.count("contradicted")
    partial_count = verdicts.count("partial")
    total = len(verdicts)

    if supported_count == total:
        final_verdict = "supported"
        confidence = 0.8 + (0.2 * (supported_count / total))
    elif contradicted_count == total:
        final_verdict = "contradicted"
        confidence = 0.8 + (0.2 * (contradicted_count / total))
    elif supported_count > 0 and contradicted_count > 0:
        final_verdict = "partial"
        confidence = 0.4
    elif partial_count > 0:
        final_verdict = "partial"
        confidence = 0.5
    else:
        final_verdict = "unverifiable"
        confidence = 0.0

    summary_parts = []
    if supported_count > 0:
        summary_parts.append(f"{supported_count} source(s) support")
    if contradicted_count > 0:
        summary_parts.append(f"{contradicted_count} source(s) contradict")
    if partial_count > 0:
        summary_parts.append(f"{partial_count} source(s) partially support")
    unverifiable_count = total - supported_count - contradicted_count - partial_count
    if unverifiable_count > 0:
        summary_parts.append(f"{unverifiable_count} source(s) unverifiable")

    summary = f"Claim '{claim[:50]}...' â€” {', '.join(summary_parts)}."

    return {
        "status": "success",
        "claim": claim,
        "verdict": final_verdict,
        "confidence": round(confidence, 2),
        "evidence": evidence_list,
        "summary": summary,
    }
