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
