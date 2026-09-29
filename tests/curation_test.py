"""Curation must keep provenance intact, refuse unreviewed changes, and never publish an
activity that What If AI could not show."""
import copy
import json
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from curation import CONTROLLED_CLASSES, FINDER_EXCLUDED, apply_curation, curated_files
from editorial_corrections import corrected_files
from publication_review import reviewed_files
from serial_commas import punctuated_files


class CurationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        release = json.loads((ROOT / "data/release.json").read_text())
        raw, _, _ = corrected_files(ROOT / "data", release, ROOT / "content/editorial-corrections.json")
        raw, _, _ = reviewed_files(raw, release, ROOT / "content/publication-review.json")
        cls.raw, _, _ = punctuated_files(raw, ROOT / "content/serial-comma-corrections.json")
        cls.source = {n: json.loads(b) for n, b in cls.raw.items()}
        cls.review = json.loads((ROOT / "content/curation.json").read_text())
        cls.result = apply_curation(cls.source, cls.review)

    def acts(self):
        return {a["id"]: a for a in self.result["acts.json"]["acts"]}

    def test_every_published_activity_can_surface_in_what_if_ai(self):
        acts = self.acts()
        self.assertEqual(len(acts), 779)
        self.assertFalse([k for k, a in acts.items() if a["icap"] in FINDER_EXCLUDED])
        for key in self.review["withdrawals"]["ids"]:
            self.assertNotIn(key, acts)
            self.assertFalse(any(key in w["acts"] for w in self.result["register.json"]["works"]))
        self.assertTrue(all(w["acts"] for w in self.result["register.json"]["works"]))
        self.assertEqual(self.result["register.json"]["counts"], {"activities": 779, "works": 309})

    def test_provenance_vocabulary_is_controlled_and_the_use_fact_survives(self):
        acts = self.acts()
        self.assertTrue(all(a["cls"] in CONTROLLED_CLASSES for a in acts.values()))
        self.assertEqual({a["id"] for a in acts.values() if a.get("use") == "unreported"}, set(self.review["reclassify"]["ids"]))
        for table in (self.result["acts.json"]["origin"], self.result["register.json"]["origin"]):
            self.assertEqual([o[0] for o in table], ["licensed_adaptation"])
        # nothing else about a reclassified record changes
        before = {a["id"]: a for a in self.source["acts.json"]["acts"]}
        touched = {e["id"] for e in self.review["activity_fields"] + self.review["text_corrections"]}
        for key in set(self.review["reclassify"]["ids"]) - touched:
            a, b = dict(before[key]), dict(acts[key])
            a.pop("cls"); b.pop("cls"); b.pop("use")
            self.assertEqual(a, b, key)

    def test_licenses_are_recorded_as_the_source_states_them(self):
        works = {w["id"]: w for w in self.result["register.json"]["works"]}
        original_textgened = [a for a in self.acts().values() if any(r[0] == "CSR-0205" for r in a["rel"])]
        self.assertEqual(len(original_textgened), 33)
        for a in original_textgened:
            self.assertEqual((a["lic"], a["licu"]), ("CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0/"))
            self.assertNotIn("version not stated", a["attr"])
            for source_id, *_ in a["rel"]:
                self.assertEqual(works[source_id]["lic"], "CC BY-NC 4.0")
        for a in self.acts().values():
            if "version not stated" in a.get("attr", "") and "TextGenEd" in a["attr"]:
                self.assertEqual(a["lic"], "CC BY-NC (version not stated)", a["id"])
                self.assertNotIn("licu", a)
            if "IGO" in a.get("attr", ""):
                self.assertEqual((a["lic"], a["licu"]), ("CC BY-SA 3.0 IGO", "https://creativecommons.org/licenses/by-sa/3.0/igo/"))
            m = re.fullmatch(r"CC (BY(?:-NC)?(?:-SA)?) (\d\.\d)(?: IGO)?", a["lic"])
            if m:
                self.assertTrue(a["licu"].startswith(f"https://creativecommons.org/licenses/{m[1].lower()}/{m[2]}/"), a["id"])
            self.assertNotIn("personal/classroom", a.get("attr", "") + a["lic"], a["id"])
        self.assertFalse([w["id"] for w in works.values() if not w["lic"] or not w["t"]])
        self.assertEqual(works["CSR-0400"]["doi"], "10.5281/zenodo.7316682")
        self.assertEqual(works["CSR-0320"]["link"], "https://discoursedepot.org/about/syllabus")

    def test_unreviewed_or_stale_changes_fail(self):
        def broken(mutate):
            review = copy.deepcopy(self.review)
            mutate(review)
            return review
        cases = [
            lambda r: r["withdrawals"]["ids"].append(next(a["id"] for a in self.source["acts.json"]["acts"] if a["icap"] == "constructive")),
            lambda r: r["withdrawals"]["ids"].pop(),                       # an unreachable activity would stay published
            lambda r: r["reclassify"].update(to="prompt_specification"),
            lambda r: r["reclassify"]["ids"].pop(),
            lambda r: r["activity_fields"][0].update(before="stale"),
            lambda r: r["activity_fields"][0].update(field="task"),
            lambda r: r["activity_fields"][0].update(reason=""),
            lambda r: r["work_fields"].append(r["work_fields"][0]),
            lambda r: r["text_corrections"][0].update(count=2),
            lambda r: r["expected_counts"].update(activities=815),
        ]
        for i, mutate in enumerate(cases):
            with self.subTest(case=i), self.assertRaises(ValueError):
                apply_curation(self.source, broken(mutate))

    def test_input_and_output_are_pinned(self):
        path = ROOT / "content/curation.json"
        with self.assertRaisesRegex(ValueError, "input changed"):
            curated_files({**self.raw, "acts.json": self.raw["acts.json"] + b" "}, path)
        output, _, metadata = curated_files(self.raw, path)
        self.assertEqual(output["guide.json"], self.raw["guide.json"])
        self.assertEqual((metadata["activities"], metadata["works"], metadata["withdrawn"]), (779, 309, 36))


if __name__ == "__main__":
    unittest.main()
