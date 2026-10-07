"""Apply the record review after the AI-use stage: reviewed corrections, holds, withdrawals of
activities whose AI step was added editorially, and the consistency checks every published
record must pass.

The seventh data stage. Like the earlier stages it pins its input (the data with its sets and
AI-use review) and its output, so a new release, an earlier stage, or a changed review needs a
deliberate reconciliation. It applies, in this order:

  text           exact replacements of page text that lives in the data (the Register's type
                 intro, a limit's help text, a type card), each with its reason.
  corrections    whole-value replacements of activity fields. Each names the value it
                 replaces, the reason, and the evidence (a source passage or locator).
                 Controlled fields are checked against their vocabularies.
  text_edits     substring corrections of activity prose with exact occurrence counts, each
                 with its reason and evidence.
  work_fields    whole-value replacements of source records in The Register, with evidence.
  withdrawals    activities whose only AI step was specified editorially on a source that does
                 not involve AI. The rule is re-checked against the record's change note.
  held           records kept out of both tools until a person settles a question, each with a
                 category and a reason. A held record stays intact in the earlier stages, so
                 releasing it means deleting its entry here.
  source access  a correction may add `sa` to a record that uses a source item as published, by
                 link, when that item is not openly licensed: `not_open` (no clear open license),
                 `unmodified` (may be shared but not adapted), or `restricted` (a purchase,
                 membership, subscription, or permission is needed). Both tools show it, and the
                 payment and purchase limits never confirm a `restricted` record.
  flags          questions recorded for a reviewer. They do not change the publication; each
                 names records or sources that exist in the input.
  consistency    rules every published record must satisfy, and the records still pending a
                 decision under each rule. A pending record must still fail its rule, so the
                 list can only shrink.

A remix must build on a published activity, so a remix whose parent is removed must be held
too. Works emptied by a removal are removed and every derived count is recalculated.
"""
import copy
import hashlib
import json

from ai_use import OPERATORS, no_tool_for_students
from curation import recount
from publication_review import encode_result, hashes
from tiers import CAPS, MOVES, ROLES, VOCAB

TEXT_FILES = {"acts.json", "register.json"}
CODED = {"sen", "pc", "eq", "dis", "cap", "op", "ar", "hm", "pol", "disc", "icap", "sa"}
SOURCE_ACCESS = {"not_open", "unmodified", "restricted"}
WITHDRAWAL_STATUS = {"provisional"}
FREE = {"t", "sum", "gate", "risk", "chg", "na", "dl", "evs", "loc", "url", "cit", "attr", "lic", "licu",
        "licn", "lics", "ft", "fld", "tool", "srp", "miss", "ad", "rf"}
PROSE = {"t", "sum", "gate", "risk", "chg", "na", "dl", "evs", "loc", "url", "cit", "attr", "licn", "lics",
         "ad", "rf"}
WORK_FIELDS = {"a", "t", "y", "cit", "lic", "link", "doi", "sk"}
HELD_CATEGORIES = {"source_access", "license", "parent_removed"}
EDITORIAL_AI = "AI role and deliverable specified editorially"
ICAPS = {"constructive", "interactive", "not_applicable", "requires_review"}
MISSING = None


def _rule_no_operator_no_tool(a):
    """No one operates an AI tool, so no AI capability is needed."""
    return a.get("op") != "none" or a.get("cap") == ["none_required"]


def _rule_no_tool_no_operator(a):
    """A record that needs no AI tool says that no one operates one, and lists nothing else."""
    caps = a.get("cap") or []
    return "none_required" not in caps or (caps == ["none_required"] and a.get("op") == "none")


def _rule_withheld_not_students(a):
    """An AI tool kept out of the activity is not one that students operate."""
    return a.get("ar") != "withheld" or a.get("op") != "students"


def _rule_source_access_has_item(a):
    """A source-access label describes an item the activity uses as published."""
    return "sa" not in a or any(r[1].startswith("Used unmodified") for r in a.get("rel") or [])


RULES = {
    "no_operator_no_tool": _rule_no_operator_no_tool,
    "no_tool_no_operator": _rule_no_tool_no_operator,
    "withheld_not_students": _rule_withheld_not_students,
    "source_access_has_item": _rule_source_access_has_item,
}


def _explained(edit, where, evidence=True):
    if not str(edit.get("reason") or "").strip() or (evidence and not str(edit.get("evidence") or "").strip()):
        raise ValueError(f"Record review edit needs a reason and evidence: {where}")


def _check_value(field, value, acts, where):
    """Controlled fields must stay inside their vocabularies."""
    if field in VOCAB and field != "st":
        if value not in VOCAB[field]:
            raise ValueError(f"Unlabeled {field}: {where}")
    elif field == "cap":
        if not isinstance(value, list) or not value or not set(value) <= CAPS or len(set(value)) != len(value):
            raise ValueError(f"Unlabeled capability: {where}")
    elif field == "op":
        if value not in OPERATORS:
            raise ValueError(f"Unlabeled operator: {where}")
    elif field == "ar":
        if value not in ROLES:
            raise ValueError(f"Unlabeled AI role: {where}")
    elif field == "hm":
        if value not in MOVES:
            raise ValueError(f"Unlabeled human move: {where}")
    elif field == "pol":
        if value not in acts["pol"]:
            raise ValueError(f"Unlabeled policy position: {where}")
    elif field == "disc":
        if value not in {o[0] for o in acts["intake"]["disc"]} | {""}:
            raise ValueError(f"Unlabeled field: {where}")
    elif field == "icap":
        if value not in ICAPS:
            raise ValueError(f"Unlabeled engagement class: {where}")
    elif field == "sa":
        if value not in SOURCE_ACCESS:
            raise ValueError(f"Unlabeled source access: {where}")
    elif field in PROSE and value is not MISSING and (not isinstance(value, str) or not value.strip()):
        raise ValueError(f"Prose must be text: {where}")


def _set(record, field, before, after, where):
    if record.get(field, MISSING) != before or before == after:
        raise ValueError(f"Record review target does not match the reviewed value: {where}")
    if after is MISSING:
        record.pop(field, None)
    else:
        record[field] = copy.deepcopy(after)


def _resolve(root, path, where):
    node = root
    for step in path[:-1]:
        if isinstance(node, list):
            if not isinstance(step, int) or not 0 <= step < len(node):
                raise ValueError(f"Unknown text path: {where}")
            node = node[step]
        elif isinstance(node, dict):
            if not isinstance(step, str) or step not in node:
                raise ValueError(f"Unknown text path: {where}")
            node = node[step]
        else:
            raise ValueError(f"Unknown text path: {where}")
    last = path[-1]
    if isinstance(node, list) and isinstance(last, int) and 0 <= last < len(node):
        return node, last
    if isinstance(node, dict) and isinstance(last, str) and last in node:
        return node, last
    raise ValueError(f"Unknown text path: {where}")


def apply_record_review(source, review, check_counts=True):
    if review.get("schema") != 1:
        raise ValueError("Unknown record review schema.")
    result = copy.deepcopy(source)
    acts, reg = result["acts.json"], result["register.json"]
    records = {a["id"]: a for a in acts["acts"]}
    if any("op" not in a for a in acts["acts"]):
        raise ValueError("The record review runs after every activity records who uses the AI tool.")

    # 1 · page text held in the data
    seen = set()
    for edit in review["text"]:
        where = (edit.get("file"), tuple(edit.get("path") or ()))
        if where in seen or edit.get("file") not in TEXT_FILES or not edit.get("path"):
            raise ValueError(f"Invalid or duplicate text target: {where}")
        seen.add(where)
        _explained(edit, where, evidence=False)
        node, key = _resolve(result[edit["file"]], edit["path"], where)
        before, after = edit["before"], edit["after"]
        if node[key] != before or before == after or not isinstance(after, type(before)) or not after:
            raise ValueError(f"Text does not match the reviewed value: {where}")
        node[key] = copy.deepcopy(after)

    # 2 · whole-value field corrections
    seen = set()
    for edit in review["corrections"]:
        key, field = edit.get("id"), edit.get("field")
        where = (key, field)
        if where in seen or key not in records or field not in CODED | FREE:
            raise ValueError(f"Invalid or duplicate correction target: {where}")
        seen.add(where)
        _explained(edit, where)
        _check_value(field, edit["after"], acts, where)
        _set(records[key], field, edit["before"], edit["after"], where)

    # 3 · substring corrections of prose
    seen_text = set()
    for edit in review["text_edits"]:
        key, field = edit.get("id"), edit.get("field")
        where = (key, field, edit.get("before"))
        if where in seen_text or key not in records or field not in PROSE or (key, field) in seen:
            raise ValueError(f"Invalid or duplicate prose correction: {where}")
        seen_text.add(where)
        _explained(edit, where)
        value, before, after, count = records[key].get(field), edit["before"], edit["after"], edit["count"]
        if (not isinstance(value, str) or not isinstance(before, str) or not before or not isinstance(after, str)
                or before == after or type(count) is not int or count < 1 or value.count(before) != count):
            raise ValueError(f"Prose correction text/count mismatch: {where}")
        records[key][field] = value.replace(before, after)
        _check_value(field, records[key][field], acts, where)

    # 4 · source records
    works = {w["id"]: w for w in reg["works"]}
    seen = set()
    for edit in review["work_fields"]:
        key, field = edit.get("id"), edit.get("field")
        where = (key, field)
        if where in seen or key not in works or field not in WORK_FIELDS:
            raise ValueError(f"Invalid or duplicate source correction: {where}")
        seen.add(where)
        _explained(edit, where)
        if not isinstance(edit["after"], str) or (field in {"t", "cit", "lic", "link"} and not edit["after"].strip()):
            raise ValueError(f"A source keeps its title, citation, license and link: {where}")
        _set(works[key], field, edit["before"], edit["after"], where)

    # 5 · withdrawals and holds
    w = review["withdrawals"]
    if w.get("rule") != "editorial_ai" or not w.get("reason"):
        raise ValueError("Withdrawals need the editorial_ai rule and its reason.")
    withdrawn = [x.get("id") for x in w["records"]]
    for x in w["records"]:
        a = records.get(x.get("id"))
        if a is None or a.get("tier"):
            raise ValueError(f"A withdrawal must name a published activity from the licensed collection: {x.get('id')}")
        _explained(x, x["id"])
        if x.get("status") is not None and x["status"] not in WITHDRAWAL_STATUS:
            raise ValueError(f"Unknown withdrawal status: {x['id']}")
        if EDITORIAL_AI not in (a.get("chg") or ""):
            raise ValueError(f"The change note does not say the AI step was specified editorially: {x['id']}")
    held = [h.get("id") for h in review["held"]]
    for h in review["held"]:
        if h.get("id") not in records or h.get("category") not in HELD_CATEGORIES or not str(h.get("reason") or "").strip():
            raise ValueError(f"Every held record needs a published record, a category, and a reason: {h.get('id')}")
    removed = withdrawn + held
    if len(set(removed)) != len(removed):
        raise ValueError("A record is withdrawn or held twice.")
    gone = set(removed)
    for h in review["held"]:
        parent = records[h["id"]].get("par")
        if (h["category"] == "parent_removed") != (parent in gone):
            raise ValueError(f"Only a remix whose parent is removed is held for that reason: {h['id']}")
    acts["acts"] = [a for a in acts["acts"] if a["id"] not in gone]
    if any(a.get("par") in gone for a in acts["acts"]):
        raise ValueError("A published remix builds on a removed activity; hold it too.")
    if any(a.get("var") in gone for a in acts["acts"]):
        raise ValueError("A published activity points to a removed variation.")
    kept = []
    for work in reg["works"]:
        linked = work["acts"]
        work["acts"] = [key for key in linked if key not in gone]
        if work["acts"] or not (set(linked) & gone):
            kept.append(work)
    reg["works"] = kept
    records = {a["id"]: a for a in acts["acts"]}

    # 6 · flags change nothing, but must name what exists
    all_ids = {a["id"] for a in source["acts.json"]["acts"]}
    all_works = {x["id"] for x in source["register.json"]["works"]}
    for f in review["flags"]:
        if not f.get("category") or not str(f.get("note") or "").strip() or not (f.get("records") or f.get("works")):
            raise ValueError(f"A flag needs a category, a note, and what it concerns: {f.get('category')}")
        if not set(f.get("records") or []) <= all_ids or not set(f.get("works") or []) <= all_works:
            raise ValueError(f"A flag names a record or source that does not exist: {f['category']}")

    # 7 · consistency
    pending = review["consistency"]["pending"]
    if set(review["consistency"]["rules"]) != set(RULES) or not set(pending) <= set(RULES):
        raise ValueError("The consistency rules differ from the reviewed set.")
    for name, rule in RULES.items():
        waiting = {p["id"] for p in pending.get(name, [])}
        if any(not str(p.get("note") or "").strip() for p in pending.get(name, [])):
            raise ValueError(f"A pending record needs a note: {name}")
        failing = {a["id"] for a in acts["acts"] if not rule(a)}
        if failing - waiting:
            raise ValueError(f"Published records fail {name}: {sorted(failing - waiting)}")
        if waiting - failing:
            raise ValueError(f"Records listed as pending under {name} now pass or are gone; remove them: "
                             f"{sorted(waiting - failing)}")

    recount(result)
    for t in reg.get("tiers") or []:
        t[3] = sum(a.get("tier") == t[0] for a in acts["acts"])
    reg["types"]["no_ai"]["n"] = sum(no_tool_for_students(a) == "confirmed" for a in acts["acts"])
    counts = {**reg["counts"], "withdrawn": len(withdrawn), "held": len(held),
              **{c: sum(h["category"] == c for h in review["held"]) for c in sorted(HELD_CATEGORIES)},
              "works_removed": len(source["register.json"]["works"]) - len(reg["works"]),
              "corrected_fields": len(review["corrections"]) + len(review["text_edits"]),
              "corrected_activities": len({e["id"] for e in review["corrections"] + review["text_edits"]}),
              "source_fields": len(review["work_fields"]), "text": len(review["text"]),
              "flagged_records": len({i for f in review["flags"] for i in f.get("records") or []}),
              **{op: sum(a["op"] == op for a in acts["acts"]) for op in OPERATORS},
              "students_use_no_tool": reg["types"]["no_ai"]["n"],
              **{"source_" + v: sum(a.get("sa") == v for a in acts["acts"]) for v in sorted(SOURCE_ACCESS)}}
    if check_counts and counts != review["expected_counts"]:
        raise ValueError(f"Record review counts differ from the review: {counts}")
    if not check_counts:
        review["expected_counts"] = counts
    return result


def record_review_files(raw, review_file):
    manifest_bytes = review_file.read_bytes()
    review = json.loads(manifest_bytes)
    if hashes(raw) != review["input_sha256"]:
        raise ValueError("Record review input changed; reconcile content/record-review.json with the AI-use output.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_record_review(source, review)
    output = encode_result(raw, source, result)
    if hashes(output) != review["output_sha256"]:
        raise ValueError("Public data after the record review differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12], "reviewed": review["reviewed"],
                **review["expected_counts"]}
    return output, manifest_bytes, metadata


def pin(manifest_file):
    """After a reviewed edit to the manifest, recompute its pinned input, counts, and output.

    Run `python3 tools/record_review.py --pin` from the repository root, then check the diff: only
    the entries you edited, the counts, and the hashes should change."""
    import pathlib
    from curation import curated_files
    from editorial_corrections import corrected_files
    from publication_review import reviewed_files
    from serial_commas import punctuated_files
    from tiers import tiered_files
    from ai_use import ai_use_files
    root = pathlib.Path(manifest_file).resolve().parent.parent
    release = json.loads((root / "data/release.json").read_text())
    raw, _, _ = corrected_files(root / "data", release, root / "content/editorial-corrections.json")
    raw, _, _ = reviewed_files(raw, release, root / "content/publication-review.json")
    raw, _, _ = punctuated_files(raw, root / "content/serial-comma-corrections.json")
    raw, _, _ = curated_files(raw, root / "content/curation.json")
    raw, _, _ = tiered_files(raw, root / "content/tiers.json")
    raw, _, _ = ai_use_files(raw, root / "content/ai-use.json")
    review = json.loads(pathlib.Path(manifest_file).read_text(encoding="utf-8"))
    source = {name: json.loads(body) for name, body in raw.items()}
    review["input_sha256"] = hashes(raw)
    result = apply_record_review(source, review, check_counts=False)
    review["output_sha256"] = hashes(encode_result(raw, source, result))
    pathlib.Path(manifest_file).write_text(json.dumps(review, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return review["expected_counts"]


if __name__ == "__main__":
    import pathlib
    import sys
    if sys.argv[1:] != ["--pin"]:
        raise SystemExit("usage: python3 tools/record_review.py --pin")
    print(json.dumps(pin(pathlib.Path(__file__).resolve().parent.parent / "content" / "record-review.json"), indent=1))
