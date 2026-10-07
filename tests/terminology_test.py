"""The public wording may change without changing sources, links, or decisions."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from terminology import FIELDS, QUOTE, apply_terminology, reviewed_input, terminology_files, replace_prose


class TerminologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = reviewed_input(ROOT)
        cls.before = {k: json.loads(v) for k, v in cls.raw.items()}
        cls.manifest = json.loads((ROOT / 'content/terminology.json').read_text())
        cls.after, _ = apply_terminology(cls.before, cls.manifest)

    def test_source_material_and_structural_fields_are_preserved(self):
        for old, new in zip(self.before['acts.json']['acts'], self.after['acts.json']['acts']):
            for field in old:
                if field not in FIELDS | {'rel', 'srp', 'miss', 'attr'}:
                    self.assertEqual(old[field], new[field], old['id'] + '.' + field)
            for before, after in zip(old.get('rel', []), new.get('rel', [])):
                self.assertEqual(before[0], after[0])
                self.assertEqual(before[2:], after[2:])
            for before, after in zip(old.get('attr', '').split('\n'), new.get('attr', '').split('\n')):
                self.assertEqual(before.partition('Changes: ')[0], after.partition('Changes: ')[0])
            for field in FIELDS & old.keys():
                if isinstance(old[field], str):
                    for quote in QUOTE.findall(old[field]):
                        self.assertIn(quote, new[field], old['id'] + '.' + field)
            if old['id'] in self.manifest['source_titles']:
                self.assertEqual(old['t'], new['t'])
        for old, new in zip(self.before['register.json']['works'], self.after['register.json']['works']):
            for field in old:
                if not (old['id'] == 'SRC-0143' and field == 'lic'):
                    self.assertEqual(old[field], new[field], old['id'] + '.' + field)
        for old, new in zip(self.before['register.json']['policy']['tiers'], self.after['register.json']['policy']['tiers']):
            self.assertEqual(old['items'], new['items'])
        self.assertEqual(self.before['guide.json'], self.after['guide.json'])

    def test_wording_articles_case_and_quoted_language(self):
        self.assertEqual(replace_prose('An activity, an activity’s source, and Activities.'),
                         'A use-case idea, a use-case idea’s source, and Use-case ideas.')
        self.assertEqual(replace_prose('An activity quotes “activities” and "activity" at https://example.org/activities.'),
                         'A use-case idea quotes “activities” and "activity" at https://example.org/activities.')

    def test_counts_ids_and_publication_decisions_are_unchanged(self):
        for key in ['counts', 'stamp']:
            self.assertEqual(self.before['register.json'][key], self.after['register.json'][key])
        self.assertEqual([a['id'] for a in self.before['acts.json']['acts']],
                         [a['id'] for a in self.after['acts.json']['acts']])
        self.assertEqual(len(self.after['acts.json']['acts']), 1033)
        self.assertEqual(len(self.after['register.json']['works']), 618)

    def test_pinned_pass_refuses_unreviewed_input(self):
        output, metadata = terminology_files(self.raw, ROOT / 'content/terminology.json')
        self.assertEqual(metadata['changed_fields'], self.manifest['changed_fields'])
        changed = copy.deepcopy(self.raw)
        changed['acts.json'] += b' '
        with self.assertRaisesRegex(ValueError, 'input changed'):
            terminology_files(changed, ROOT / 'content/terminology.json')
