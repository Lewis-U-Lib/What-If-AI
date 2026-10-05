"""Add the synthesis and remix sets after curation, keeping them distinct from the
licensed collection.

The fifth data stage. Like the earlier stages it pins its input (the curated public data)
and its output, so a new release or a changed manifest needs a deliberate review. It
adds whole records rather than editing existing ones:

  tiers            the two labeled sets, each with its faculty-facing name and description.
  origin           the provenance classes the sets bring back (Hybrid Synthesis, Original
                   Synthesis), clearly separate from Licensed Adaptation.
  activities       complete public records. Each carries `tier`, its provenance class, every
                   work it draws on with the relation, the license it carries and why, and,
                   for a remix, the published activity it builds on (`par`).
  works            new source records for The Register (ids SRC-nnnn); existing sources are
                   reused when the DOI or link matches, and their activity lists are extended.
  type_ids         activities named for an AI type that has no capability key of its own.
  held             records of both sets kept out, each with its reason; none may appear.

A record that cannot surface in What If AI, lacks provenance, adapts a NoDerivatives
work, or names a source that does not link back is refused. Counts are recalculated.
"""
import copy
import hashlib
import json

from curation import CONTROLLED_CLASSES, FINDER_EXCLUDED, recount
from publication_review import encode_result, hashes

TIER_KEYS = ("synthesis", "remix")
TIER_CLASSES = {"original_synthesis", "hybrid_synthesis", "licensed_adaptation"}
ACT_FIELDS = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "disc", "ac", "ar", "hm", "icap", "st", "sc",
              "sen", "dis", "eq", "pc", "cap", "pol", "f", "fld", "ft", "gate", "dl", "na", "risk", "cls", "cr", "cit",
              "lic", "licu", "licn", "url", "attr", "chg", "rel", "gr",
              # fields only the two sets carry
              "tier", "par", "dep", "chk"}
REQUIRED = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "disc", "cap", "ac", "ar", "hm", "icap", "sen",
            "dis", "eq", "pc", "pol", "f", "gate", "dl", "cls", "cit", "lic", "licu", "licn", "chg", "rel", "tier",
            "dep", "chk"}
WORK_FIELDS = {"a", "access", "acts", "cit", "doi", "id", "lic", "link", "lt", "search", "sk", "t", "y"}
CAPS = {"text_chat", "image_generation", "audio_or_voice", "code_execution", "retrieval_grounded", "image_understanding",
        "external_retrieval", "workflow_automation", "video_generation", "none_required"}
ROLES = {"generator", "interlocutor", "evaluator", "instrument", "specimen", "withheld"}
MOVES = {"produce_first", "verify", "critique", "revise", "analyze_as_data", "constrain"}
ACTORS = {"teaching": {"student", "instructor-pedagogical"}, "admin": {"instructor-service", "library-staff"},
          "research_own": {"instructor-scholarly"}}
VOCAB = {
    "sen": {"none", "not_specified", "student_work", "student_derived_deidentified", "identifiable_student_data",
            "own_personal_data", "personal_sensitive", "identifiable_third_party", "confidential_third_party",
            "research_participant_deidentified", "restricted_institutional_data"},
    "pc": {"none", "not_specified", "human_checking_required", "institutional_approval_required", "equipment_required",
           "purchased_material", "travel_or_attendance", "account_verification"},
    "eq": {"no_tool_needed", "free_tier", "institution_provided", "paid_with_stated_alternative", "paid_required",
           "not_specified"},
    "dis": {"none_required", "informal_acknowledgement", "documented_log", "formal_statement", "anonymity_by_design",
            "not_specified"},
    "st": {"not_specified"},
    "sc": {"individual", "pair", "small_group", "whole_class", "committee_or_team", "program_or_cohort", "not_specified"},
}
ADAPTED = "Adapted from"
NO_DERIVATIVES = ("ND", "NoDeriv")


def _check_record(a, intake, families, policies, published, works):
    key = a.get("id")
    if not key or set(a) - ACT_FIELDS or REQUIRED - set(a):
        raise ValueError(f"Tier record has unknown or missing fields: {key} "
                         f"{sorted(set(a) - ACT_FIELDS)} {sorted(REQUIRED - set(a))}")
    if a["tier"] not in TIER_KEYS or a["cls"] not in TIER_CLASSES or a["cls"] not in CONTROLLED_CLASSES:
        raise ValueError(f"Tier record needs a set and a controlled provenance class: {key}")
    if a["icap"] in FINDER_EXCLUDED or a["icap"] not in {"constructive", "interactive", "not_applicable"}:
        raise ValueError(f"Tier record could never appear in What If AI: {key}")
    if a["ac"] not in ACTORS.get(a["focus"], set()) or (a["ac"] == "student") != (a["icap"] != "not_applicable"):
        raise ValueError(f"Actor, work focus and engagement disagree: {key}")
    for field in ("focus", "depth", "disc"):
        allowed = {o[0] for o in intake[field]}
        if a[field] not in allowed:
            raise ValueError(f"Unlabeled {field}: {key}")
    for field in ("task", "lvl", "mod"):
        allowed = {o[0] for o in intake[field]} | ({"any"} if field != "task" else set())
        if not isinstance(a[field], list) or not a[field] or not set(a[field]) <= allowed:
            raise ValueError(f"Unlabeled {field}: {key}")
    for field, allowed in VOCAB.items():
        values = a[field] if isinstance(a.get(field), list) else [a.get(field)]
        if not values or not set(values) <= allowed:
            raise ValueError(f"Unlabeled {field}: {key}")
    if not a["cap"] or not set(a["cap"]) <= CAPS or a["ar"] not in ROLES or a["hm"] not in MOVES:
        raise ValueError(f"Unlabeled capability, AI role or human move: {key}")
    if a["f"] not in families or a["pol"] not in policies:
        raise ValueError(f"Unlabeled family or policy position: {key}")
    if (a["ac"] == "student") == (a["pol"] == "instructor_side"):
        raise ValueError(f"Only students' activities assume a course AI policy: {key}")
    if a["tier"] == "remix" and a.get("par") not in published:
        raise ValueError(f"A remix must build on a published activity: {key}")
    if a["tier"] != "remix" and "par" in a:
        raise ValueError(f"Only a remix names a parent activity: {key}")
    if a["gr"] != 0:
        raise ValueError(f"The sets are unpiloted and rank after reported activities at equal match: {key}")
    if not a["rel"] or not a["cit"].strip() or not a["lic"] or not a["licu"]:
        raise ValueError(f"Tier record is missing provenance: {key}")
    adapted = [r for r in a["rel"] if r[1].startswith(ADAPTED)]
    if a["cls"] != "original_synthesis" and not adapted:
        raise ValueError(f"An adaptation must name what it adapts: {key}")
    if a["cls"] == "original_synthesis" and adapted:
        raise ValueError(f"An original synthesis adapts nothing: {key}")
    if adapted and not a.get("attr"):
        raise ValueError(f"Adapted sources need their attribution: {key}")
    for r in a["rel"]:
        if len(r) != 4 or r[0] not in works:
            raise ValueError(f"Unknown source relation: {key} {r[:2]}")
        if r[1].startswith(ADAPTED) and any(t in works[r[0]]["lic"] for t in NO_DERIVATIVES):
            raise ValueError(f"A NoDerivatives work cannot be adapted: {key} {r[0]}")


def apply_tiers(source, manifest):
    if manifest.get("schema") != 1:
        raise ValueError("Unknown tier schema.")
    result = copy.deepcopy(source)
    acts, reg = result["acts.json"], result["register.json"]
    published = {a["id"] for a in acts["acts"]}
    if any(a.get("tier") for a in acts["acts"]):
        raise ValueError("The curated collection already carries a set.")

    tiers = manifest["tiers"]
    if [t[0] for t in tiers] != list(TIER_KEYS) or any(len(t) != 3 or not t[1] or not t[2] for t in tiers):
        raise ValueError("The two sets need a key, a name, and a description.")
    origin_rows = manifest["origin"]
    known = {o[0] for o in acts["origin"]}
    if any(len(o) != 3 or o[0] in known or o[0] not in TIER_CLASSES for o in origin_rows):
        raise ValueError("New provenance classes must be controlled and not already described.")

    # works: new records, then links onto existing ones
    works = {w["id"]: w for w in reg["works"]}
    for w in manifest["works"]:
        if set(w) != WORK_FIELDS or not w["id"].startswith("SRC-") or w["id"] in works or w["acts"]:
            raise ValueError(f"Invalid new source record: {w.get('id')}")
        if not w["cit"] or not w["lic"] or not (w["link"] or w["doi"]):
            raise ValueError(f"A new source needs its citation, license, and a link: {w['id']}")
        works[w["id"]] = copy.deepcopy(w)

    held = {h["id"] for h in manifest["held"]}
    if any(not h.get("reason") for h in manifest["held"]) or len(held) != len(manifest["held"]):
        raise ValueError("Every held record needs one reason.")
    families = {f[0] for f in acts["families"]}
    policies = set(acts["pol"])
    added = []
    for a in manifest["activities"]:
        if a["id"] in published or a["id"] in held or a["id"] in {x["id"] for x in added}:
            raise ValueError(f"Duplicate or held tier record: {a['id']}")
        _check_record(a, acts["intake"], families, policies, published, works)
        added.append(copy.deepcopy(a))

    # every source links back, and new sources list exactly the records that cite them
    cited = {}
    for a in added:
        for r in a["rel"]:
            cited.setdefault(r[0], [])
            if a["id"] not in cited[r[0]]:
                cited[r[0]].append(a["id"])
    new_ids = {w["id"] for w in manifest["works"]}
    if set(cited) & new_ids != new_ids:
        raise ValueError("A new source is not cited by any tier record.")
    links = manifest["links"]
    if {k for k in cited if k not in new_ids} != set(links) or any(sorted(cited[k]) != links[k] for k in links):
        raise ValueError("Links onto existing sources differ from the records' relations.")
    for wid, ids in cited.items():
        works[wid]["acts"] = works[wid]["acts"] + [i for i in ids if i not in works[wid]["acts"]]

    acts["acts"] = acts["acts"] + added
    reg["works"] = reg["works"] + [works[w["id"]] for w in manifest["works"]]
    acts["origin"].extend([list(o) for o in origin_rows])
    reg["origin"].extend([list(o) + [0] for o in origin_rows])
    for key, ids in manifest["type_ids"].items():
        category = next((c for c in reg["types"]["types"] if c["key"] == key), None)
        if category is None or category["caps"] or not set(ids) <= {a["id"] for a in added}:
            raise ValueError(f"Type ids are only for a type without capability keys: {key}")
        category["ids"] = category.get("ids", []) + [i for i in ids if i not in category.get("ids", [])]
    acts["tiers"] = [list(t) for t in tiers]
    reg["tiers"] = [list(t) + [0] for t in tiers]

    recount(result)
    for t in reg["tiers"]:
        t[3] = sum(a.get("tier") == t[0] for a in acts["acts"])
    if any(a["id"] in held for a in acts["acts"]) or any(i in held for w in reg["works"] for i in w["acts"]):
        raise ValueError("A held record reached the published data.")
    counts = {**reg["counts"], "added": len(added), "new_works": len(manifest["works"]),
              "linked_works": len(links), "held": len(held),
              **{t[0]: t[3] for t in reg["tiers"]}}
    if counts != manifest["expected_counts"]:
        raise ValueError(f"Tier counts differ from the review: {counts}")
    return result


def tiered_files(raw, manifest_file):
    manifest_bytes = manifest_file.read_bytes()
    manifest = json.loads(manifest_bytes)
    if hashes(raw) != manifest["input_sha256"]:
        raise ValueError("Tier input changed; reconcile content/tiers.json with the curated data.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_tiers(source, manifest)
    output = encode_result(raw, source, result)
    if hashes(output) != manifest["output_sha256"]:
        raise ValueError("Public data with the sets differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12], "reviewed": manifest["reviewed"],
                **manifest["expected_counts"]}
    return output, manifest_bytes, metadata
