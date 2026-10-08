"""A sourced guide must not silently reclassify or rewrite the activity corpus."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from terminology import reviewed_input, terminology_files
from ai_type_guide import ai_type_guide_files, validate


class AiTypeGuideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw, _ = terminology_files(reviewed_input(ROOT), ROOT / 'content/terminology.json')
        cls.output, cls.meta = ai_type_guide_files(cls.raw, ROOT / 'content/ai-type-guide.json')
        cls.before = json.loads(cls.raw['register.json'])
        cls.after = json.loads(cls.output['register.json'])
        cls.guide = json.loads((ROOT / 'content/ai-type-guide.json').read_text())

    def test_corpus_bibliography_and_related_idea_filters_are_preserved(self):
        for file in ('acts.json', 'guide.json'):
            self.assertEqual(self.output[file], self.raw[file])
        for key in self.before.keys() - {'types'}:
            self.assertEqual(self.before[key], self.after[key], key)
        for old, new in zip(self.before['types']['types'], self.after['types']['types']):
            for field in ('key', 'icon', 'ids', 'caps', 'n'):
                self.assertEqual(old.get(field), new.get(field), old['key'] + '.' + field)
        self.assertEqual(self.before['types']['no_ai']['n'], self.after['types']['no_ai']['n'])

    def test_unknown_citations_and_uncited_references_fail(self):
        guide = copy.deepcopy(self.guide)
        guide['types']['image']['citations']['what'] = [999]
        with self.assertRaisesRegex(ValueError, 'unknown citations'):
            validate(guide, self.before['types']['types'])
        guide = copy.deepcopy(self.guide)
        guide['types']['image']['citations']['what'] = []
        with self.assertRaisesRegex(ValueError, 'require sources'):
            validate(guide, self.before['types']['types'])

    def test_cannot_change_related_records_or_hide_a_choice_among_capabilities(self):
        guide = copy.deepcopy(self.guide)
        guide['no_ai']['n'] = 999
        with self.assertRaisesRegex(ValueError, 'count or filter'):
            validate(guide, self.before['types']['types'])
        guide = copy.deepcopy(self.guide)
        guide['types']['image']['ids'] = ['invented-record']
        with self.assertRaisesRegex(ValueError, 'only its prose'):
            validate(guide, self.before['types']['types'])
        guide = copy.deepcopy(self.guide)
        guide['groups'][0]['keys'].append('institutional')
        guide['groups'][-1]['keys'].remove('institutional')
        with self.assertRaisesRegex(ValueError, 'separate'):
            validate(guide, self.before['types']['types'])

    def test_reference_mapping_matches_the_research_ledger(self):
        ledger = json.loads((ROOT / 'docs/research/ai-type-sources.json').read_text())
        for public, recorded in zip(self.guide['sources'], ledger['sources']):
            self.assertEqual((public['id'], public['url'], public['title']),
                             (recorded['id'], recorded['url'], recorded['title']))
        self.assertEqual(len(self.guide['sources']), len(ledger['sources']))
        self.assertEqual(self.meta['source_count'], len(ledger['sources']))
