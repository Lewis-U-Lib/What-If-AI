import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from source_links import validate


class SourceLinkTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads((ROOT / 'content/source-links.json').read_text())
        self.acts = json.loads((ROOT / 'data/acts.json').read_text())
        self.register = json.loads((ROOT / 'data/register.json').read_text())

    def test_all_current_file_candidates_have_review_decisions(self):
        validate(self.policy, self.acts, self.register)

    def test_verified_version_and_file_alias_keep_their_exact_destinations(self):
        index = {url: e for e in self.policy['entries'] for url in e['urls']}
        self.assertEqual(index['https://doi.org/10.5281/zenodo.19483119']['page'],
                         'https://zenodo.org/records/19483119')
        jula = index['https://doi.org/10.4038/jula.v27i2.8083']
        self.assertIs(jula, index['https://jula.sljol.info/articles/8083/files/67121a0716dcd.pdf'])
        self.assertEqual(jula['kind'], 'pdf')
        self.assertEqual(jula['page'], 'https://reference-global.com/article/10.4038/jula.v27i2.8083')
        # A related version or indexed-only page is insufficient evidence for a new mapping.
        for doi in ['10.5281/zenodo.22228526', '10.5281/zenodo.22894161',
                    '10.5281/zenodo.17849337', '10.4324/9781003532224-8',
                    '10.3390/su17031133']:
            self.assertNotIn('https://doi.org/' + doi, index)
        hea = index['https://doi.org/10.82110/3sxr-z770']
        self.assertIn('PDF; may download', hea['note'])
        self.assertEqual(hea['kind'], 'page')

    def test_new_file_endpoint_requires_review(self):
        self.acts['acts'][0]['url'] = 'https://example.org/article/download/123/456'
        with self.assertRaisesRegex(ValueError, 'Review new file-like'):
            validate(self.policy, self.acts, self.register)

    def test_unsafe_replacement_and_duplicate_alias_rejected(self):
        for bad in ['javascript:alert(1)', 'https://user:pass@example.org/', 'https://example.org/\nfile']:
            p = copy.deepcopy(self.policy)
            p['entries'][0]['page'] = bad
            with self.assertRaises(ValueError): validate(p, self.acts, self.register)
        self.policy['entries'].append(copy.deepcopy(self.policy['entries'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            validate(self.policy, self.acts, self.register)
