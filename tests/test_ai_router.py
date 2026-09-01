"""Tests for the shared AI Router configuration."""

import os
import unittest
from unittest.mock import patch

from seo_v2.ai_router import ai_router_completion_kwargs


class AiRouterConfigTest(unittest.TestCase):
    def test_uses_ai_router_settings(self):
        values = {
            "AIROUTER_API_KEY": "sk-test-key",
            "AIROUTER_BASE_URL": "https://example.test/v1/",
            "AIROUTER_MODEL": "Qwen3.8",
        }
        with patch.dict(os.environ, values, clear=False):
            settings = ai_router_completion_kwargs()

        self.assertEqual(settings["model"], "openai/Qwen3.8")
        self.assertEqual(settings["api_base"], "https://example.test/v1")
        self.assertEqual(settings["api_key"], "sk-test-key")
        self.assertEqual(settings["reasoning_effort"], "none")
        self.assertEqual(settings["allowed_openai_params"], ["reasoning_effort"])

    def test_legacy_key_is_only_a_fallback(self):
        with patch.dict(
            os.environ,
            {
                "AIROUTER_API_KEY": "",
                "OPENROUTER_API_KEY": "sk-legacy-key",
            },
            clear=False,
        ):
            settings = ai_router_completion_kwargs()

        self.assertEqual(settings["api_key"], "sk-legacy-key")

    def test_default_model_is_fast_qwen_model(self):
        with patch.dict(
            os.environ,
            {
                "AIROUTER_API_KEY": "sk-test-key",
                "AIROUTER_MODEL": "",
                "AIROUTER_REASONING_EFFORT": "",
            },
            clear=False,
        ):
            settings = ai_router_completion_kwargs()

        self.assertEqual(settings["model"], "openai/Qwen3.8")
        self.assertEqual(settings["reasoning_effort"], "none")
        self.assertEqual(settings["allowed_openai_params"], ["reasoning_effort"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
