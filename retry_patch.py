"""
Monkey-patches ADK's LiteLLMClient and litellm.acompletion to retry on
corrupted / malformed responses from OpenRouter.

OpenRouter intermittently returns all-whitespace or empty content bodies that
previously crashed with JSONDecodeError or, worse, were silently accepted and
then produced garbage articles.

Retry policy (hardened):
- MAX_RETRIES = 4 attempts total.
- Retryable failures:
    * exceptions signalling corrupted JSON ("Unable to get json response",
      "Expecting value", ...) - raised while decoding,
    * responses that FAIL shape validation: no `choices`, no message content
      below the sane minimum, or no tool_calls (see _is_valid_response).
- Exponential backoff with jitter: delay(attempt) = min(BASE * 2**attempt, CAP) + uniform(0, 1).
- After the last attempt the original error is raised (no silent success).
- Every retry is logged with attempt number and scheduled delay.
"""

import asyncio
import logging
import random

logger = logging.getLogger(__name__)

MAX_RETRIES = 4
BASE_DELAY_SECONDS = 2.0
MAX_DELAY_SECONDS = 30.0
MIN_CONTENT_LENGTH = 8  # sane floor after strip(); tool-call turns are exempt

# Error substrings litellm raises when OpenRouter returns undecodable JSON.
_CORRUPTED_MARKERS = ("Unable to get json response", "Expecting value")


class InvalidResponseError(RuntimeError):
    """Raised internally when a response fails shape validation."""


def _is_corrupted_error(e) -> bool:
    error_str = str(e)
    return any(marker in error_str for marker in _CORRUPTED_MARKERS)


def _is_retryable(e) -> bool:
    return isinstance(e, InvalidResponseError) or _is_corrupted_error(e)


def _backoff_delay(attempt: int) -> float:
    """Exponential backoff with jitter: 2, 4, 8, 16s (capped) + uniform jitter."""
    return min(BASE_DELAY_SECONDS * (2 ** attempt), MAX_DELAY_SECONDS) + random.uniform(0.0, 1.0)


# ---------------------------------------------------------------------------
# Shape validation (duck-typed so it tolerates both litellm ModelResponse and
# CustomStreamWrapper chunks).
# ---------------------------------------------------------------------------


def _extract_content(choice) -> str | None:
    """content from choice.message (non-stream) or choice.delta (stream chunks)."""
    msg = getattr(choice, "message", None) or getattr(choice, "delta", None)
    if msg is None:
        return None
    content = getattr(msg, "content", None)
    if isinstance(content, list):  # multimodal providers may return parts
        content = "".join(str(p) for p in content)
    return content


def _has_tool_calls(choice) -> bool:
    msg = getattr(choice, "message", None) or getattr(choice, "delta", None)
    if msg is None:
        return False
    return bool(getattr(msg, "tool_calls", None))


def _choice_is_valid(choice) -> bool:
    content = _extract_content(choice)
    if isinstance(content, str) and len(content.strip()) >= MIN_CONTENT_LENGTH:
        return True
    return _has_tool_calls(choice)


def _is_valid_response(resp) -> bool:
    """A valid response has a non-empty choices list whose first choice has
    either substantial text content or tool_calls (empty content is a legal
    tool-use turn)."""
    if resp is None:
        return False
    choices = getattr(resp, "choices", None)
    if not choices:
        return False
    return _choice_is_valid(choices[0])


def _is_valid_stream(parts: list[str], saw_tool_calls: bool) -> bool:
    text = "".join(parts).strip()
    return len(text) >= MIN_CONTENT_LENGTH or saw_tool_calls


# ---------------------------------------------------------------------------
# Retry cores (shared by the ADK and litellm patches)
# ---------------------------------------------------------------------------


async def _call_with_retries(factory):
    """factory() -> response. Retries retryable failures; raises on exhaustion."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = await factory()
            if _is_valid_response(resp):
                return resp
            raise InvalidResponseError(
                f"Invalid response shape: choices={bool(getattr(resp, 'choices', None))!r}, "
                f"content under {MIN_CONTENT_LENGTH} chars and no tool_calls"
            )
        except Exception as e:
            if attempt == MAX_RETRIES - 1 or not _is_retryable(e):
                raise
            delay = _backoff_delay(attempt)
            logger.warning(
                f"OpenRouter corrupted/invalid response (attempt {attempt + 1}/{MAX_RETRIES}). "
                f"Retrying in {delay:.1f}s... ({e})"
            )
            await asyncio.sleep(delay)
    raise AssertionError("unreachable")  # pragma: no cover


async def _retry_generator(original_func, *args, **kwargs):
    """Wraps an async generator with retry + end-of-stream shape validation."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        parts: list[str] = []
        saw_tool_calls = False
        try:
            gen = await original_func(*args, **kwargs)
            async for part in gen:
                # Accumulate text from any chunk that has delta/message content;
                # corrupted chunks raise during iteration and are caught below.
                choices = getattr(part, "choices", None)
                if choices:
                    content = _extract_content(choices[0])
                    if isinstance(content, str):
                        parts.append(content)
                    saw_tool_calls = saw_tool_calls or _has_tool_calls(choices[0])
                yield part
            if _is_valid_stream(parts, saw_tool_calls):
                return
            raise InvalidResponseError(
                f"Stream ended with {sum(len(p.strip()) for p in parts)} content chars "
                f"(min {MIN_CONTENT_LENGTH}) and no tool_calls"
            )
        except Exception as e:
            if attempt == MAX_RETRIES - 1 or not _is_retryable(e):
                raise
            delay = _backoff_delay(attempt)
            logger.warning(
                f"OpenRouter corrupted stream (attempt {attempt + 1}/{MAX_RETRIES}). "
                f"Retrying in {delay:.1f}s... ({e})"
            )
            await asyncio.sleep(delay)
    raise AssertionError("unreachable")  # pragma: no cover


# ---------------------------------------------------------------------------
# Patches
# ---------------------------------------------------------------------------


def _patch_adk():
    try:
        from google.adk.models import lite_llm

        original_acompletion = lite_llm.LiteLLMClient.acompletion

        async def patched_acompletion(self, model, messages, tools, **kwargs):
            stream = kwargs.get("stream", False)
            if stream:
                return _retry_generator(
                    original_acompletion, self, model, messages, tools, **kwargs
                )
            return await _call_with_retries(
                lambda: original_acompletion(self, model, messages, tools, **kwargs)
            )

        lite_llm.LiteLLMClient.acompletion = patched_acompletion
        logger.info("ADK LiteLLMClient retry patch applied (streaming + non-streaming).")
    except (ImportError, AttributeError) as e:
        logger.warning(f"Could not apply ADK retry patch: {e}")


def _patch_litellm():
    try:
        import litellm

        original_acompletion = litellm.acompletion

        async def patched_acompletion(*args, **kwargs):
            stream = kwargs.get("stream", False)
            if stream:
                return _retry_generator(original_acompletion, *args, **kwargs)
            return await _call_with_retries(lambda: original_acompletion(*args, **kwargs))

        litellm.acompletion = patched_acompletion
        logger.info("LiteLLM retry patch applied (streaming + non-streaming).")
    except ImportError:
        logger.warning("LiteLLM not found, retry patch not applied.")


_patch_adk()
_patch_litellm()
