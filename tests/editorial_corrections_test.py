"""Guard against applying editorial errata to the wrong content or metadata."""
import copy
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from editorial_corrections import apply_corrections, corrected_files


class EditorialCorrectionsTests(unittest.TestCase):
    def setUp(self):
        self.release = json.loads((ROOT / "data/release.json").read_text())
        self.edits = json.loads((ROOT / "content/editorial-corrections.json").read_text())
        self.source = {name: json.loads((ROOT / "data" / name).read_text())
                       for name in ("acts.json", "register.json", "guide.json")}

    def test_new_release_requires_reconciliation(self):
        self.release["release"] = "new-upstream-release"
        with self.assertRaisesRegex(ValueError, "need review"):
            apply_corrections(self.source, self.release, self.edits)

    def test_missing_or_reworded_target_fails(self):
        self.edits["activities"][0]["before"] = "text no longer in the source"
        with self.assertRaisesRegex(ValueError, "mismatch"):
            apply_corrections(self.source, self.release, self.edits)

    def test_matching_fields_cannot_be_changed_as_prose(self):
        self.edits["activities"][0]["field"] = "cap"
        with self.assertRaisesRegex(ValueError, "Invalid"):
            apply_corrections(self.source, self.release, self.edits)

    def test_duplicate_targets_fail(self):
        self.edits["activities"].append(copy.deepcopy(self.edits["activities"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            apply_corrections(self.source, self.release, self.edits)

    def test_attribution_role_and_original_title_are_preserved(self):
        original = copy.deepcopy(self.source)
        fixed = apply_corrections(self.source, self.release, self.edits)
        self.assertEqual(self.source, original)
        acts = {a["id"]: a for a in fixed["acts.json"]["acts"]}
        self.assertIn("Counseling Practice", acts["CAN-B-CASE-03"]["attr"])
        self.assertIn("Professor in Counselling", acts["CAN-B-CASE-03"]["attr"])
        self.assertIn("Analysing the grammar", acts["CAN-B-STYL-14"]["cit"])
        for before, after in zip(original["acts.json"]["acts"], fixed["acts.json"]["acts"]):
            for field in before.keys() - {"t", "sum", "chg", "cit", "attr", "dl", "gate", "rf"}:
                self.assertEqual(before[field], after[field], (before["id"], field))

    def test_output_matches_reviewed_hashes(self):
        output, _, metadata = corrected_files(ROOT / "data", self.release, ROOT / "content/editorial-corrections.json")
        self.assertEqual(output["guide.json"], (ROOT / "data/guide.json").read_bytes())
        self.assertEqual(metadata["replacements"], 23)


if __name__ == "__main__":
    unittest.main()
