"""Punctuation must preserve evidence, classifications, and the reviewed release."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from editorial_corrections import corrected_files
from publication_review import reviewed_files
from serial_commas import apply_commas, punctuated_files


class SerialCommaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release = json.loads((ROOT / "data/release.json").read_text())
        raw, _, _ = corrected_files(ROOT / "data", release, ROOT / "content/editorial-corrections.json")
        cls.raw, _, _ = reviewed_files(raw, release, ROOT / "content/publication-review.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.manifest = json.loads((ROOT / "content/serial-comma-corrections.json").read_text())

    def test_words_structure_quotes_and_matching_codes_are_preserved(self):
        original = copy.deepcopy(self.source)
        fixed = apply_commas(self.source, self.manifest)
        self.assertEqual(self.source, original)
        def without_commas(x):
            if isinstance(x, str):
                return x.replace(",", "")
            if isinstance(x, list):
                return [without_commas(v) for v in x]
            if isinstance(x, dict):
                return {k: without_commas(v) for k, v in x.items()}
            return x
        self.assertEqual(without_commas(fixed), without_commas(original))
        protected = {"id", "f", "focus", "task", "disc", "depth", "lvl", "mod", "cap", "pc",
                     "eq", "sen", "dis", "pol", "cit", "attr", "cr", "rel", "pr", "lics"}
        for before, after in zip(original["acts.json"]["acts"], fixed["acts.json"]["acts"]):
            for key in protected:
                self.assertEqual(before.get(key), after.get(key), (before["id"], key))
        self.assertEqual(original["register.json"]["works"], fixed["register.json"]["works"])
        for a, b in zip(original["register.json"]["policy"]["tiers"], fixed["register.json"]["policy"]["tiers"]):
            self.assertEqual(a["items"], b["items"])

    def test_wrong_field_stale_text_duplicate_and_invalid_positions_fail(self):
        for patch in [{"path": ["acts.json", "acts", 0, "cap"]},
                      {"path": ["acts.json", "acts", 0, "pr"]},
                      {"sha256": "stale"}, {"commas": [0]}, {"commas": [-1]}]:
            review = copy.deepcopy(self.manifest)
            review["fields"][0].update(patch)
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                apply_commas(self.source, review)
        review = copy.deepcopy(self.manifest)
        review["fields"].append(review["fields"][0])
        with self.assertRaisesRegex(ValueError, "duplicate"):
            apply_commas(self.source, review)

    def test_stale_publication_fails_and_reviewed_output_builds(self):
        path = ROOT / "content/serial-comma-corrections.json"
        with self.assertRaisesRegex(ValueError, "input changed"):
            punctuated_files({**self.raw, "acts.json": self.raw["acts.json"] + b" "}, path)
        output, _, metadata = punctuated_files(self.raw, path)
        self.assertEqual(output["guide.json"], self.raw["guide.json"])
        self.assertEqual(len(json.loads(output["acts.json"])["acts"]), 815)
        self.assertEqual(metadata["commas"], 1425)


if __name__ == "__main__":
    unittest.main()
