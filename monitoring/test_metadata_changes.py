import copy
import unittest
from audit import compare


class MetadataChangeTests(unittest.TestCase):
    def test_head_only_change_is_observed_separately_from_body(self):
        url = 'https://energydune.com/about/'
        old = {'pages': [{'url': url, 'status': 200, 'description': 'Old.', 'content_hash': 'same-body'}], 'issues': []}
        current = copy.deepcopy(old)
        current['pages'][0]['description'] = 'New.'
        result = compare(old, current)
        self.assertEqual(result['changed_metadata'], [url])
        self.assertEqual(result['changed_content'], [])
        current['pages'][0]['status'] = 503
        self.assertEqual(compare(old, current)['changed_metadata'], [])
        current['pages'][0]['status'] = 200
        current['pages'][0]['issues'] = [{'code': 'page-content-type'}]
        self.assertEqual(compare(old, current)['changed_metadata'], [])


if __name__ == '__main__':
    unittest.main()
