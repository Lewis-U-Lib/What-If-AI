#!/usr/bin/env python3
"""Check the data release in data/ against its manifest and the public-data contract.

data/ contains the reviewed public collection. This check makes sure the release
is complete, internally consistent, and matches its recorded fingerprints:

  * release.json names every file with its size and SHA-256, and they match;
  * the contract version is one this site understands;
  * activities carry only public fields; The Register carries only public sections;
  * ids are unique, totals agree, and every source lists only activities that exist.

Usage: python3 tools/check_release.py [data_dir]      (exit 1 on any problem)
"""
import hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPPORTED_CONTRACT = {2}
PUBLIC_ACT = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "disc", "ac", "ar", "hm", "icap", "st", "sc",
              "sen", "dis", "eq", "pc", "cap", "pol", "f", "fld", "ft", "gate", "dl", "rf", "na", "pr", "ad", "pa",
              "srp", "miss", "risk", "tool", "evs", "cls", "cr", "cit", "lic", "licu", "lics", "licn", "url", "loc",
              "attr", "chg", "rel", "var", "ev", "al", "gr", "use", "tier", "par", "dep", "chk", "op", "sa"}
REQUIRED_ACT = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "cap", "op"}
PUBLIC_ACTS_TOP = {"acts", "families", "intake", "limits", "n", "origin", "pol", "pol_local", "stamp", "task_labels", "tiers", "operators"}
PUBLIC_REGISTER = {"counts", "origin", "policy", "primo_base", "stamp", "types", "works", "tiers"}
PUBLIC_WORK = {"a", "access", "acts", "cit", "doi", "id", "lic", "link", "lt", "search", "sk", "t", "y"}


def check(data_dir):
    d = pathlib.Path(data_dir)
    errors = []
    try:
        rel = json.loads((d / "release.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return ["data/release.json is missing"], None
    if rel.get("contract") not in SUPPORTED_CONTRACT:
        errors.append(f"release contract {rel.get('contract')} is not supported (this site reads {sorted(SUPPORTED_CONTRACT)})")
    if set(rel.get("files", {})) != {"acts.json", "register.json", "guide.json"}:
        return ["release.json must list exactly the three public data files"], rel
    for name, meta in rel.get("files", {}).items():
        p = d / name
        if not p.exists():
            errors.append(f"{name} is listed but missing"); continue
        b = p.read_bytes()
        if len(b) != meta["bytes"] or hashlib.sha256(b).hexdigest() != meta["sha256"]:
            errors.append(f"{name} does not match release.json (edited by hand, or a partial copy)")
    if errors:
        return errors, rel

    acts = json.loads((d / "acts.json").read_text(encoding="utf-8"))
    reg = json.loads((d / "register.json").read_text(encoding="utf-8"))
    guide = json.loads((d / "guide.json").read_text(encoding="utf-8"))
    if set(acts) - PUBLIC_ACTS_TOP: errors.append(f"unexpected sections in acts.json: {sorted(set(acts) - PUBLIC_ACTS_TOP)}")
    if set(reg) - PUBLIC_REGISTER: errors.append(f"unexpected sections in register.json: {sorted(set(reg) - PUBLIC_REGISTER)}")
    extra = sorted({k for a in acts["acts"] for k in a} - PUBLIC_ACT)
    if extra: errors.append(f"non-public activity fields: {extra}")
    missing = sorted({k for a in acts["acts"] for k in REQUIRED_ACT - set(a)})
    if missing: errors.append(f"activities missing required fields: {missing}")
    extra_w = sorted({k for w in reg["works"] for k in w} - PUBLIC_WORK)
    if extra_w: errors.append(f"non-public work fields: {extra_w}")
    ids = [a["id"] for a in acts["acts"]]
    if len(ids) != len(set(ids)): errors.append("duplicate activity ids")
    n = len(ids)
    if not (acts["n"] == reg["counts"]["activities"] == rel["counts"]["activities"] == n):
        errors.append(f"activity totals disagree: {n} records, acts.n {acts['n']}, register {reg['counts']['activities']}, release {rel['counts']['activities']}")
    if acts["stamp"]["fingerprint"] != rel["release"]:
        errors.append("acts.json and release.json name different releases")
    if reg["stamp"]["fingerprint"] != rel["release"]:
        errors.append("register.json and release.json name different releases")
    if acts["stamp"]["live"] != n or reg["stamp"]["live"] != n:
        errors.append("collection stamp totals disagree")
    known = set(ids)
    dangling = sorted({i for w in reg["works"] for i in w.get("acts", []) if i not in known})
    if dangling: errors.append(f"sources list activities that are not in the release: {dangling[:3]}")
    works = {w["id"]: w for w in reg["works"]}
    if len(works) != len(reg["works"]): errors.append("duplicate source ids")
    if not (len(works) == reg["counts"]["works"] == rel["counts"]["works"]):
        errors.append("source totals disagree")
    records = {a["id"]: a for a in acts["acts"]}
    operators = {o[0] for o in acts["operators"]}
    for a in acts["acts"]:
        key = a["id"]
        if a["icap"] not in {"constructive", "interactive", "not_applicable", "requires_review"}:
            errors.append(f"{key}: engagement class is not supported by the Finder")
        if a["op"] not in operators: errors.append(f"{key}: unknown AI operator")
        if (a["op"] == "none") != (a["cap"] == ["none_required"]):
            errors.append(f"{key}: AI operator and capabilities disagree")
        if "none_required" in a["cap"] and len(a["cap"]) != 1:
            errors.append(f"{key}: no-tool capability cannot be combined with a tool")
        if a.get("ar") == "withheld" and a["op"] == "students":
            errors.append(f"{key}: no-tool role conflicts with student operation")
        if "sa" in a and (a["sa"] not in {"not_open", "unmodified", "restricted"} or
                          not any(r[1].startswith("Used unmodified") for r in a.get("rel", []))):
            errors.append(f"{key}: source-access label needs a corresponding source item")
        if a.get("par") and (a["par"] not in records or records[a["par"]].get("tier")):
            errors.append(f"{key}: remix parent must belong to the licensed collection")
        for relationship in a.get("rel", []):
            source, relation = relationship[:2]
            if source not in works or key not in works[source]["acts"]:
                errors.append(f"{key}: source relationship does not link both ways: {source}")
            elif relation.startswith("Adapted from") and any(s in works[source]["lic"] for s in ("ND", "NoDeriv")):
                errors.append(f"{key}: adaptation conflicts with source terms: {source}")
    for w in reg["works"]:
        if not w["acts"]: errors.append(f"{w['id']}: source has no related ideas")
        if any(i in records and not any(r[0] == w["id"] for r in records[i].get("rel", [])) for i in w["acts"]):
            errors.append(f"{w['id']}: source backlink has no corresponding relationship")
    for t in reg["types"]["types"]:
        if any(i not in known for i in t.get("ids", [])):
            errors.append(f"{t['key']}: unknown related idea")
        count = sum(bool(set(a["cap"]) & set(t["caps"])) or a["id"] in t.get("ids", []) for a in acts["acts"])
        if t["n"] != count: errors.append(f"{t['key']}: type count disagrees")
    no_ai = sum(bool(a.get("na")) or a["op"] in {"faculty_or_staff", "optional", "none"} for a in acts["acts"])
    if reg["types"]["no_ai"]["n"] != no_ai: errors.append("no-student-tool count disagrees")
    for rows, field in ((reg["origin"], "cls"), (reg["tiers"], "tier")):
        for row in rows:
            if row[3] != sum(a.get(field) == row[0] for a in acts["acts"]):
                errors.append(f"{row[0]}: group count disagrees")
    for tier in reg["policy"]["tiers"] + [reg["policy"]["aside"]]:
        if tier["n"] != sum(a.get("pol") == tier["key"] for a in acts["acts"]):
            errors.append(f"{tier['key']}: policy count disagrees")
    if not isinstance(guide, list): errors.append("guide.json should be a list")
    return errors, rel


if __name__ == "__main__":
    errs, rel = check(sys.argv[1] if len(sys.argv) > 1 else ROOT / "data")
    if errs:
        print("release check FAILED:\n  " + "\n  ".join(errs)); sys.exit(1)
    print(f"release {rel['release']} (built {rel['built']}): "
          f"{rel['counts']['activities']} activities, {rel['counts']['works']} works, contract {rel['contract']} — OK")
