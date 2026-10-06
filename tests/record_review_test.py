"""The record review may change only what it names, with the value it replaces and its evidence;
withdrawn and held records must leave nothing behind; and who uses AI, the tool needed, and the AI
role must agree on every published record."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from ai_use import ai_use_files, no_tool_for_students
from curation import curated_files
from editorial_corrections import corrected_files
from publication_review import reviewed_files
from record_review import RULES, apply_record_review, record_review_files
from serial_commas import punctuated_files
from tiers import tiered_files


class RecordReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release = json.loads((ROOT / "data/release.json").read_text())
        raw, _, _ = corrected_files(ROOT / "data", release, ROOT / "content/editorial-corrections.json")
        raw, _, _ = reviewed_files(raw, release, ROOT / "content/publication-review.json")
        raw, _, _ = punctuated_files(raw, ROOT / "content/serial-comma-corrections.json")
        raw, _, _ = curated_files(raw, ROOT / "content/curation.json")
        raw, _, _ = tiered_files(raw, ROOT / "content/tiers.json")
        cls.raw, _, _ = ai_use_files(raw, ROOT / "content/ai-use.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.manifest = json.loads((ROOT / "content/record-review.json").read_text())
        cls.result = apply_record_review(cls.source, cls.manifest)

    def acts(self):
        return {a["id"]: a for a in self.result["acts.json"]["acts"]}

    def removed(self):
        return {w["id"] for w in self.manifest["withdrawals"]["records"]} | {h["id"] for h in self.manifest["held"]}

    def refused(self, mutate, why=""):
        manifest = copy.deepcopy(self.manifest)
        mutate(manifest)
        with self.assertRaisesRegex(ValueError, why):
            apply_record_review(self.source, manifest)

    def test_kept_records_change_only_where_reviewed(self):
        before = {a["id"]: a for a in self.source["acts.json"]["acts"]}
        after = self.acts()
        self.assertEqual(set(before) - set(after), self.removed())
        named = {(e["id"], e["field"]) for e in self.manifest["corrections"] + self.manifest["text_edits"]}
        for key, record in after.items():
            for field in set(record) | set(before[key]):
                if record.get(field) != before[key].get(field):
                    self.assertIn((key, field), named, f"{key}.{field} changed without a review entry")
        for e in self.manifest["corrections"]:
            if e["id"] in after:
                self.assertEqual(after[e["id"]][e["field"]], e["after"], e["id"])
            self.assertTrue(e["reason"].strip() and e["evidence"].strip(), e["id"])

    def test_removed_records_leave_nothing_behind(self):
        gone = self.removed()
        self.assertTrue(gone)
        reg = self.result["register.json"]
        self.assertFalse(gone & set(self.acts()))
        self.assertFalse(any(gone & set(w["acts"]) for w in reg["works"]))
        self.assertTrue(all(w["acts"] for w in reg["works"]))
        self.assertFalse(any(gone & set(t.get("ids", [])) for t in reg["types"]["types"]))
        self.assertFalse(any(a.get("par") in gone for a in self.acts().values()))
        self.assertEqual(reg["counts"], {"activities": len(self.acts()), "works": len(reg["works"])})
        self.assertEqual({t[0]: t[3] for t in reg["tiers"]},
                         {k: sum(a.get("tier") == k for a in self.acts().values()) for k in ("synthesis", "remix")})
        self.assertEqual(reg["types"]["no_ai"]["n"],
                         sum(no_tool_for_students(a) == "confirmed" for a in self.acts().values()))

    def test_withdrawals_and_holds_carry_their_reasons(self):
        for w in self.manifest["withdrawals"]["records"]:
            self.assertTrue(w["reason"] and w["evidence"], w["id"])
            self.assertFalse(w["id"].startswith("WIA-"), w["id"])
        for h in self.manifest["held"]:
            self.assertIn(h["category"], {"source_access", "license", "parent_removed"}, h["id"])
            self.assertTrue(h["reason"].strip(), h["id"])

    def test_every_published_record_is_consistent(self):
        for name, rule in RULES.items():
            failing = [a["id"] for a in self.acts().values() if not rule(a)]
            waiting = [p["id"] for p in self.manifest["consistency"]["pending"].get(name, [])]
            self.assertEqual(sorted(failing), sorted(waiting), name)

    def test_refuses_unreviewed_or_unsafe_changes(self):
        fix = lambda m, i: m["corrections"][i]
        # a correction whose before does not match, a field outside the list, a value outside its vocabulary,
        # or a correction without evidence
        self.refused(lambda m: fix(m, 0).update(before="something else"), "does not match")
        self.refused(lambda m: m["corrections"].append({"id": "CAN-L-040", "field": "id", "before": "CAN-L-040",
                                                        "after": "X", "reason": "r", "evidence": "e"}), "Invalid")
        self.refused(lambda m: next(e for e in m["corrections"] if e["field"] == "sen").update(after="secret"), "Unlabeled")
        self.refused(lambda m: next(e for e in m["corrections"] if e["field"] == "cap").update(after=["telepathy"]), "Unlabeled")
        self.refused(lambda m: fix(m, 0).update(evidence=" "), "reason and evidence")
        self.refused(lambda m: m["text_edits"][0].update(count=99), "mismatch")
        self.refused(lambda m: m["work_fields"][0].update(before="something else"), "does not match")
        # a withdrawal without the editorial marker, of a set record, or listed twice
        record = lambda i: {"id": i, "reason": "test", "evidence": "test"}
        self.refused(lambda m: m["withdrawals"]["records"].append(record("CAN-L-040")), "specified editorially")
        self.refused(lambda m: m["withdrawals"]["records"].append(record("WIA-R-CONV-06")), "licensed collection")
        self.refused(lambda m: m["held"].append({"id": m["withdrawals"]["records"][0]["id"], "category": "license",
                                                 "reason": "twice"}), "twice")
        self.refused(lambda m: m["withdrawals"].update(rule="other"))
        # a hold without a reason or category, and a remix left published on a removed parent
        self.refused(lambda m: m["held"][0].update(reason=""), "reason")
        self.refused(lambda m: m["held"][0].update(category="other"), "category")
        self.refused(lambda m: m["held"].__setitem__(slice(None), [h for h in m["held"] if h["category"] != "parent_removed"]),
                     "remix")
        # a published record that breaks a consistency rule, or a pending entry that no longer fails
        target = next(a for a in self.acts().values() if a["op"] == "students" and a["cap"] == ["text_chat"]
                      and not any(e["id"] == a["id"] for e in self.manifest["corrections"]))
        self.refused(lambda m: m["corrections"].append({"id": target["id"], "field": "op", "before": "students",
                                                        "after": "none", "reason": "r", "evidence": "e"}),
                     "no_operator_no_tool")
        self.refused(lambda m: m["consistency"]["pending"].update(no_operator_no_tool=[{"id": "CAN-L-040", "note": "n"}]),
                     "now pass")
        self.refused(lambda m: m["consistency"]["rules"].pop(), "rules")
        # a flag that names nothing that exists, and counts that differ
        self.refused(lambda m: m["flags"].append({"category": "x", "note": "n", "records": ["NOPE"]}), "does not exist")
        self.refused(lambda m: m["expected_counts"].update(held=0), "counts")

    def test_pinned_input_and_output(self):
        _, _, metadata = record_review_files(self.raw, ROOT / "content/record-review.json")
        self.assertEqual(metadata["activities"], self.manifest["expected_counts"]["activities"])
        tampered = dict(self.raw)
        tampered["guide.json"] = self.raw["guide.json"] + b" "
        with self.assertRaises(ValueError):
            record_review_files(tampered, ROOT / "content/record-review.json")


if __name__ == "__main__":
    unittest.main()
