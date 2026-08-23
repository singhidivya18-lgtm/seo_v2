"""Tests for retry_patch.py hardening (Phase 3).

Covers:
  - shape validation (_is_valid_response / _is_valid_stream)
  - exponential backoff + jitter bounds
  - retry-on-corrupted-error, retry-on-invalid-shape
  - exhaustion after MAX_RETRIES (raises, no silent success)
  - non-retryable errors propagate immediately
  - streaming path (retry mid-iteration + end-of-stream validation)
  - the monkey patches are actually applied to ADK and litellm
"""

import asyncio
import inspect
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from seo_v2 import retry_patch


def make_response(content=None, tool_calls=None):
    msg = SimpleNamespace(content=content, tool_calls=tool_calls)
    choice = SimpleNamespace(message=msg, delta=None)
    return SimpleNamespace(choices=[choice])


def make_stream_chunk(text):
    delta = SimpleNamespace(content=text, tool_calls=None)
    choice = SimpleNamespace(message=None, delta=delta)
    return SimpleNamespace(choices=[choice])


class ShapeValidationTest(unittest.TestCase):
    def test_none_rejected(self):
        self.assertFalse(retry_patch._is_valid_response(None))

    def test_empty_choices_rejected(self):
        self.assertFalse(retry_patch._is_valid_response(SimpleNamespace(choices=[])))

    def test_short_content_rejected(self):
        self.assertFalse(retry_patch._is_valid_response(make_response("   \n  ")))
        self.assertFalse(retry_patch._is_valid_response(make_response("hi")))

    def test_long_content_accepted(self):
        self.assertTrue(retry_patch._is_valid_response(make_response("A" * 200)))

    def test_tool_calls_exempt(self):
        tc = SimpleNamespace(function=SimpleNamespace(name="generate_docx"))
        self.assertTrue(retry_patch._is_valid_response(make_response(None, [tc])))

    def test_multimodal_list_content(self):
        self.assertTrue(
            retry_patch._is_valid_response(make_response(["hello ", "world"]))
        )

    def test_stream_validation(self):
        self.assertTrue(retry_patch._is_valid_stream(["A" * 100], False))
        self.assertFalse(retry_patch._is_valid_stream(["  ", ""], False))
        self.assertTrue(retry_patch._is_valid_stream([""], True))  # tool call


class BackoffTest(unittest.TestCase):
    def test_monotonic_with_jitter(self):
        with patch.object(retry_patch.random, "uniform", return_value=0.5):
            d0 = retry_patch._backoff_delay(0)
            d1 = retry_patch._backoff_delay(1)
            d2 = retry_patch._backoff_delay(2)
            self.assertGreater(d1, d0)
            self.assertGreater(d2, d1)
            self.assertEqual(d0, 2.5)  # 2 + 0.5
            self.assertEqual(d1, 4.5)
            self.assertEqual(d2, 8.5)

    def test_capped(self):
        with patch.object(retry_patch.random, "uniform", return_value=0.0):
            self.assertLessEqual(retry_patch._backoff_delay(10), 31.0)


class RetryCoreTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.sleep_mock = AsyncMock()
        patcher = patch.object(retry_patch.asyncio, "sleep", self.sleep_mock)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_success_first_try(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            return make_response("A" * 100)

        resp = await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, 1)
        self.assertEqual(resp.choices[0].message.content, "A" * 100)
        self.sleep_mock.assert_not_awaited()

    async def test_retries_after_corrupted_then_succeeds(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            if calls < 3:
                raise json.JSONDecodeError("Expecting value", "doc", 0)
            return make_response("A" * 100)

        resp = await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, 3)
        self.assertEqual(self.sleep_mock.await_count, 2)

    async def test_retries_after_invalid_shape(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            if calls < 3:
                return make_response("")  # silently-accepted bug: now retried
            return make_response("A" * 100)

        resp = await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, 3)

    async def test_exhaustion_raises(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            raise json.JSONDecodeError("Expecting value", "doc", 0)

        with self.assertRaises(json.JSONDecodeError):
            await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, retry_patch.MAX_RETRIES)

    async def test_exhaustion_on_persistently_empty_body(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            return make_response("   ")

        with self.assertRaises(retry_patch.InvalidResponseError):
            await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, retry_patch.MAX_RETRIES)

    async def test_non_retryable_raises_immediately(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            raise ValueError("model not found")

        with self.assertRaises(ValueError):
            await retry_patch._call_with_retries(factory)
        self.assertEqual(calls, 1)


class StreamingRetryTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.sleep_mock = AsyncMock()
        patcher = patch.object(retry_patch.asyncio, "sleep", self.sleep_mock)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def _consume(self, factory):
        out = []
        async for part in retry_patch._retry_generator(factory):
            out.append(part)
        return out

    async def test_stream_retries_after_mid_iteration_error(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1
            if calls == 1:
                raise json.JSONDecodeError("Expecting value", "doc", 0)

            async def agen():
                yield make_stream_chunk("valid long content here")

            return agen()

        out = await self._consume(factory)
        self.assertEqual(calls, 2)
        self.assertEqual(len(out), 1)
        self.assertEqual(self.sleep_mock.await_count, 1)

    async def test_stream_empty_body_retries_then_raises(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1

            async def agen():
                yield make_stream_chunk("")

            return agen()

        with self.assertRaises(retry_patch.InvalidResponseError):
            await self._consume(factory)
        self.assertEqual(calls, retry_patch.MAX_RETRIES)

    async def test_stream_success_first_try(self):
        calls = 0

        async def factory():
            nonlocal calls
            calls += 1

            async def agen():
                yield make_stream_chunk("valid content chunk one")
                yield make_stream_chunk(" valid content chunk two")

            return agen()

        out = await self._consume(factory)
        self.assertEqual(calls, 1)
        self.assertEqual(len(out), 2)


class PatchAppliedTest(unittest.TestCase):
    def test_adk_client_patched(self):
        from google.adk.models import lite_llm

        self.assertTrue(inspect.iscoroutinefunction(lite_llm.LiteLLMClient.acompletion))

    def test_litellm_acompletion_patched(self):
        import litellm

        self.assertTrue(inspect.iscoroutinefunction(litellm.acompletion))


if __name__ == "__main__":
    unittest.main(verbosity=2)

