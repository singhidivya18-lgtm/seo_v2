"""Regression tests for bounded article generation."""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from seo_v2.tools import batch_tools


class PipelineFallbackTest(unittest.IsolatedAsyncioTestCase):
    async def test_pipeline_error_uses_direct_article_fallback(self):
        fallback = {
            "status": "success",
            "title": "A valid article title",
            "filename": "article.docx",
            "filepath": "/data/article.docx",
            "url": "/files/article.docx",
        }
        with patch.object(
            batch_tools,
            "_execute_pipeline",
            new=AsyncMock(return_value=({"status": "error", "error_message": "upstream"}, "")),
        ), patch.object(
            batch_tools,
            "_generate_fallback_article",
            new=AsyncMock(return_value=fallback),
        ) as generate_fallback:
            result = await batch_tools.run_single_pipeline(
                "A valid article title", job_id="batch_1"
            )

        self.assertEqual(result["status"], "success")
        self.assertTrue(result["fallback_after_pipeline_error"])
        generate_fallback.assert_awaited_once_with(
            "A valid article title", job_id="batch_1"
        )

    async def test_pipeline_timeout_uses_direct_article_fallback(self):
        async def hanging_pipeline(*args, **kwargs):
            await asyncio.sleep(1)
            return {"status": "success"}, ""

        fallback = {
            "status": "success",
            "title": "A valid article title",
            "filename": "article.docx",
            "filepath": "/data/article.docx",
            "url": "/files/article.docx",
        }
        with patch.object(batch_tools, "_PIPELINE_TIMEOUT_SECONDS", 0.01), patch.object(
            batch_tools, "_execute_pipeline", new=hanging_pipeline
        ), patch.object(
            batch_tools,
            "_generate_fallback_article",
            new=AsyncMock(return_value=fallback),
        ):
            result = await batch_tools.run_single_pipeline("A valid article title")

        self.assertEqual(result["status"], "success")
        self.assertTrue(result["fallback_after_pipeline_error"])

    def test_curated_parser_removes_metadata_and_fills_missing_titles(self):
        text = """# Curated Titles for: artificial intelligence

1. Field: artificial intelligence
2. Agentic AI / autonomous workflows - \"AI agents\"
3. Open-source AI models

## Trend Evidence
"""

        titles = batch_tools._parse_curated_titles(text, "artificial intelligence")

        self.assertEqual(len(titles), 5)
        self.assertNotIn("Field: artificial intelligence", titles)
        self.assertEqual(titles[0], "Agentic AI / autonomous workflows")


if __name__ == "__main__":
    unittest.main(verbosity=2)
