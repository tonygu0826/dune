import unittest
from optimizations import verify


class OptimizationTests(unittest.TestCase):
    def test_current_html_confirms_copy_not_a_ranking_gain(self):
        url = 'https://energydune.com/about/'
        records = [{'id': 'about-snippets', 'title': 'Company search descriptions', 'targets': [{'url': url, 'language': 'en', 'description': 'Factual company description.'}]}]
        page = {'url': url, 'status': 200, 'lang': 'en', 'canonical': url, 'description': 'Factual company description.',
                'description_variants': {channel: ['Factual company description.'] for channel in ('meta', 'og', 'twitter', 'schema')}}
        results = verify({'pages': [page]}, records)
        self.assertEqual(results[0]['status'], 'passed')
        self.assertEqual(results[0]['ranking_effect'], 'not_measured')
        self.assertEqual(results[0]['ai_citation_effect'], 'not_measured')
        page['description_variants']['og'] = ['Outdated social description.']
        self.assertEqual(verify({'pages': [page]}, records)[0]['status'], 'failed')
        page['description_variants']['og'] = ['Factual company description.']
        page['description'] = 'Unexpected revision.'
        self.assertEqual(verify({'pages': [page]}, records)[0]['status'], 'failed')
        page['status'] = 503
        self.assertEqual(verify({'pages': [page]}, records)[0]['status'], 'unknown')

    def test_missing_coverage_never_passes(self):
        records = [{'id': 'test', 'title': 'Test', 'targets': []}]
        self.assertEqual(verify({'pages': []}, records)[0]['status'], 'unknown')


if __name__ == '__main__':
    unittest.main()
