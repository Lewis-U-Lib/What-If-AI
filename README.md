# What If AI & The Register

Two faculty resources from Lewis University Library:

- **What If AI.** Answer a few questions about your teaching, research, or administrative work, and
  find openly licensed activities that use, or deliberately leave out, generative AI.
- **The Register.** Every activity in What If AI with its source and license, a platform-neutral
  guide to types of AI systems, examples of course AI policies, and the works the activities
  draw on.

Published with GitHub Pages at <https://lewis-u-lib.github.io/What-If-AI/>.

## How this repository works

- `data/` is a **release** exported from the project's corpus pipeline
  (`Lewis-U-Lib/Faculty-AI-Evaluation-Tool`, `scripts/export_release.py`). It preserves the imported
  activities and public fields; the publication review below determines the served subset. Don't edit it by hand: the build checks every file
  against `data/release.json`.
- The September 28 release is a documented **manual supplement** to that pipeline
  export: 81 additional activities and 75 sources. Its manifest retains the original
  pipeline commit, explicitly describes the supplement, and sets `clean: false`.
  See [the import review](docs/DATA-UPDATE-2026-09-28.md). It is not a new pipeline export.
- `content/editorial-corrections.json` records reviewed text corrections and an explicitly
  evidenced scale correction to that release.
  The build applies them to the public data shared by both tools and checks the expected
  output hashes. The imported release stays intact, and `version.json` identifies both
  its provenance and the applied editorial revision.
- `content/publication-review.json` records the full-text review of all 81 additions.
  It publishes **70 additions and 66 sources**, holds **11 additions** for incomplete
  source verification or unresolved rights, and applies 14 field corrections across
  seven accepted activities. That stage leaves 815 activities / 315 sources.
  Both tools share this filtered, corrected data. Original records remain in `data/`;
  every decision and evidence reference is retained. `version.json` identifies the
  publication revision and public counts. See [the full-text review](docs/FULL-TEXT-REVIEW-2026-09-28.md).
- `content/serial-comma-corrections.json` applies the reviewed Oxford-comma style to the
  published prose after the editorial and publication stages. It pins every input,
  target, insertion, and output; it preserves source quotations and matching codes.
  `version.json` records this punctuation revision separately. See
  [the punctuation review](docs/SERIAL-COMMAS-2026-09-28.md).
- `content/curation.json` is the last stage ([the curation record](docs/CURATION-2026-09-29.md)).
  It withdraws the 36 activities What If AI could never show, corrects licenses and source
  records against the sources' own statements, retires the `prompt_specification` class
  (keeping its no-reported-use fact as `use`), and applies American spelling to editorial
  prose. The build refuses any published activity the Finder cannot show. The public
  collection is **779 activities / 309 sources**. The publication review stays in the
  repository and is not published on the site.
- `src/` holds the pages, partials, CSS, JS, fonts, and images.
- `tools/build.py` turns `src/` and `data/` into `_site/`, fingerprinting every asset. It needs
  only Python 3.
- `.github/workflows/pages.yml` builds and tests every push and pull request, and deploys `main`
  to Pages.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, the data contract and the
decisions still open.

The Finder's [matching contract](docs/MATCHING.md) explains exact and compatible
preferences, recovery when there are no close matches, and the separate group for
activities whose selected requirements still need checking. Matching tests run on
every deployment; unknown requirements never count as confirmed matches.

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

## Update the AI-system examples

`src/js/register-type-examples.js` holds the illustrative product names, short capability
notes, official source links, and their checked date. Review those links when updating
examples. These are editorial additions to the type guide, separate from the exported
corpus release. Type descriptions come from the imported release; related-activity counts reflect the published subset.

The Register shows compact type cards. Opening a card displays the full description and
details in a fixed-size dialog; current examples start collapsed. The type-dialog test checks
keyboard focus, scroll-position restoration, content preservation, and narrow screens.

## Edit the walkthroughs

The Register’s `#about` section uses the nine-step illustrated walkthrough in
`src/partials/register-tour.html`, replacing the old static help grid. It preserves the
help topics, uses Previous/Next, step lamps, and arrow/Home/End keys, and never advances
automatically. Its frame stays the same height across steps. Hidden steps are inert;
printing exposes all nine steps as dark text without illustrations or controls and
restores the selected step afterward. Behavior and styles live in `src/js/register.js`
and `src/css/register.css`.

What If AI keeps its separate seven-step walkthrough in `src/partials/tour.html`.
The Register’s first step links to it. Page tests cover keyboard focus, links and Back,
all nine steps at six widths, and printing; accessibility checks cover every step.

## Update the activities

1. In the pipeline repo, run `python3 scripts/corpus_pages.py`, then
   `python3 scripts/export_release.py --out ../What-If-AI/data`.
2. Here, run `npm test`, then open a pull request. Merging to `main` deploys.

Before building a new upstream release, reconcile `content/editorial-corrections.json`,
`content/publication-review.json`, `content/serial-comma-corrections.json`, and
`content/curation.json`:
remove corrections already incorporated upstream, review any remaining targets, and
update the base release and reviewed output hashes. A mismatched release, target text,
occurrence count, or output hash fails the build rather than silently dropping or
misapplying corrections. Recheck the publication decisions, source coverage, license
evidence, typed field updates, and final public totals before updating either manifest. See [the editorial correction record](docs/EDITORIAL-CORRECTIONS.md).

For a data supplement, also update the reviewed import fixture after comparing every
retained record. `tests/data-integration.test.js` verifies the prior collection is intact,
checks labels and source/count consistency, and proves selectable, zero-mismatch matcher
paths for every approved new activity. Held additions remain absent from both public datasets. Browser checks follow those paths through pagination and
verify the same activity details in both tools. Matching tests read the built public data.

## Licenses

See [NOTICE.md](NOTICE.md). The site content is CC BY-NC-SA 4.0; each activity keeps its
source's license and attribution. The fonts are SIL OFL 1.1.
