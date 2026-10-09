"""Reject inconsistent public collections even when their file hashes are updated."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from check_release import check


class PublicCollectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = {p.name: json.loads(p.read_text()) for p in (ROOT / 'data').glob('*.json')}

    def altered(self, change, expected):
        data = copy.deepcopy(self.source)
        change(data)
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            for name in data['release.json']['files']:
                body = (json.dumps(data[name], ensure_ascii=False) + '\n').encode()
                (directory / name).write_bytes(body)
                data['release.json']['files'][name] = {'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
            (directory / 'release.json').write_text(json.dumps(data['release.json']))
            errors, _ = check(directory)
            self.assertTrue(any(expected in e for e in errors), errors)

    def test_current_collection_is_valid(self):
        errors, release = check(ROOT / 'data')
        self.assertEqual(errors, [])
        self.assertEqual(release['counts'], {'activities': 1033, 'works': 618})

    def test_duplicate_ids_fail(self):
        self.altered(lambda d: d['acts.json']['acts'].append(d['acts.json']['acts'][0]), 'duplicate activity ids')

    def test_source_backlinks_fail(self):
        self.altered(lambda d: d['register.json']['works'][0]['acts'].append('UNKNOWN-ACTIVITY'), 'not in the release')

    def test_invalid_remix_parent_fails(self):
        self.altered(lambda d: next(a for a in d['acts.json']['acts'] if a.get('par')).update(par='UNKNOWN-ACTIVITY'), 'remix parent')

    def test_ai_operator_and_tool_must_agree(self):
        self.altered(lambda d: next(a for a in d['acts.json']['acts'] if a['op'] == 'students').update(op='none'), 'operator and capabilities disagree')

    def test_source_access_requires_a_used_item(self):
        self.altered(lambda d: d['acts.json']['acts'][0].update(sa='restricted', rel=[]), 'source-access label')

    def test_type_count_must_match_related_ideas(self):
        self.altered(lambda d: d['register.json']['types']['types'][0].update(n=0), 'type count disagrees')

    def test_unknown_internal_fields_fail(self):
        self.altered(lambda d: d['acts.json']['acts'][0].update(internal_note='test'), 'non-public activity fields')


if __name__ == '__main__':
    unittest.main()
