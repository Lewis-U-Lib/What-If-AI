"""Record who uses the AI tool in every activity, after the sets are added.

The sixth data stage. Like the earlier stages it pins its input and its output, so a new
release, a new set, or a changed review needs a deliberate reconciliation. It applies:

  operators     the controlled vocabulary for the new public field `op` (who operates an
                AI tool in the activity as summarized), each value with its label and
                description for faculty.
  assignments   a reviewed `op` for every activity. Each value other than `students`
                carries the quotation from the summary that settles it.
  limit         the Finder limit that used to read "I'd rather my students not use AI at
                all", replaced with what it now means (exact before and after).
  no_ai_type    The Register's card for that limit, renamed the same way.
  withdrawals   activities in which AI is neither used nor discussed, removed from both
                tools with a reason and evidence for each. The rule is re-checked against
                the published summary, and an activity that a remix builds on is refused:
                that is a decision the remix set has to make first.

Works emptied by a withdrawal are removed and every derived count is recalculated.
"""
import copy
import hashlib
import json
import re

from curation import recount
from publication_review import encode_result, hashes

OPERATORS = ("students", "faculty_or_staff", "optional", "none", "not_specified")
# the values that confirm "My students won't use an AI tool themselves" without a stated route
STUDENTS_USE_NO_TOOL = {"faculty_or_staff", "optional", "none"}
# the withdrawal rule: the activity as published names no AI, machine learning, or algorithm
AI_TERMS = re.compile(r"\b(?:AI|A\.I\.|artificial intelligence|machine[- ]learning|chatbots?|generative|"
                      r"language models?|LLMs?|algorithms?|automated|neural|GPT|ChatGPT)\b", re.I)


def no_tool_for_students(a):
    """Mirror of src/js/matching.js requirement(a, 'noai'): confirmed, excluded, or unknown."""
    if a.get("na"):
        return "confirmed"
    if a.get("op") == "students":
        return "excluded"
    return "confirmed" if a.get("op") in STUDENTS_USE_NO_TOOL else "unknown"


def _ai_absent(a):
    return not any(AI_TERMS.search(a.get(field) or "") for field in ("t", "sum", "gate", "dl"))


def apply_ai_use(source, review):
    if review.get("schema") != 1:
        raise ValueError("Unknown AI-use schema.")
    result = copy.deepcopy(source)
    acts, reg = result["acts.json"], result["register.json"]
    records = {a["id"]: a for a in acts["acts"]}
    if any("op" in a for a in acts["acts"]) or "operators" in acts:
        raise ValueError("The input already records who uses the AI tool.")

    # 1 · withdrawals
    w = review["withdrawals"]
    parents = {a["par"] for a in acts["acts"] if a.get("par")}
    variants = {a["var"] for a in acts["acts"] if a.get("var")}
    withdrawn = [x["id"] for x in w["records"]]
    if w.get("rule") != "ai_absent" or not w.get("reason") or len(set(withdrawn)) != len(withdrawn):
        raise ValueError("Withdrawals need the ai_absent rule, its reason, and distinct records.")
    for x in w["records"]:
        a = records.get(x["id"])
        if a is None or a.get("tier") or not x.get("reason") or not x.get("evidence"):
            raise ValueError(f"A withdrawal must name a published activity, with its reason and evidence: {x['id']}")
        if not _ai_absent(a):
            raise ValueError(f"The published record mentions AI; a person must decide: {x['id']}")
        if x["id"] in parents or x["id"] in variants:
            raise ValueError(f"Another activity builds on this one; decide that first: {x['id']}")
    gone = set(withdrawn)
    acts["acts"] = [a for a in acts["acts"] if a["id"] not in gone]
    kept = []
    for work in reg["works"]:
        linked = work["acts"]
        work["acts"] = [key for key in linked if key not in gone]
        if work["acts"] or not (set(linked) & gone):
            kept.append(work)
    reg["works"] = kept
    records = {a["id"]: a for a in acts["acts"]}

    # 2 · the operator vocabulary and one reviewed value per activity
    operators = review["operators"]
    if [o[0] for o in operators] != list(OPERATORS) or any(len(o) != 3 or not o[1] or not o[2] for o in operators):
        raise ValueError("The operator vocabulary needs each value with a label and a description.")
    assigned = {}
    for op, entries in review["assignments"].items():
        if op not in OPERATORS:
            raise ValueError(f"Unknown operator value: {op}")
        ids = entries if op == "students" else list(entries)
        if op != "students" and any(not str(entries[i]).strip() for i in ids):
            raise ValueError(f"Every value other than students needs its evidence: {op}")
        for key in ids:
            if key in assigned:
                raise ValueError(f"An activity has two operator values: {key}")
            assigned[key] = op
    if set(assigned) != set(records):
        missing, extra = sorted(set(records) - set(assigned)), sorted(set(assigned) - set(records))
        raise ValueError(f"Every published activity needs exactly one operator value: {missing[:5]} {extra[:5]}")
    for key, op in assigned.items():
        records[key]["op"] = op
    acts["operators"] = [list(o) for o in operators]

    # 3 · the limit and its Register card say what they now mean
    lim = review["limit"]
    row = next((l for l in acts["limits"] if l[0] == lim["key"]), None)
    if lim["key"] != "noai" or row is None or row[1:] != lim["before"] or lim["before"] == lim["after"] \
            or len(lim["after"]) != 2 or not all(lim["after"]) or not lim.get("reason"):
        raise ValueError("The limit text does not match the reviewed value.")
    row[1:] = lim["after"]
    card = reg["types"]["no_ai"]
    t = review["no_ai_type"]
    if {k: card[k] for k in ("name", "text")} != t["before"] or t["before"] == t["after"] \
            or set(t["after"]) != {"name", "text"} or not t.get("reason"):
        raise ValueError("The no-AI type card does not match the reviewed value.")
    card.update(t["after"])

    recount(result)
    card["n"] = sum(no_tool_for_students(a) == "confirmed" for a in acts["acts"])
    counts = {**reg["counts"], "withdrawn": len(gone),
              "works_removed": len(source["register.json"]["works"]) - len(reg["works"]),
              **{op: sum(a["op"] == op for a in acts["acts"]) for op in OPERATORS},
              "students_use_no_tool": card["n"]}
    if counts != review["expected_counts"]:
        raise ValueError(f"AI-use counts differ from the review: {counts}")
    return result


def ai_use_files(raw, review_file):
    manifest_bytes = review_file.read_bytes()
    review = json.loads(manifest_bytes)
    if hashes(raw) != review["input_sha256"]:
        raise ValueError("AI-use input changed; reconcile content/ai-use.json with the data and its sets.")
    source = {name: json.loads(body) for name, body in raw.items()}
    result = apply_ai_use(source, review)
    output = encode_result(raw, source, result)
    if hashes(output) != review["output_sha256"]:
        raise ValueError("Public data with the AI-use review differs from the reviewed output hashes.")
    metadata = {"revision": hashlib.sha256(manifest_bytes).hexdigest()[:12], "reviewed": review["reviewed"],
                **review["expected_counts"]}
    return output, manifest_bytes, metadata
