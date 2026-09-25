#!/usr/bin/env python3
"""Build the site: src/ + data/  ->  _site/   (Python 3.9+, standard library only)

  * CSS and JS are concatenated into the bundles named in site.json and written with a
    content hash in the file name (assets/css/base.3f2a9c1e.css). A changed file gets a
    new name, so a browser never mixes an old script with new data.
  * Fonts and images are fingerprinted the same way; url(...) references inside the CSS
    are rewritten to the fingerprinted names.
  * The data release (data/*.json) is copied unchanged, also fingerprinted. Each page
    receives a small JSON manifest naming its data files and scripts; src/js/boot.js
    fetches the data and then runs the scripts in order.
  * Partials ({{partial:name}}) are inlined, so every page is complete HTML before any
    script runs. Pages that must work at any URL depth (404.html) get absolute links.

The output is deterministic: the same inputs give byte-identical files (no timestamps).

Usage:
    python3 tools/build.py            # build into _site/
    python3 tools/build.py --out DIR
"""
import argparse, gzip, hashlib, html, json, pathlib, re, shutil, subprocess, sys
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
sys.path.insert(0, str(ROOT / "tools"))
from check_release import check as check_release  # noqa: E402

CFG = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
PH = re.compile(r"\{\{(\w+)(?::([\w./-]+))?\}\}")


def h8(b):
    return hashlib.sha256(b).hexdigest()[:10]


def git_commit():
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return "unknown"


class Site:
    def __init__(self, out):
        self.out = out
        self.map = {}          # logical path -> fingerprinted path (relative to site root)
        self.sizes = []

    def emit(self, logical, data, ext_dir):
        stem, dot, ext = pathlib.PurePosixPath(logical).name.rpartition(".")
        name = f"{ext_dir}/{stem}.{h8(data)}.{ext}"
        p = self.out / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        self.map[logical] = name
        self.sizes.append((name, len(data), len(gzip.compress(data, 9, mtime=0))))
        return name


def build(out):
    errs, rel = check_release(ROOT / "data")
    if errs:
        raise SystemExit("release check failed:\n  " + "\n  ".join(errs))
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    site = Site(out)

    # fonts and images first: CSS refers to them
    for f in sorted((SRC / "fonts").glob("*.woff2")):
        site.emit(f"fonts/{f.name}", f.read_bytes(), "assets/fonts")
    for f in sorted((SRC / "img").iterdir()):
        site.emit(f"img/{f.name}", f.read_bytes(), "assets/img")
    # the font licenses travel with the fonts, unhashed
    for f in sorted((SRC / "fonts").glob("OFL-*.txt")):
        (out / "assets" / "fonts").mkdir(parents=True, exist_ok=True)
        shutil.copy(f, out / "assets" / "fonts" / f.name)

    def css_urls(css):
        """Point url(...) references at the fingerprinted files. data: URIs and fragments are left alone."""
        def sub(m):
            ref = m.group(1) if m.group(1) is not None else (m.group(2) if m.group(2) is not None else m.group(3).strip())
            if ref.startswith(("data:", "http:", "https:", "#")):
                return m.group(0)
            parts = []                     # resolve the reference relative to css/
            for part in ("css/" + ref).split("/"):
                if part == "..": parts.pop()
                elif part not in ("", "."): parts.append(part)
            key = "/".join(parts)
            if key not in site.map:
                raise SystemExit(f"CSS refers to {ref}, which is not in src/")
            return "url(../" + site.map[key].split("assets/", 1)[1] + ")"
        return re.sub(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^)'\"]*))\s*\)", sub, css)

    for name, files in CFG["bundles"]["css"].items():
        body = "\n".join(f"/* ── {f} ── */\n" + (SRC / "css" / f).read_text(encoding="utf-8") for f in files)
        site.emit(f"css/{name}.css", css_urls(body).encode("utf-8"), "assets/css")
    for name, files in CFG["bundles"]["js"].items():
        body = "\n;\n".join(f"/* ── {f} ── */\n" + (SRC / "js" / f).read_text(encoding="utf-8") for f in files)
        site.emit(f"js/{name}.js", body.encode("utf-8"), "assets/js")
    for name in ("acts", "register", "guide"):
        site.emit(f"data/{name}.json", (ROOT / "data" / f"{name}.json").read_bytes(), "data")

    base_url = CFG["base_url"]
    base_path = "/" + base_url.split("://", 1)[1].split("/", 1)[1] if base_url.count("/") > 3 else "/"
    commit = git_commit()
    for page in CFG["pages"]:
        root = base_path if page.get("absolute") else ""
        a = lambda logical: root + site.map[logical]
        tpl = (SRC / "pages" / page["src"]).read_text(encoding="utf-8")
        canonical = base_url + ("" if page["out"] == "index.html" else page["out"])
        head = [f'<meta http-equiv="Content-Security-Policy" content="{html.escape(CFG["csp"])}"/>',
                '<meta name="referrer" content="strict-origin-when-cross-origin"/>',
                '<meta name="color-scheme" content="dark"/>',
                '<meta name="theme-color" content="#5b0a1f"/>',
                f'<meta name="generator" content="tools/build.py · release {rel["release"]} · site {commit[:7]}"/>']
        if page.get("sitemap", True):
            head.append(f'<link rel="canonical" href="{canonical}"/>')
        head.append(f'<link rel="icon" type="image/png" href="{a("img/logo.png")}"/>')
        analytics = CFG.get("analytics")
        if analytics:
            attrs = {
                "src": analytics["script_url"],
                "data-website-id": analytics["website_id"],
                "data-host-url": analytics["host_url"],
                "data-domains": urlsplit(base_url).hostname,
                "data-tag": analytics["tag"],
                "data-exclude-search": "true",
                "data-exclude-hash": "true",
            }
            head.append('<script defer ' + ' '.join(f'{k}="{html.escape(v, quote=True)}"' for k, v in attrs.items()) + '></script>')
        styles = []
        for f in ("barlow-400-latin.woff2", "barlow-condensed-700-latin.woff2"):
            styles.append(f'<link rel="preload" href="{a("fonts/" + f)}" as="font" type="font/woff2" crossorigin/>')
        for d in page.get("data", []):
            styles.append(f'<link rel="preload" href="{a("data/" + d + ".json")}" as="fetch" crossorigin/>')
        for c in page["css"]:
            styles.append(f'<link rel="stylesheet" href="{a("css/" + c + ".css")}"/>')
        scripts = ""
        if page.get("scripts"):
            man = {"release": rel["release"],
                   "data": {d: a("data/" + d + ".json") for d in page.get("data", [])},
                   "scripts": [a("js/" + s + ".js") for s in page["scripts"]]}
            scripts = ('<script id="site-manifest" type="application/json">' + json.dumps(man, separators=(",", ":")) + "</script>\n"
                       f'<script src="{a("js/boot.js")}" defer></script>')

        def sub(m):
            kind, arg = m.group(1), m.group(2)
            if kind == "head": return "\n".join(head)
            if kind == "styles": return "\n".join(styles)
            if kind == "scripts": return scripts
            if kind == "root": return root
            if kind == "asset": return a(arg)
            if kind == "partial": return (SRC / "partials" / arg).read_text(encoding="utf-8").rstrip("\n")
            raise SystemExit(f"{page['src']}: unknown placeholder {m.group(0)}")
        out_html = PH.sub(sub, tpl)
        out_html = PH.sub(sub, out_html)          # partials may carry {{root}}
        if PH.search(out_html):
            raise SystemExit(f"{page['src']}: unreplaced placeholder {PH.search(out_html).group(0)}")
        if page.get("absolute"):
            # every local link on a page served at any depth must be absolute
            out_html = re.sub(r'href="((?:what-if-ai|register|index)\.html[^"]*)"', lambda m: f'href="{base_path}{m.group(1)}"', out_html)
        (out / page["out"]).write_text(out_html, encoding="utf-8")
        b = out_html.encode("utf-8")
        site.sizes.append((page["out"], len(b), len(gzip.compress(b, 9, mtime=0))))

    (out / ".nojekyll").write_text("")
    urls = [base_url + ("" if p["out"] == "index.html" else p["out"]) for p in CFG["pages"] if p.get("sitemap", True)]
    (out / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + "".join(f"  <url><loc>{u}</loc><lastmod>{rel['built']}</lastmod></url>\n" for u in urls)
                                     + "</urlset>\n", encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {base_url}sitemap.xml\n", encoding="utf-8")
    (out / "version.json").write_text(json.dumps({"release": rel["release"], "release_built": rel["built"],
                                                  "pipeline_commit": rel["source"]["commit"], "site_commit": commit,
                                                  "assets": dict(sorted(site.map.items()))}, indent=1) + "\n", encoding="utf-8")
    return site, rel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "_site"))
    args = ap.parse_args()
    site, rel = build(pathlib.Path(args.out))
    print(f"built release {rel['release']} into {args.out}")
    for name, raw, gz in sorted(site.sizes):
        print(f"  {name:<52} {raw/1024:8.1f} KB  ({gz/1024:7.1f} KB gzipped)")


if __name__ == "__main__":
    main()
