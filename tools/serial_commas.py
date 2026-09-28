"""Apply reviewed punctuation after publication, without rewriting the source release.

Every input file and target string is pinned. The only permitted operation is a
comma insertion before a coordinating conjunction in an explicitly reviewed prose
field. Matching codes, source quotations, and bibliography cannot be targeted.
"""
import copy
import hashlib
import json
import re

from publication_review import encode_result, hashes

PROSE = {"sum", "gate", "dl", "rf", "t", "risk", "chg", "ad", "tool",
         "fld", "na", "loc", "miss", "evs", "licn"}


def prose_path(p):
    if p[0] == "acts.json":
        if p[1] == "acts":
            return ((len(p) == 4 and p[3] in PROSE)
                    or (len(p) == 5 and p[3] == "miss" and type(p[-1]) is int)
                    or (len(p) == 6 and p[3] in {"srp", "pa"} and p[-1] == 1))
        return ((len(p) == 4 and p[1] in {"families", "limits", "origin"} and p[-1] in {1, 2})
                or (len(p) == 5 and p[1] == "intake" and p[-1] in {1, 2})
                or (len(p) == 4 and p[1] == "task_labels")
                or (len(p) == 4 and p[1] == "pol" and p[-1] == "reads"))
    if p[0] == "register.json":
        return ((len(p) == 4 and p[1] == "origin" and p[-1] == 2)
                or (len(p) == 5 and p[1:3] == ["types", "types"]
                    and p[-1] in {"name", "what", "does", "io", "why", "limits"})
                or (len(p) == 4 and p[1:3] == ["types", "intro"])
                or (len(p) == 5 and p[1:3] == ["policy", "tiers"] and p[-1] == "reads")
                or p == ["register.json", "policy", "source", "note"])
    return False


def apply_commas(source, manifest):
    if manifest.get("schema") != 1:
        raise ValueError("Unknown serial-comma review schema.")
    result = copy.deepcopy(source)
    seen = set()
    for edit in manifest["fields"]:
        p = edit["path"]
        if len(p) < 4 or not prose_path(p) or tuple(p) in seen:
            raise ValueError(f"Invalid or duplicate punctuation target: {p}")
        seen.add(tuple(p))
        try:
            parent = result
            for key in p[:-1]:
                parent = parent[key]
            before = parent[p[-1]]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError(f"Missing punctuation target: {p}") from exc
        if (not isinstance(before, str)
                or hashlib.sha256(before.encode()).hexdigest() != edit["sha256"]):
            raise ValueError(f"Punctuation target changed; reconcile the review: {p}")
        positions = edit["commas"]
        if (not positions or any(type(i) is not int for i in positions)
                or positions != sorted(set(positions))
                or len(positions) != len(edit["contexts"])):
            raise ValueError(f"Invalid comma positions: {p}")
        for i, context in zip(positions, edit["contexts"]):
            if (not 0 < i < len(before) or before[i - 1] in ",;" or before[i - 1].isspace()
                    or not re.match(r"\s+(?:and|or|nor)\b", before[i:], re.I)
                    or before[max(0, i - 28):min(len(before), i + 32)] != context):
                raise ValueError(f"Invalid reviewed comma context: {p}")
        after = before
        for i in reversed(positions):
            after = after[:i] + "," + after[i:]
        parent[p[-1]] = after
    return result


def punctuated_files(raw, review_file):
    manifest_bytes = review_file.read_bytes()
    manifest = json.loads(manifest_bytes)
    if hashes(raw) != manifest["input_sha256"]:
        raise ValueError("Serial-comma input changed; reconcile the published prose review.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_commas(source, manifest)
    output = encode_result(raw, source, result)
    if hashes(output) != manifest["output_sha256"]:
        raise ValueError("Punctuated public data differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12],
                "reviewed": manifest["reviewed"], "fields": len(manifest["fields"]),
                "commas": sum(len(e["commas"]) for e in manifest["fields"])}
    return output, manifest_bytes, metadata
