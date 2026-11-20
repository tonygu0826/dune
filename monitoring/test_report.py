import unittest
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from run import main, render, measurement_status
from schedule import should_run


class ScheduleTests(unittest.TestCase):
    def test_summer(self):
        now = datetime(2026, 7, 1, 15, tzinfo=timezone.utc)
        self.assertTrue(should_run("schedule", "0 13 * * *", now))
        self.assertFalse(should_run("schedule", "0 14 * * *", now))

    def test_winter_and_manual(self):
        now = datetime(2026, 11, 20, 16, tzinfo=timezone.utc)
        self.assertTrue(should_run("schedule", "0 14 * * *", now))
        self.assertFalse(should_run("schedule", "0 13 * * *", now))
        self.assertTrue(should_run("workflow_dispatch", "", now))


class ReportTests(unittest.TestCase):
    def test_failed_collection_still_saves_an_honest_report(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch('sys.argv', ['run.py', '--output', temp]), patch('run.collect_site', side_effect=RuntimeError('SENSITIVE-detail')), patch.dict('os.environ', {}, clear=True):
                self.assertEqual(main(), 1)
            report = (Path(temp) / 'daily-report.md').read_text()
            data = json.loads((Path(temp) / 'daily-result.json').read_text())
            self.assertNotIn('SENSITIVE-detail', report)
            self.assertEqual(data['technical']['summary']['pages_checked'], 0)
            self.assertFalse(data['technical']['summary']['healthy'])
            self.assertIn('不能判定全站状态', report)

    def test_no_data_is_not_zero_or_a_rank_claim(self):
        data = {"report_date": "2026-11-20", "generated_at": "2026-11-20T09:00:00-05:00",
                "technical": {"summary": {"critical": 0, "warning": 0, "info": 0, "pages_expected": 28, "pages_checked": 28, "http_ok": 28}, "issues": [], "crawler_access": {}},
                "changes": {"baseline_available": False}, "search_sources": measurement_status(), "queries": []}
        report = render(data)
        self.assertIn("尚未测量", report)
        self.assertIn("首轮", report)
        for item in data["search_sources"].values():
            self.assertNotIn("metrics", item)


if __name__ == "__main__":
    unittest.main()
