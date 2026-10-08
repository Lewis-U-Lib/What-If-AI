"""An interface license must never silently relicense included material."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from license_scope import license_scope_files, prior_public_data


class LicenseScopeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / 'content/tool-license.json').read_text())
        cls.raw = prior_public_data(ROOT)
        cls.output, cls.metadata, cls.license = license_scope_files(cls.raw, ROOT / 'content/tool-license.json')
        cls.before = json.loads(cls.raw['acts.json'])
        cls.after = json.loads(cls.output['acts.json'])

    def test_every_entry_keeps_its_license_and_all_non_note_fields(self):
        replacements = {row['before']: row['after'] for row in self.manifest['note_replacements']}
        self.assertEqual(len(self.before['acts']), 1033)
        self.assertEqual(len(self.before['acts']), len(self.after['acts']))
        changed = []
        for before, after in zip(self.before['acts'], self.after['acts']):
            expected = copy.deepcopy(before)
            if before.get('licn') in replacements:
                expected['licn'] = replacements[before['licn']]
                changed.append(before['id'])
            self.assertEqual(expected, after, before['id'])
            for field in ['lic', 'licu', 'lics', 'attr', 'cit', 'url', 'rel', 'sa']:
                self.assertEqual(before.get(field), after.get(field), before['id'] + '.' + field)
        self.assertEqual(changed, self.manifest['clarified_ids'])
        self.assertEqual(len(changed), 244)
        self.assertEqual({k:v for k,v in self.before.items() if k != 'acts'},
                         {k:v for k,v in self.after.items() if k != 'acts'})

    def test_every_source_policy_quotation_and_guide_field_is_identical(self):
        self.assertEqual(self.raw['register.json'], self.output['register.json'])
        self.assertEqual(self.raw['guide.json'], self.output['guide.json'])
        self.assertEqual(len(json.loads(self.output['register.json'])['works']), 618)

    def test_pins_refuse_unreviewed_input_or_license_changes(self):
        changed = dict(self.raw)
        changed['acts.json'] += b' '
        with self.assertRaisesRegex(ValueError, 'input changed'):
            license_scope_files(changed, ROOT / 'content/tool-license.json')
        self.assertEqual(self.license['id'], 'CC-BY-NC-ND-4.0')
        self.assertEqual(self.license['url'], 'https://creativecommons.org/licenses/by-nc-nd/4.0/')
        self.assertIn('no restrictions', self.license['exceptions'])
        self.assertIn('does not revoke', self.license['history_notice'])

    def test_separately_licensed_files_are_not_modified(self):
        fixture = self.manifest['preserved_files_sha256']
        self.assertGreater(len(fixture), 4)
        for name, expected in fixture.items():
            self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), expected, name)


if __name__ == '__main__':
    unittest.main()
