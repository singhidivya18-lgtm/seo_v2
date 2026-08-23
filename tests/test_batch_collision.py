"""Regression test: a batch must never map a title to a sibling's file.

The original bug: with concurrency > 1, a title whose own generation failed
was silently handed the "newest .docx in the shared output dir" - which was
another title's file. The fix gives every title a job_id at dispatch, embeds
the job_id in the output filename, and carries {job_id, title, path} together.

This test injects a forced exception on the 3rd of 5 titles and asserts:
  (a) titles 1,2,4,5 map to their own correct files,
  (b) title 3 appears in `failed`,
  (c) no path appears twice in `ok`.
"""

import asyncio
import os
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from seo_v2.tools import batch_tools


class _FakeFileStore:
    """Replaces the real pipeline; creates one file per title with job_id in the name."""

    def __init__(self, fail_index: int) -> None:
        self.fail_index = fail_index
        self.dir = tempfile.mkdtemp(prefix="seo_batch_test_")
        self.created: list[str] = []

    async def fake_run_single_pipeline(self, title: str, job_id: str | None = None):
        index = int(job_id.rsplit("_", 1)[1]) - 1 if job_id else 0
        if index == self.fail_index:
            raise RuntimeError(f"forced failure for {title}")
        filename = f"{job_id}_{title}.docx"
        path = os.path.join(self.dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(title)
        self.created.append(path)
        return {
            "status": "success",
            "title": title,
            "job_id": job_id,
            "filename": filename,
            "filepath": path,
            "url": f"/files/{filename}",
            "fallback_used": False,
        }


class BatchCollisionTest(unittest.TestCase):
    def _run_batch(self, titles: list[str], fail_index: int):
        store = _FakeFileStore(fail_index)
        with patch.object(batch_tools, "run_single_pipeline", new=store.fake_run_single_pipeline):
            result = asyncio.run(batch_tools.run_article_batch(titles, concurrency=2))
        return result, store

    def test_third_failure_reported_and_no_sibling_mapping(self):
        titles = [f"Title {i}" for i in range(1, 6)]
        result, store = self._run_batch(titles, fail_index=2)  # 3rd of 5 fails

        ok = result["ok"]
        failures = result["failures"]
        self.assertEqual(result["failed"], 1)  # int count, not the list
        self.assertEqual(len(ok), 4)
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0]["title"], "Title 3")
        self.assertIn("forced failure", failures[0]["error"])

        ok_titles = {r["title"] for r in ok}
        self.assertEqual(ok_titles, {"Title 1", "Title 2", "Title 4", "Title 5"})

        for r in ok:
            self.assertIn(r["job_id"], r["filepath"])
            self.assertIn(r["job_id"], r["filename"])

        paths = [r["filepath"] for r in ok]
        self.assertEqual(len(paths), len(set(paths)), "duplicate path in ok: sibling mixup")
        self.assertEqual(len(store.created), 4)

    def test_all_success_still_correct(self):
        titles = [f"Title {i}" for i in range(1, 6)]
        result, store = self._run_batch(titles, fail_index=-1)

        self.assertEqual(len(result["ok"]), 5)
        self.assertEqual(result["failed"], 0)
        self.assertEqual(result["failures"], [])
        self.assertEqual(len({r["filepath"] for r in result["ok"]}), 5)
        self.assertEqual(len(store.created), 5)

    def test_job_id_embedded_in_generated_filename(self):
        # generate_docx must accept job_id and put it in the filename.
        with patch.object(batch_tools, "generate_docx", new=AsyncMock()) as gen:
            gen.return_value = {"status": "success", "filepath": "/tmp/x_j1_y.docx"}
            # Direct contract check on generate_docx itself:
            from seo_v2.tools import docx_generator

            async def real_generate():
                return await docx_generator.generate_docx(
                    article_text="Enough text for a document body here.",
                    title="DeepSeek Flash vs Pro",
                    output_dir=store_dir,
                    job_id="abc123",
                )

            store_dir = tempfile.mkdtemp(prefix="seo_docx_test_")
            res = asyncio.run(real_generate())
            self.assertEqual(res["status"], "success")
            self.assertIn("abc123", res["filename"])
            self.assertIn("abc123", res["filepath"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
