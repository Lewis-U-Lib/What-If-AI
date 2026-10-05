"""The two labeled sets must arrive with complete provenance, stay distinct from the licensed
collection, refuse unreviewed changes, and never publish a held record."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from curation import curated_files
from editorial_corrections import corrected_files
from publication_review import reviewed_files
from serial_commas import punctuated_files
from tiers import apply_tiers, tiered_files


class TierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release = json.loads((ROOT / "data/release.json").read_text())
        raw, _, _ = corrected_files(ROOT / "data", release, ROOT / "content/editorial-corrections.json")
        raw, _, _ = reviewed_files(raw, release, ROOT / "content/publication-review.json")
        raw, _, _ = punctuated_files(raw, ROOT / "content/serial-comma-corrections.json")
        cls.raw, _, _ = curated_files(raw, ROOT / "content/curation.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.manifest = json.loads((ROOT / "content/tiers.json").read_text())
        cls.result = apply_tiers(cls.source, cls.manifest)

    def acts(self):
        return {a["id"]: a for a in self.result["acts.json"]["acts"]}

    def refused(self, mutate):
        manifest = copy.deepcopy(self.manifest)
        mutate(manifest)
        with self.assertRaises(ValueError):
            apply_tiers(self.source, manifest)

    def test_licensed_collection_is_untouched(self):
        before = {a["id"]: a for a in self.source["acts.json"]["acts"]}
        after = self.acts()
        for key, record in before.items():
            self.assertEqual(record, after[key], key)
        self.assertEqual(len(before), 779)
        self.assertEqual(len(after), 779 + self.manifest["expected_counts"]["added"])

    def test_every_set_record_is_labeled_and_traceable(self):
        works = {w["id"]: w for w in self.result["register.json"]["works"]}
        tiers = {t[0] for t in self.result["acts.json"]["tiers"]}
        for a in self.acts().values():
            if a["cls"] in ("hybrid_synthesis", "original_synthesis"):
                self.assertIn(a.get("tier"), tiers, a["id"])
            if not a.get("tier"):
                continue
            self.assertTrue(a["rel"] and a["cit"] and a["lic"] and a["licn"], a["id"])
            for r in a["rel"]:
                self.assertIn(a["id"], works[r[0]]["acts"], a["id"])
        origin = [o[0] for o in self.result["register.json"]["origin"]]
        self.assertEqual(origin, ["licensed_adaptation", "hybrid_synthesis", "original_synthesis"])
        counts = {t[0]: t[3] for t in self.result["register.json"]["tiers"]}
        self.assertEqual(counts, {"synthesis": self.manifest["expected_counts"]["synthesis"],
                                  "remix": self.manifest["expected_counts"]["remix"]})

    def test_held_records_stay_out(self):
        held = {h["id"] for h in self.manifest["held"]}
        self.assertTrue(held)
        self.assertFalse(held & set(self.acts()))
        self.assertFalse(any(held & set(w["acts"]) for w in self.result["register.json"]["works"]))

    def test_types_without_capability_keys_count_their_records(self):
        types = {t["key"]: t for t in self.result["register.json"]["types"]["types"]}
        for key, ids in self.manifest["type_ids"].items():
            self.assertTrue(set(ids) <= set(types[key]["ids"]))
            self.assertGreaterEqual(types[key]["n"], len(ids))

    def test_refuses_unreviewed_or_unsafe_changes(self):
        first = lambda m: m["activities"][0]
        self.refused(lambda m: first(m).pop("tier"))
        self.refused(lambda m: first(m).update(tier="other"))
        self.refused(lambda m: first(m).update(icap="passive"))
        self.refused(lambda m: first(m).update(cls="source_uncertain"))
        self.refused(lambda m: first(m).update(rel=[]))
        self.refused(lambda m: first(m).update(gr=3))
        self.refused(lambda m: first(m).update(review="internal note"))
        self.refused(lambda m: m["activities"].append(copy.deepcopy(m["activities"][0])))
        self.refused(lambda m: m["activities"].append(dict(m["activities"][0], id=m["held"][0]["id"])))
        remix = next(i for i, a in enumerate(self.manifest["activities"]) if a["tier"] == "remix")
        self.refused(lambda m: m["activities"][remix].update(par="CAN-NOT-PUBLISHED"))
        self.refused(lambda m: m["expected_counts"].update(added=1))
        self.refused(lambda m: m["works"].append(dict(m["works"][0], id="SRC-9999")))

    def test_nothing_derivative_is_adapted(self):
        works = {w["id"]: w for w in self.result["register.json"]["works"]}
        for a in self.acts().values():
            for r in a["rel"] if a.get("tier") else []:
                if r[1].startswith("Adapted from"):
                    self.assertNotIn("ND", works[r[0]]["lic"], a["id"])

    def test_pinned_input_and_output(self):
        output, _, metadata = tiered_files(self.raw, ROOT / "content/tiers.json")
        self.assertEqual(metadata["activities"], self.manifest["expected_counts"]["activities"])
        tampered = dict(self.raw)
        tampered["guide.json"] = self.raw["guide.json"] + b" "
        with self.assertRaises(ValueError):
            tiered_files(tampered, ROOT / "content/tiers.json")


if __name__ == "__main__":
    unittest.main()
