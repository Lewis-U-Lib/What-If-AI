"""Apply the reviewed curation after punctuation, without rewriting the source release.

The fourth and last data stage. Like the earlier stages, it pins every input file, every
target value, and every output file, so a new release, review, or punctuation pass cannot
silently change what it does. Each operation is typed and carries its reason and evidence:

  withdrawals        published activities removed from both tools, with the rule that
                     justifies each. The rule is re-checked here, and the stage refuses to
                     publish any activity the Finder could never show (see FINDER_EXCLUDED).
  reclassify         moves records from a retired provenance class to a controlled one and
                     keeps any fact the old class carried as its own field, so no
                     information is lost with the label.
  origin_text        replaces the description of a provenance class (exact before/after).
  activity_fields    whole-value replacements of license and citation fields.
  work_fields        whole-value replacements of source records in The Register.
  text_corrections   substring spelling corrections, with exact occurrence counts.
  policy_rules       substring corrections to policy rule text, with exact counts.

Works emptied by a withdrawal are removed; every derived count is recalculated.
"""
import copy
import hashlib
import json

from publication_review import encode_result, hashes

# Mirrors src/js/matching.js admitted(): the Finder never shows these engagement classes.
FINDER_EXCLUDED = {"active", "passive"}
WITHDRAWAL_RULES = {"finder_admission": lambda a: a.get("icap") in FINDER_EXCLUDED}
ACTIVITY_FIELDS = {"lic", "licu", "licn", "lics", "cit", "attr"}
WORK_FIELDS = {"t", "a", "y", "lic", "link", "doi", "cit", "sk"}
TEXT_FIELDS = {"chg", "sum"}
USE_VALUES = {"unreported"}
CONTROLLED_CLASSES = {"original_synthesis", "licensed_adaptation", "hybrid_synthesis", "source_uncertain"}
MISSING = None   # a before/after of null means "field absent"


def _explained(edit, where):
    if not edit.get("reason") or not edit.get("evidence"):
        raise ValueError(f"Curation edit needs a reason and evidence: {where}")


def _set(record, field, before, after, where):
    if record.get(field, MISSING) != before or before == after:
        raise ValueError(f"Curation target does not match the reviewed value: {where}")
    if after is MISSING:
        record.pop(field, None)
    else:
        record[field] = after


def _replace(record, field, before, after, count, where):
    value = record.get(field)
    if (not isinstance(value, str) or not before or before == after
            or type(count) is not int or count < 1 or value.count(before) != count):
        raise ValueError(f"Curation text/count mismatch: {where}")
    record[field] = value.replace(before, after)


def recount(result):
    acts, reg = result["acts.json"], result["register.json"]
    ids = {a["id"] for a in acts["acts"]}
    works = {w["id"]: w for w in reg["works"]}
    for a in acts["acts"]:
        if any(r[0] not in works or a["id"] not in works[r[0]]["acts"] for r in a["rel"]):
            raise ValueError(f"Missing source backlink: {a['id']}")
    if any(key not in ids for w in reg["works"] for key in w["acts"]):
        raise ValueError("Curation left a dangling source/activity link.")
    if any(not w["acts"] for w in reg["works"]):
        raise ValueError("Curation left a source with no activity.")
    acts["n"] = acts["stamp"]["live"] = reg["stamp"]["live"] = len(ids)
    reg["counts"] = {"activities": len(ids), "works": len(works)}
    for category in reg["types"]["types"]:
        category["ids"] = [key for key in category.get("ids", []) if key in ids]
        category["n"] = sum(bool(set(a["cap"]) & set(category["caps"])) or a["id"] in category["ids"]
                            for a in acts["acts"])
    reg["types"]["no_ai"]["n"] = sum("none_required" in a["cap"] for a in acts["acts"])
    for tier in reg["policy"]["tiers"] + [reg["policy"]["aside"]]:
        tier["n"] = sum(a["pol"] == tier["key"] for a in acts["acts"])
    for origin in reg["origin"]:
        origin[3] = sum(a["cls"] == origin[0] for a in acts["acts"])


def apply_curation(source, review):
    if review.get("schema") != 1:
        raise ValueError("Unknown curation schema.")
    result = copy.deepcopy(source)
    acts, reg = result["acts.json"], result["register.json"]
    records = {a["id"]: a for a in acts["acts"]}

    # 1 · withdrawals
    w = review["withdrawals"]
    rule = WITHDRAWAL_RULES.get(w.get("rule"))
    withdrawn = set(w["ids"])
    if (rule is None or not w.get("reason") or len(withdrawn) != len(w["ids"])
            or any(key not in records or not rule(records[key]) for key in withdrawn)):
        raise ValueError("Every withdrawal must name a published activity that meets its stated rule.")
    acts["acts"] = [a for a in acts["acts"] if a["id"] not in withdrawn]
    if any(a.get("var") in withdrawn for a in acts["acts"]):
        raise ValueError("A published activity still points to a withdrawn variation.")
    kept = []
    for work in reg["works"]:
        linked = work["acts"]
        work["acts"] = [key for key in linked if key not in withdrawn]
        if work["acts"] or not (set(linked) & withdrawn):
            kept.append(work)
    reg["works"] = kept
    records = {a["id"]: a for a in acts["acts"]}
    unseen = [a["id"] for a in acts["acts"] if a.get("icap") in FINDER_EXCLUDED]
    if unseen:
        raise ValueError(f"These activities could never appear in What If AI; review them: {unseen}")

    # 2 · provenance class
    rc = review["reclassify"]
    if (rc["to"] not in CONTROLLED_CLASSES or rc["from"] in CONTROLLED_CLASSES
            or rc["marker"]["field"] != "use" or rc["marker"]["value"] not in USE_VALUES
            or not rc.get("reason") or len(set(rc["ids"])) != len(rc["ids"])):
        raise ValueError("Invalid reclassification.")
    if {a["id"] for a in acts["acts"] if a["cls"] == rc["from"]} != set(rc["ids"]):
        raise ValueError("Reclassification must cover every record in the retired class exactly once.")
    for key in rc["ids"]:
        records[key]["cls"] = rc["to"]
        records[key][rc["marker"]["field"]] = rc["marker"]["value"]
    for table in (acts["origin"], reg["origin"]):
        table[:] = [o for o in table if o[0] != rc["from"]]
    if any(a["cls"] not in CONTROLLED_CLASSES for a in acts["acts"]):
        raise ValueError("A published record carries a provenance class outside the controlled vocabulary.")
    for edit in review["origin_text"]:
        _explained(edit, edit["key"])
        for table, i in ((acts["origin"], 2), (reg["origin"], 2)):
            row = next((o for o in table if o[0] == edit["key"]), None)
            if row is None or row[i] != edit["before"] or edit["before"] == edit["after"]:
                raise ValueError(f"Origin text does not match the reviewed value: {edit['key']}")
            row[i] = edit["after"]

    # 3 · whole-field license and citation updates
    seen = set()
    for edit in review["activity_fields"]:
        where = (edit["id"], edit["field"])
        if where in seen or edit["field"] not in ACTIVITY_FIELDS or edit["id"] not in records:
            raise ValueError(f"Invalid or duplicate activity curation target: {where}")
        seen.add(where)
        _explained(edit, where)
        _set(records[edit["id"]], edit["field"], edit["before"], edit["after"], where)
    works = {w["id"]: w for w in reg["works"]}
    seen = set()
    for edit in review["work_fields"]:
        where = (edit["id"], edit["field"])
        if where in seen or edit["field"] not in WORK_FIELDS or edit["id"] not in works:
            raise ValueError(f"Invalid or duplicate source curation target: {where}")
        seen.add(where)
        _explained(edit, where)
        _set(works[edit["id"]], edit["field"], edit["before"], edit["after"], where)

    # 4 · spelling
    seen = set()
    for edit in review["text_corrections"]:
        where = (edit["id"], edit["field"], edit["before"])
        if where in seen or edit["field"] not in TEXT_FIELDS or edit["id"] not in records:
            raise ValueError(f"Invalid or duplicate text correction: {where}")
        seen.add(where)
        _explained(edit, where)
        _replace(records[edit["id"]], edit["field"], edit["before"], edit["after"], edit["count"], where)
    tiers = {t["key"]: t for t in reg["policy"]["tiers"]}
    for edit in review["policy_rules"]:
        where = (edit["id"], "rule", edit["before"])
        if edit["id"] not in tiers:
            raise ValueError(f"Unknown policy tier: {where}")
        _explained(edit, where)
        _replace(tiers[edit["id"]], "rule", edit["before"], edit["after"], edit["count"], where)

    recount(result)
    counts = {**reg["counts"], "withdrawn": len(withdrawn),
              "works_removed": len(source["register.json"]["works"]) - len(reg["works"]),
              "reclassified": len(rc["ids"])}
    if counts != review["expected_counts"]:
        raise ValueError(f"Curation counts differ from the review: {counts}")
    return result


def curated_files(raw, review_file):
    manifest_bytes = review_file.read_bytes()
    review = json.loads(manifest_bytes)
    if hashes(raw) != review["input_sha256"]:
        raise ValueError("Curation input changed; reconcile content/curation.json with the punctuated data.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_curation(source, review)
    output = encode_result(raw, source, result)
    if hashes(output) != review["output_sha256"]:
        raise ValueError("Curated public data differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12], "reviewed": review["reviewed"],
                **review["expected_counts"],
                "license_fields": len(review["activity_fields"]), "source_fields": len(review["work_fields"]),
                "spelling": sum(e["count"] for e in review["text_corrections"] + review["policy_rules"])}
    return output, manifest_bytes, metadata
