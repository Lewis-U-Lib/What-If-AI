"""Every activity must record who uses the AI tool, the No-AI limit must say what it now means,
and only activities in which AI is neither used nor discussed may be withdrawn."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from ai_use import OPERATORS, ai_use_files, apply_ai_use, no_tool_for_students
from curation import curated_files
from editorial_corrections import corrected_files
from publication_review import reviewed_files
from serial_commas import punctuated_files
from tiers import tiered_files


class AiUseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release = json.loads((ROOT / "data/release.json").read_text())
        raw, _, _ = corrected_files(ROOT / "data", release, ROOT / "content/editorial-corrections.json")
        raw, _, _ = reviewed_files(raw, release, ROOT / "content/publication-review.json")
        raw, _, _ = punctuated_files(raw, ROOT / "content/serial-comma-corrections.json")
        raw, _, _ = curated_files(raw, ROOT / "content/curation.json")
        cls.raw, _, _ = tiered_files(raw, ROOT / "content/tiers.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.manifest = json.loads((ROOT / "content/ai-use.json").read_text())
        cls.result = apply_ai_use(cls.source, cls.manifest)

    def acts(self):
        return {a["id"]: a for a in self.result["acts.json"]["acts"]}

    def refused(self, mutate, why=""):
        manifest = copy.deepcopy(self.manifest)
        mutate(manifest)
        with self.assertRaisesRegex(ValueError, why):
            apply_ai_use(self.source, manifest)

    def test_only_the_operator_field_changes_on_kept_records(self):
        before = {a["id"]: a for a in self.source["acts.json"]["acts"]}
        after = self.acts()
        withdrawn = {w["id"] for w in self.manifest["withdrawals"]["records"]}
        self.assertEqual(set(before) - set(after), withdrawn)
        for key, record in after.items():
            self.assertEqual({k: v for k, v in record.items() if k != "op"}, before[key], key)

    def test_every_activity_has_one_labeled_operator(self):
        labels = [o[0] for o in self.result["acts.json"]["operators"]]
        self.assertEqual(labels, list(OPERATORS))
        for a in self.acts().values():
            self.assertIn(a["op"], OPERATORS, a["id"])
        evidence = {k: v for k, v in self.manifest["assignments"].items() if k != "students"}
        for op, entries in evidence.items():
            for key, quote in entries.items():
                self.assertTrue(quote.strip(), key)

    def test_the_limit_admits_instructor_only_use(self):
        acts = self.acts().values()
        self.assertTrue(any(a["op"] == "faculty_or_staff" and a["ac"] == "student" and not a.get("na")
                            and no_tool_for_students(a) == "confirmed" for a in acts))
        for a in acts:
            if a["op"] == "students" and not a.get("na"):
                self.assertEqual(no_tool_for_students(a), "excluded", a["id"])
            if a["op"] == "not_specified" and not a.get("na"):
                self.assertEqual(no_tool_for_students(a), "unknown", a["id"])
        limit = next(l for l in self.result["acts.json"]["limits"] if l[0] == "noai")
        self.assertEqual(limit[1], "My students won’t use an AI tool themselves")
        card = self.result["register.json"]["types"]["no_ai"]
        self.assertEqual(card["n"], sum(no_tool_for_students(a) == "confirmed" for a in acts))

    def test_withdrawals_leave_nothing_behind(self):
        withdrawn = {w["id"] for w in self.manifest["withdrawals"]["records"]}
        self.assertTrue(withdrawn)
        reg = self.result["register.json"]
        self.assertFalse(any(withdrawn & set(w["acts"]) for w in reg["works"]))
        self.assertTrue(all(w["acts"] for w in reg["works"]))
        self.assertFalse(any(withdrawn & set(t.get("ids", [])) for t in reg["types"]["types"]))
        self.assertEqual(reg["counts"]["activities"], len(self.acts()))

    def test_refuses_unreviewed_or_unsafe_changes(self):
        students = lambda m: m["assignments"]["students"]
        first_none = next(iter(self.manifest["assignments"]["none"]))
        # an activity with no value, with two values, with an unknown value, or a value without evidence
        self.refused(lambda m: students(m).pop())
        self.refused(lambda m: m["assignments"]["none"].update({students(m)[0]: "duplicate"}))
        self.refused(lambda m: m["assignments"].update(unclear={}))
        self.refused(lambda m: m["assignments"]["none"].update({first_none: " "}))
        self.refused(lambda m: m["operators"].pop())
        # a withdrawal of a record that mentions AI, of a remix parent, of a set record, or without evidence
        record = lambda i, **k: {"id": i, "reason": "test", "evidence": ["test"], **k}
        self.refused(lambda m: m["withdrawals"]["records"].append(record("CAN-L-040")), "mentions AI")
        self.refused(lambda m: m["withdrawals"]["records"].append(record("CAN-L-043")), "builds on this one")
        self.refused(lambda m: m["withdrawals"]["records"].append(record("WIA-S-HUM-B-06")), "published activity")
        self.refused(lambda m: m["withdrawals"]["records"][0].update(evidence=[]))
        self.refused(lambda m: m["withdrawals"].update(rule="other"))
        # text that does not match the reviewed before, and counts that differ
        self.refused(lambda m: m["limit"]["before"].__setitem__(0, "Something else"))
        self.refused(lambda m: m["no_ai_type"]["before"].update(name="Something else"))
        self.refused(lambda m: m["expected_counts"].update(withdrawn=0))

    def test_pinned_input_and_output(self):
        _, _, metadata = ai_use_files(self.raw, ROOT / "content/ai-use.json")
        self.assertEqual(metadata["activities"], self.manifest["expected_counts"]["activities"])
        tampered = dict(self.raw)
        tampered["guide.json"] = self.raw["guide.json"] + b" "
        with self.assertRaises(ValueError):
            ai_use_files(tampered, ROOT / "content/ai-use.json")


if __name__ == "__main__":
    unittest.main()
