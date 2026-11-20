import json
import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from urllib.error import URLError

from sources import SourceError, _aggregate, _bing, _bing_date, _windows, collect_sources


NOW = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
ACCOUNT = json.dumps({"type": "service_account", "client_email": "monitor@example.iam.gserviceaccount.com",
                      "private_key": "SYNTHETIC-SECRET-NOT-A-REAL-KEY", "token_uri": "https://oauth2.googleapis.com/token"})


class SourceTests(unittest.TestCase):
    def test_missing_credentials_are_not_zero(self):
        with patch("sources._make_google_session") as google, patch("sources._bing_fetch") as bing:
            result = collect_sources(now=NOW, environ={})
        self.assertEqual(result["google"]["status"], "not_connected")
        self.assertEqual(result["bing"]["status"], "not_connected")
        self.assertEqual(result["ai"]["status"], "not_measured")
        self.assertNotIn("metrics", result["google"])
        self.assertNotIn("metrics", result["bing"])
        google.assert_not_called()
        bing.assert_not_called()

    def test_completed_windows_use_pacific_date(self):
        # UTC Friday still Thursday in Pacific, so end is Pacific Monday.
        current, previous = _windows(datetime(2026, 11, 20, 2, tzinfo=timezone.utc))
        self.assertEqual((current["start"], current["end"]), ("2026-11-10", "2026-11-16"))
        self.assertEqual((previous["start"], previous["end"]), ("2026-11-03", "2026-11-09"))

    def test_average_positions_are_impression_weighted(self):
        result = _aggregate([{"clicks": 2, "impressions": 10, "position": 2},
                             {"clicks": 3, "impressions": 30, "position": 10}])
        self.assertEqual(result["average_position"], 8)
        self.assertEqual(result["ctr"], .125)
        self.assertIsNone(_aggregate([{"clicks": 0, "impressions": 0, "position": None}])["average_position"])
        self.assertIsNone(_aggregate([{"clicks": 1, "impressions": 1, "position": None}])["average_position"])

    def test_google_aggregate_and_country_filter_contract(self):
        session = Mock()
        rows = [{"clicks": 2, "impressions": 10, "position": 2},
                {"clicks": 1, "impressions": 5, "position": 4},
                {"clicks": 3, "impressions": 30, "position": 10},
                {"clicks": 1, "impressions": 5, "position": 2}]
        with patch("sources._make_google_session", return_value=session), patch("sources._google_query", side_effect=rows) as query:
            result = collect_sources(now=NOW, environ={"GSC_SERVICE_ACCOUNT_JSON": ACCOUNT})["google"]
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["metrics"]["current"]["average_position"], 8)
        self.assertEqual(result["metrics"]["previous"]["average_position"], 3)
        self.assertEqual([call.args[2] for call in query.call_args_list], ["usa", "usa", "can", "can"])
        session.close.assert_called_once()
        self.assertNotIn("private_key", json.dumps(result))

    def test_google_does_not_refresh_against_arbitrary_endpoint(self):
        payload = json.loads(ACCOUNT)
        payload["token_uri"] = "https://example.invalid/steal"
        with patch("sources._make_google_session") as session:
            result = collect_sources(now=NOW, environ={"GSC_SERVICE_ACCOUNT_JSON": json.dumps(payload)})["google"]
        self.assertEqual(result["reason"], "unapproved_google_token_endpoint")
        session.assert_not_called()

    def test_provider_errors_are_redacted(self):
        with patch("sources._make_google_session", side_effect=RuntimeError("TOKEN-and-private-key")), patch(
                "sources._bing_fetch", side_effect=URLError("https://ssl.bing.com/?apikey=SECRET")):
            result = collect_sources(now=NOW, environ={"GSC_SERVICE_ACCOUNT_JSON": ACCOUNT, "BING_WEBMASTER_API_KEY": "SECRET"})
        encoded = json.dumps(result)
        self.assertNotIn("SECRET", encoded)
        self.assertNotIn("TOKEN-and", encoded)
        self.assertEqual(result["google"]["status"], "error")
        self.assertEqual(result["bing"]["status"], "error")

    def test_bing_no_rows_does_not_claim_zero(self):
        with patch("sources._bing_fetch", return_value=[]):
            result = _bing("synthetic", *_windows(NOW))
        self.assertEqual(result["status"], "not_measured")
        self.assertNotIn("metrics", result)

    def test_bing_partial_coverage_and_provider_positions(self):
        records = [{"Date": "2026-11-17", "Clicks": 2, "Impressions": 10, "AvgImpressionPosition": 2},
                   {"Date": "2026-11-16", "Clicks": 3, "Impressions": 30, "AvgImpressionPosition": 10}]
        with patch("sources._bing_fetch", return_value=records):
            result = _bing("synthetic", *_windows(NOW))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["metrics"]["current"]["average_position"], 8)
        self.assertIsNone(result["metrics"]["previous"])
        self.assertEqual(result["coverage"]["current"]["observed_days"], 2)
        self.assertFalse(result["coverage"]["current"]["complete"])

    def test_bing_dates_and_duplicate_rows(self):
        self.assertEqual(_bing_date("/Date(1794873600000+0000)/").isoformat(), "2026-11-17")
        records = [{"Date": "2026-11-17", "Clicks": 0, "Impressions": 0}] * 2
        with patch("sources._bing_fetch", return_value=records):
            result = _bing("synthetic", *_windows(NOW))
        self.assertEqual(result["reason"], "bing_duplicate_daily_row")

    def test_google_http_failure_and_size_limit_have_safe_codes(self):
        from sources import _google_query
        response = Mock(status_code=403)
        session = Mock()
        session.post.return_value = response
        with self.assertRaisesRegex(SourceError, "google_api_http_403"):
            _google_query(session, _windows(NOW)[0], "usa")
        response.close.assert_called_once()
        response = Mock(status_code=200)
        response.iter_content.return_value = [b"x" * 1_000_001]
        session.post.return_value = response
        with self.assertRaisesRegex(SourceError, "google_response_too_large"):
            _google_query(session, _windows(NOW)[0], "usa")


if __name__ == "__main__":
    unittest.main()
