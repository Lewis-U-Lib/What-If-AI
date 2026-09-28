"""Apply reviewed errata without altering the imported corpus release.

The input release, target fields, occurrence counts, and output hashes are pinned.
A new upstream release must be reconciled with these corrections before building.
"""
import copy
import hashlib
import json

ACTIVITY_FIELDS = {"t", "sum", "chg", "cit", "attr", "dl", "gate", "rf", "licn"}


def apply_corrections(source, release, corrections):
    if corrections.get("schema") != 1 or corrections.get("base_release") != release["release"]:
        raise ValueError("Editorial corrections need review for this release; reconcile content/editorial-corrections.json.")
    result = copy.deepcopy(source)
    activities = {a["id"]: a for a in result["acts.json"]["acts"]}
    policies = {p["key"]: p for p in result["register.json"]["policy"]["tiers"]}
    seen = set()
    for section, records, allowed in [("activities", activities, ACTIVITY_FIELDS | {"depth"}), ("policy_rules", policies, {"rule"})]:
        for edit in corrections[section]:
            key, field = edit["id"], edit["field"]
            target = (section, key, field)
            if target in seen or field not in allowed or key not in records:
                raise ValueError(f"Invalid or duplicate editorial target: {target}")
            seen.add(target)
            value = records[key].get(field)
            before, after, count = edit["before"], edit["after"], edit["count"]
            # Scale is a reviewed classification, never a substring replacement.
            # Other matching metadata remains outside the prose correction path.
            if field == "depth" and (before != value or count != 1
                    or after not in {v[0] for v in result["acts.json"]["intake"]["depth"]}
                    or not edit.get("reason") or not edit.get("source")):
                raise ValueError(f"Invalid reviewed scale correction: {target}")
            if (not isinstance(value, str) or not isinstance(before, str) or not before
                    or not isinstance(after, str) or before == after
                    or type(count) is not int or count < 1 or value.count(before) != count):
                raise ValueError(f"Editorial text/count mismatch: {target}; review the source before updating this correction.")
            records[key][field] = value.replace(before, after)
    return result


def corrected_files(data_dir, release, corrections_file):
    raw = {name: (data_dir / name).read_bytes() for name in ("acts.json", "register.json", "guide.json")}
    source = {name: json.loads(body) for name, body in raw.items()}
    manifest_bytes = corrections_file.read_bytes()
    corrections = json.loads(manifest_bytes)
    result = apply_corrections(source, release, corrections)
    output = {name: raw[name] if result[name] == source[name] else
              (json.dumps(result[name], ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
              for name in raw}
    hashes = {name: hashlib.sha256(body).hexdigest() for name, body in output.items()}
    if hashes != corrections["output_sha256"]:
        raise ValueError("Corrected public data differs from the reviewed output hashes.")
    edits = corrections["activities"] + corrections["policy_rules"]
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12],
                "base_release": corrections["base_release"], "fields": len(edits),
                "replacements": sum(edit["count"] for edit in edits)}
    return output, manifest_bytes, metadata
