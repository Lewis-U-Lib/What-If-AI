#!/usr/bin/env python3
"""Check the data release in data/ against its manifest and the public-data contract.

data/ is written by the pipeline repository (Faculty-AI-Evaluation-Tool,
scripts/export_release.py) and is never edited by hand here. This check makes sure
what arrived is complete, unaltered and public:

  * release.json names every file with its size and SHA-256, and they match;
  * the contract version is one this site understands;
  * activities carry only public fields; The Register carries only public sections;
  * ids are unique, totals agree, and every source lists only activities that exist.

Usage: python3 tools/check_release.py [data_dir]      (exit 1 on any problem)
"""
import hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPPORTED_CONTRACT = {1}
PUBLIC_ACT = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "disc", "ac", "ar", "hm", "icap", "st", "sc",
              "sen", "dis", "eq", "pc", "cap", "pol", "f", "fld", "ft", "gate", "dl", "rf", "na", "pr", "ad", "pa",
              "srp", "miss", "risk", "tool", "evs", "cls", "cr", "cit", "lic", "licu", "lics", "licn", "url", "loc",
              "attr", "chg", "rel", "var", "ev", "al", "gr"}
REQUIRED_ACT = {"id", "t", "sum", "focus", "task", "depth", "lvl", "mod", "cap"}
PUBLIC_ACTS_TOP = {"acts", "families", "intake", "limits", "n", "origin", "pol", "pol_local", "stamp", "task_labels"}
PUBLIC_REGISTER = {"counts", "origin", "policy", "primo_base", "stamp", "types", "works"}
PUBLIC_WORK = {"a", "access", "acts", "cit", "doi", "id", "lic", "link", "lt", "search", "sk", "t", "y"}


def check(data_dir):
    d = pathlib.Path(data_dir)
    errors = []
    try:
        rel = json.loads((d / "release.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return ["data/release.json is missing: export a release from the pipeline first"], None
    if rel.get("contract") not in SUPPORTED_CONTRACT:
        errors.append(f"release contract {rel.get('contract')} is not supported (this site reads {sorted(SUPPORTED_CONTRACT)})")
    for name in ("acts.json", "register.json", "guide.json"):
        if name not in rel.get("files", {}):
            errors.append(f"release.json does not list {name}")
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
    known = set(ids)
    dangling = sorted({i for w in reg["works"] for i in w.get("acts", []) if i not in known})
    if dangling: errors.append(f"sources list activities that are not in the release: {dangling[:3]}")
    if not isinstance(guide, list): errors.append("guide.json should be a list")
    return errors, rel


if __name__ == "__main__":
    errs, rel = check(sys.argv[1] if len(sys.argv) > 1 else ROOT / "data")
    if errs:
        print("release check FAILED:\n  " + "\n  ".join(errs)); sys.exit(1)
    print(f"release {rel['release']} (built {rel['built']}, pipeline commit {rel['source']['commit'][:7]}): "
          f"{rel['counts']['activities']} activities, {rel['counts']['works']} works, contract {rel['contract']} — OK")
