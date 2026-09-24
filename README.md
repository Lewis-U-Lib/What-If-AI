# What If AI & The Register

Two faculty resources from Lewis University Library:

- **What If AI.** Answer a few questions about your teaching, research or administrative work, and
  find openly licensed activities that use, or deliberately leave out, generative AI.
- **The Register.** Every activity in What If AI with its source and license, a platform-neutral
  guide to types of AI systems, examples of course AI policies, and the works the activities
  draw on.

Published with GitHub Pages at <https://lewis-u-lib.github.io/What-If-AI/>.

## How this repository works

- `data/` is a **release** exported from the project's corpus pipeline
  (`Lewis-U-Lib/Faculty-AI-Evaluation-Tool`, `scripts/export_release.py`). It holds only
  published activities and public fields. Don't edit it by hand: the build checks every file
  against `data/release.json`.
- `src/` holds the pages, partials, CSS, JS, fonts and images.
- `tools/build.py` turns `src/` and `data/` into `_site/`, fingerprinting every asset. It needs
  only Python 3.
- `.github/workflows/pages.yml` builds and tests every push and pull request, and deploys `main`
  to Pages.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, the data contract and the
decisions still open.

## Run it locally

```
python3 tools/build.py          # → _site/
node tests/serve.js             # → http://localhost:8080/What-If-AI/
```

The pages load their data over HTTP, so opening `_site/*.html` straight from disk shows a
message asking you to serve them.

## Test

```
npm ci
npx playwright install chromium
npm test        # release check, build, site checks, page behavior, accessibility (axe), contrast
```

## Update the activities

1. In the pipeline repo, run `python3 scripts/corpus_pages.py`, then
   `python3 scripts/export_release.py --out ../What-If-AI/data`.
2. Here, run `npm test`, then open a pull request. Merging to `main` deploys.

## Licenses

See [NOTICE.md](NOTICE.md). The site content is CC BY-NC-SA 4.0; each activity keeps its
source's license and attribution. The fonts are SIL OFL 1.1.
