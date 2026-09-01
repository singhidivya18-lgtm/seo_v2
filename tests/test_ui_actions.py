"""Tests for the curate-to-batch API handoff."""

import json
import unittest
from unittest.mock import patch

from seo_v2 import ui_server


class FakeRequest:
    def __init__(self, payload):
        self.payload = payload

    async def json(self):
        return self.payload


class UiActionTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        ui_server._job.update(
            state="idle",
            titles=[],
            field="",
            concurrency=2,
            max_rounds=0,
            batch_id="",
            results=[],
            message="Enter a field of interest or paste titles.",
        )

    async def test_batch_uses_curated_titles_when_editor_payload_is_empty(self):
        curated = ["First curated title", "Second curated title"]
        ui_server._job.update(state="ready", titles=curated, field="technology")
        scheduled = []

        def capture(coro):
            scheduled.append(coro)
            coro.close()

        payload = {
            "userAction": {
                "name": "run_batch",
                "context": {"field": "technology", "titlesRaw": ""},
            }
        }
        with patch.object(ui_server.asyncio, "create_task", side_effect=capture):
            response = await ui_server.action(FakeRequest(payload))

        self.assertEqual(response["ok"], True)
        self.assertEqual(ui_server._job["state"], "running")
        self.assertEqual(ui_server._job["titles"], curated)
        self.assertEqual(len(scheduled), 1)

    async def test_busy_job_returns_conflict_instead_of_silently_ignoring_action(self):
        ui_server._job.update(state="running")
        payload = {
            "userAction": {
                "name": "curate_titles",
                "context": {"field": "technology"},
            }
        }

        response = await ui_server.action(FakeRequest(payload))

        self.assertEqual(response.status_code, 409)
        self.assertIn("already running", json.loads(response.body)["error"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
