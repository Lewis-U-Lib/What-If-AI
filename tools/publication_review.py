"""Publish the explicitly reviewed subset, preserving the complete imported release.

Runs after editorial corrections. Both stages pin their inputs/outputs; a new release
or review needs deliberate reconciliation instead of silently changing eligibility.
"""
import copy
import hashlib
import json

PROSE_FIELDS = {"sum", "chg", "evs", "loc", "na"}
COSTS = {"no_tool_needed", "free_tier", "institution_provided",
         "paid_with_stated_alternative", "paid_required", "not_specified"}


def apply_review(source, release, review):
    if review.get("schema") != 1 or review.get("base_release") != release["release"]:
        raise ValueError("Publication review needs reconciliation with this release.")
    original = source["acts.json"]["acts"]
    activities = {a["id"]: a for a in original}
    scope = review["scope"]
    scoped = {key for key in activities if key.startswith(scope["id_prefix"])}
    decisions = {d["id"]: d for d in review["decisions"]}
    if (len(activities) != len(original) or len(scoped) != scope["count"]
            or set(decisions) != scoped or len(decisions) != len(review["decisions"])):
        raise ValueError("Publication decisions must cover the entire review scope exactly once.")
    sources = {s["id"]: s for s in review["sources"]}
    related = {r[0] for key in scoped for r in activities[key]["rel"]}
    if set(sources) != related or len(sources) != len(review["sources"]):
        raise ValueError("Publication source reviews must cover every related work exactly once.")
    for key, decision in decisions.items():
        relations = {r[0] for r in activities[key]["rel"]}
        if (decision["decision"] not in {"publish", "hold"} or not decision.get("reason")
                or set(decision["source_ids"]) != relations or not relations):
            raise ValueError(f"Incomplete publication decision: {key}")
        for source_id in relations:
            evidence = sources[source_id]
            if not evidence.get("primary_url") or not evidence.get("license_notes"):
                raise ValueError(f"Missing source evidence: {source_id}")
            if decision["decision"] == "publish" and (
                    decision["primary_text_coverage"] != "full_primary_text"
                    or evidence["coverage"] != "full_primary_text"
                    or evidence["license_status"] != "confirmed"
                    or not any((r.get("sha256") or r.get("text_sha256")) and not r.get("error")
                               for r in evidence["retrievals"])):
                raise ValueError(f"Publication requires full primary text and confirmed rights: {key}")
    result = copy.deepcopy(source)
    acts = result["acts.json"]
    records = {a["id"]: a for a in acts["acts"]}
    seen = set()
    for edit in review["updates"]:
        key, field = edit["id"], edit["field"]
        target = (key, field)
        if (key not in decisions or decisions[key]["decision"] != "publish"
                or target in seen or field not in PROSE_FIELDS | {"depth", "eq"}
                or not edit.get("reason") or not edit.get("source")):
            raise ValueError(f"Invalid publication correction: {target}")
        seen.add(target)
        before, after = edit["before"], edit["after"]
        if records[key].get(field) != before or not isinstance(after, str) or not after or before == after:
            raise ValueError(f"Publication correction does not match reviewed text: {target}")
        if field == "depth" and after not in {v[0] for v in acts["intake"]["depth"]}:
            raise ValueError(f"Unlabeled scale: {target}")
        if field == "eq" and after not in COSTS:
            raise ValueError(f"Unlabeled cost: {target}")
        records[key][field] = after
    held = {key for key, d in decisions.items() if d["decision"] == "hold"}
    acts["acts"] = [a for a in acts["acts"] if a["id"] not in held]
    reg = result["register.json"]
    kept_works = []
    for work in reg["works"]:
        linked = work["acts"]
        work["acts"] = [key for key in linked if key not in held]
        # Remove only works emptied by this review, preserving unrelated records.
        if work["acts"] or not (set(linked) & held):
            kept_works.append(work)
    reg["works"] = kept_works
    ids = {a["id"] for a in acts["acts"]}
    works = {w["id"]: w for w in kept_works}
    for a in acts["acts"]:
        if any(r[0] not in works or a["id"] not in works[r[0]]["acts"] for r in a["rel"]):
            raise ValueError(f"Missing source backlink: {a['id']}")
    if any(key not in ids for w in kept_works for key in w["acts"]):
        raise ValueError("Publication left a dangling source/activity link.")
    acts["n"] = acts["stamp"]["live"] = reg["stamp"]["live"] = len(ids)
    reg["counts"] = {"activities": len(ids), "works": len(works)}
    for category in reg["types"]["types"]:
        category["ids"] = [key for key in category.get("ids", []) if key not in held]
        category["n"] = sum(bool(set(a["cap"]) & set(category["caps"])) or a["id"] in category["ids"]
                            for a in acts["acts"])
    reg["types"]["no_ai"]["n"] = sum("none_required" in a["cap"] for a in acts["acts"])
    for tier in reg["policy"]["tiers"] + [reg["policy"]["aside"]]:
        tier["n"] = sum(a["pol"] == tier["key"] for a in acts["acts"])
    for origin in reg["origin"]:
        origin[3] = sum(a["cls"] == origin[0] for a in acts["acts"])
    counts = {**reg["counts"], "accepted_additions": len(scoped) - len(held),
              "held_additions": len(held), "accepted_new_works": len(related & set(works))}
    if counts != review["expected_counts"]:
        raise ValueError(f"Publication counts differ from the review: {counts}")
    return result


def hashes(files):
    return {name: hashlib.sha256(body).hexdigest() for name, body in files.items()}


def encode_result(raw, source, result):
    return {name: raw[name] if result[name] == source[name] else
            (json.dumps(result[name], ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
            for name in raw}


def reviewed_files(raw, release, review_file):
    manifest_bytes = review_file.read_bytes()
    review = json.loads(manifest_bytes)
    if hashes(raw) != review["input_sha256"]:
        raise ValueError("Publication input differs from the audited editorial output.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_review(source, release, review)
    output = encode_result(raw, source, result)
    if hashes(output) != review["output_sha256"]:
        raise ValueError("Published data differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12],
                "base_release": review["base_release"], "reviewed": review["scope"]["count"],
                "corrected_activities": len({e["id"] for e in review["updates"]}),
                "corrected_fields": len(review["updates"]), **review["expected_counts"]}
    return output, manifest_bytes, metadata
