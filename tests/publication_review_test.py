"""Independent publication expectations and fail-closed review safeguards."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from editorial_corrections import corrected_files
from publication_review import apply_review, reviewed_files

HELD = {f"CAN-L-{n:03}" for n in [1, 2, 3, 21, 22, 23, 50, 53, 58, 64, 71]}


class PublicationReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.release = json.loads((ROOT / "data/release.json").read_text())
        cls.raw, _, _ = corrected_files(ROOT / "data", cls.release, ROOT / "content/editorial-corrections.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.review = json.loads((ROOT / "content/publication-review.json").read_text())

    def test_publication_preserves_old_records_and_original_import(self):
        before = copy.deepcopy(self.source)
        result = apply_review(self.source, self.release, self.review)
        acts = result["acts.json"]["acts"]
        self.assertEqual(len(acts), 815)
        self.assertEqual(len(result["register.json"]["works"]), 315)
        self.assertEqual({a["id"] for a in before["acts.json"]["acts"]} - {a["id"] for a in acts}, HELD)
        self.assertEqual(self.source, before)
        for name, key, prefix in [("acts.json", "acts", "CAN-L-"), ("register.json", "works", "CSR-")]:
            if key == "acts":
                old = [a for a in before[name][key] if not a["id"].startswith(prefix)]
            else:
                added = {r[0] for a in before["acts.json"]["acts"] if a["id"].startswith("CAN-L-") for r in a["rel"]}
                old = [w for w in before[name][key] if w["id"] not in added]
            published = {item["id"]: item for item in result[name][key]}
            self.assertEqual(len(old), 745 if key == "acts" else 249)
            for item in old:
                self.assertEqual(published[item["id"]], item)
        self.assertEqual(result["guide.json"], before["guide.json"])
        records = {a["id"]: a for a in acts}
        self.assertEqual(records["CAN-L-004"]["depth"], "assignment")
        self.assertIn("PDF pp. 21–27", records["CAN-L-004"]["loc"])
        self.assertEqual(records["CAN-L-055"]["depth"], "assignment")
        self.assertIn("Public repositories", records["CAN-L-055"]["loc"])
        self.assertIn("paper collage", records["CAN-L-008"]["na"])
        self.assertIn("two with students who did not attend", records["CAN-L-008"]["evs"])
        self.assertIn("44,831", records["CAN-L-060"]["sum"])
        for key in ["CAN-L-038", "CAN-L-039"]:
            self.assertEqual(records[key]["eq"], "paid_required")
        self.assertEqual(len({e["id"] for e in self.review["updates"]}), 7)

    def test_missing_duplicate_and_outside_scope_decisions_fail(self):
        for variant in [self.review["decisions"][:-1], self.review["decisions"] + [self.review["decisions"][0]],
                        [{**d, "id": "OTHER"} if i == 0 else d for i, d in enumerate(self.review["decisions"])]]:
            with self.subTest(variant=variant[0]["id"]), self.assertRaises(ValueError):
                apply_review(self.source, self.release, {**self.review, "decisions": variant})

    def test_incomplete_text_and_conflicting_rights_cannot_publish(self):
        for key in ["CAN-L-021", "CAN-L-001", "CAN-L-058"]:
            review = copy.deepcopy(self.review)
            next(d for d in review["decisions"] if d["id"] == key)["decision"] = "publish"
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "full primary text and confirmed rights"):
                apply_review(self.source, self.release, review)

    def test_held_edits_wrong_text_duplicates_and_invalid_labels_fail(self):
        for patch in [{"id": "CAN-L-053"}, {"before": "unreviewed input"}, {"field": "cap"},
                      {"after": "unlabeled-scale"}, {"reason": ""}]:
            review = copy.deepcopy(self.review)
            review["updates"][0].update(patch)
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                apply_review(self.source, self.release, review)
        with self.assertRaises(ValueError):
            apply_review(self.source, self.release, {**self.review, "updates": self.review["updates"] * 2})

    def test_counts_release_and_source_coverage_fail_closed(self):
        for patch in [{"expected_counts": {}}, {"base_release": "new-release"}, {"sources": self.review["sources"][:-1]}]:
            with self.subTest(patch=list(patch)), self.assertRaises(ValueError):
                apply_review(self.source, self.release, {**self.review, **patch})

    def test_hashes_pin_both_stages_and_public_guide_bytes(self):
        output, _, metadata = reviewed_files(self.raw, self.release, ROOT / "content/publication-review.json")
        self.assertEqual(output["guide.json"], self.raw["guide.json"])
        self.assertEqual(metadata["accepted_additions"], 70)
        for key in ["input_sha256", "output_sha256"]:
            review = {**self.review, key: {}}
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "review.json"
                path.write_text(json.dumps(review))
                with self.subTest(key=key), self.assertRaises(ValueError):
                    reviewed_files(self.raw, self.release, path)


if __name__ == "__main__":
    unittest.main()
