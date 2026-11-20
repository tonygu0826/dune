import copy
import unittest

from actions import ABOUT_DESCRIPTIONS, evaluate

ORIGIN = "https://energydune.com"
TARGET = ORIGIN + "/lubricants/"
QUERY = {"id": "Q01", "query": "lubricant supplier United States", "language": "en", "requested_country": "US", "candidate_target_path": "/lubricants/"}


def fixture():
    pages = [
        {"url": ORIGIN + "/", "status": 200, "title": "DUNE", "description": "Company", "lang": "en", "canonical": ORIGIN + "/", "h1": ["DUNE"], "links": ["/lubricants/?from=home#details"], "issues": []},
        {"url": TARGET, "status": 200, "title": "Multi-brand lubricants", "description": "Product sales by quotation", "lang": "en", "canonical": TARGET, "h1": ["Lubricants"], "links": ["#details"], "issues": []},
    ]
    return {"origin": ORIGIN, "summary": {"sitemap_valid": True}, "pages": pages, "issues": [], "crawler_access": {bot: {"allowed": [page["url"] for page in pages], "blocked": [], "unknown": []} for bot in ("Googlebot", "Bingbot")}}


def check(result, name):
    return next(item for item in result["keyword_tests"][0]["checks"] if item["name"] == name)


class KeywordActionTests(unittest.TestCase):
    def test_successful_readiness_is_never_a_rank_or_citation(self):
        result = evaluate(fixture(), [QUERY])
        item = result["keyword_tests"][0]
        self.assertEqual(item["on_site_status"], "passed")
        self.assertEqual(item["actual_rank_status"], "not_measured")
        self.assertEqual(item["ai_citation_status"], "not_measured")
        self.assertEqual(item["topical_signal"]["status"], "observed")
        self.assertEqual(result["actions"], [])
        self.assertEqual(check(result, "internal_entry")["evidence"]["observed_sources"], [ORIGIN + "/"])

    def test_missing_target_is_failure_only_when_sitemap_is_valid(self):
        site = fixture()
        site["pages"] = site["pages"][:1]
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "sitemap")["status"], "failed")
        self.assertEqual(check(result, "http")["status"], "unknown")
        site["summary"]["sitemap_valid"] = False
        self.assertEqual(check(evaluate(site, [QUERY]), "sitemap")["status"], "unknown")

    def test_capped_observation_does_not_prove_a_target_is_missing(self):
        site = fixture()
        site["pages"] = site["pages"][:1]
        site["issues"] = [{"code": "sitemap-cap", "severity": "warning", "message": "Only first 60 checked"}]
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "sitemap")["status"], "unknown")
        self.assertEqual(check(result, "internal_entry")["status"], "passed")

    def test_network_failure_does_not_claim_noindex_absent(self):
        site = fixture()
        site["pages"][1].update(status=None, issues=[{"code": "page-http", "severity": "critical", "url": TARGET, "message": "GET failed"}])
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "index_directives")["status"], "unknown")
        self.assertEqual(check(result, "language")["status"], "unknown")
        action = next(item for item in result["actions"] if item["code"] == "page-http")
        self.assertEqual(action["status"], "not_verified")
        self.assertFalse(action["requires_change"])

    def test_unknown_robots_does_not_pass(self):
        site = fixture()
        site["crawler_access"]["Bingbot"] = {"allowed": [], "blocked": [], "unknown": [TARGET]}
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "Bingbot")["status"], "unknown")
        self.assertEqual(result["keyword_tests"][0]["on_site_status"], "unknown")

    def test_self_link_does_not_make_an_internal_entry(self):
        site = fixture()
        site["pages"][0]["links"] = []
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "internal_entry")["status"], "failed")
        self.assertIn("keyword-internal-entry", [item["code"] for item in result["actions"]])

    def test_failed_source_does_not_prove_or_disprove_inbound_link(self):
        site = fixture()
        site["pages"][0]["status"] = 503
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "internal_entry")["status"], "unknown")

    def test_wrong_canonical_and_language_are_reported(self):
        site = fixture()
        site["pages"][1].update(canonical=ORIGIN + "/wrong/", lang="fr")
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "canonical")["status"], "failed")
        self.assertEqual(check(result, "language")["status"], "failed")
        self.assertEqual(result["keyword_tests"][0]["on_site_status"], "failed")

    def test_noindex_evidence_and_blocked_bot_are_failures(self):
        site = fixture()
        site["pages"][1]["issues"] = [{"code": "noindex", "severity": "critical", "url": TARGET, "message": "noindex"}]
        site["crawler_access"]["Googlebot"] = {"allowed": [], "blocked": [TARGET], "unknown": []}
        result = evaluate(site, [QUERY])
        self.assertEqual(check(result, "index_directives")["status"], "failed")
        self.assertEqual(check(result, "Googlebot")["status"], "failed")
        noindex = next(item for item in result["actions"] if item["code"] == "noindex")
        self.assertFalse(noindex["requires_change"])

    def test_exact_query_and_country_need_not_be_inserted_in_copy(self):
        site = fixture()
        site["pages"][1].update(title="Products", description="Quotation", h1=["Categories"])
        result = evaluate(site, [QUERY])
        self.assertEqual(result["keyword_tests"][0]["topical_signal"]["status"], "not_observed")
        self.assertEqual(result["keyword_tests"][0]["on_site_status"], "passed")

    def test_foreign_target_and_foreign_inbound_are_refused(self):
        query = {**QUERY, "candidate_target_path": "//example.com/"}
        result = evaluate(fixture(), [query])
        self.assertIsNone(result["keyword_tests"][0]["target_url"])
        self.assertEqual(result["keyword_tests"][0]["on_site_status"], "failed")
        site = fixture()
        site["pages"][0]["links"] = ["https://energydune.com.evil.invalid/lubricants/"]
        self.assertEqual(check(evaluate(site, [QUERY]), "internal_entry")["status"], "failed")

    def test_about_summary_is_optional_candidate_not_an_error(self):
        site = fixture()
        site["pages"].append({"url": ORIGIN + "/about/", "status": 200, "title": "About DUNE", "description": "A" * 249, "lang": "en", "canonical": ORIGIN + "/about/", "h1": ["About DUNE"], "links": [], "issues": []})
        result = evaluate(site, [])
        self.assertEqual(len(result["actions"]), 1)
        item = result["actions"][0]
        self.assertEqual(item["status"], "optimization_candidate")
        self.assertEqual(item["priority"], "info")
        self.assertEqual(item["evidence"]["observed_description_length"], 249)
        self.assertFalse(item["requires_change"])
        self.assertEqual(item["suggested_description"], ABOUT_DESCRIPTIONS["en"])
        self.assertNotIn("rank", item)

    def test_duplicate_observations_produce_one_action_and_input_is_unchanged(self):
        site = fixture()
        issue = {"code": "missing-title", "severity": "warning", "url": TARGET, "message": "No title"}
        site["issues"] = [issue, issue]
        site["pages"][1]["issues"] = [issue]
        original = copy.deepcopy(site)
        result = evaluate(site, [])
        self.assertEqual(len(result["actions"]), 1)
        self.assertEqual(site, original)


if __name__ == "__main__":
    unittest.main()
