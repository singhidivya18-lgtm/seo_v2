"""Shared AI Router Switzerland model configuration."""

import os
from typing import Any

from google.adk.models.lite_llm import LiteLlm


def ai_router_completion_kwargs() -> dict[str, Any]:
    """Return shared LiteLLM settings for AI Router Switzerland."""
    api_key = (
        os.environ.get("AIROUTER_API_KEY", "").strip()
        or os.environ.get("OPENROUTER_API_KEY", "").strip()
    )
    base_url = (
        os.environ.get("AIROUTER_BASE_URL", "").strip()
        or "https://api.airouter.ch/v1"
    ).rstrip("/")
    model = os.environ.get("AIROUTER_MODEL", "").strip() or "Qwen3.8"
    reasoning_effort = os.environ.get("AIROUTER_REASONING_EFFORT", "").strip()
    if not reasoning_effort and model.lower() == "qwen3.8":
        reasoning_effort = "none"

    settings: dict[str, Any] = {
        "model": f"openai/{model}",
        "api_base": base_url,
        "api_key": api_key,
    }
    if reasoning_effort:
        settings["reasoning_effort"] = reasoning_effort
        settings["allowed_openai_params"] = ["reasoning_effort"]
    return settings


def ai_router_model() -> LiteLlm:
    """Build an OpenAI-compatible client pointed at AI Router Switzerland."""
    settings = ai_router_completion_kwargs()
    return LiteLlm(
        **settings,
    )
