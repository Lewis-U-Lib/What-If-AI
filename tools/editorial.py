"""Validate a deliberately published editorial overlay; never modify released records."""
import datetime
import json
from urllib.parse import urlsplit


def editorial_bytes(path, activity_ids):
    data = json.loads(path.read_text(encoding="utf-8"))
    if set(data) != {"version", "entries"} or data["version"] != 1 or not isinstance(data["entries"], dict):
        raise ValueError("Editorial reviews need version 1 and an entries object")

    def text(value, field, required=True):
        if not isinstance(value, str) or len(value) > 5000 or (required and not value.strip()):
            raise ValueError("Editorial " + field + " must be text (1–5,000 characters)")

    def url(value):
        text(value, "source")
        parsed = urlsplit(value)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("Editorial sources must be HTTP(S) URLs")

    for ident, review in data["entries"].items():
        if ident not in activity_ids or not isinstance(review, dict):
            raise ValueError("Editorial review refers to an unknown activity: " + ident)
        required = {"reviewer", "checkedOn", "scope", "uncertainty"}
        allowed = required | {"relevance", "use", "evidence", "effort"}
        if not required.issubset(review) or set(review) - allowed:
            raise ValueError("Editorial review has missing or unknown fields: " + ident)
        for field in required:
            text(review[field], field, field != "uncertainty")
        try:
            datetime.date.fromisoformat(review["checkedOn"])
        except ValueError as exc:
            raise ValueError("Editorial checkedOn needs an ISO date") from exc
        for field, kinds in [("relevance", ("ready", "transferable", "unclear")),
                             ("use", ("reported", "not_assessed")),
                             ("evidence", ("outcome_report", "not_assessed"))]:
            if field not in review:
                continue
            value = review[field]
            if not isinstance(value, dict) or set(value) - {"kind", "note", "source"} or value.get("kind") not in kinds:
                raise ValueError("Invalid editorial " + field)
            text(value.get("note"), field + " note")
            if value["kind"] in ("reported", "outcome_report") or value.get("source"):
                url(value.get("source"))
        if "effort" in review:
            effort = review["effort"]
            if not isinstance(effort, dict) or set(effort) - {"duration", "preparation", "verification", "basis"}:
                raise ValueError("Invalid editorial effort record")
            for field, value in effort.items():
                text(value, "effort " + field)
            if any(effort.get(k) for k in ("duration", "preparation", "verification")):
                text(effort.get("basis"), "estimate basis")
    return (json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()
