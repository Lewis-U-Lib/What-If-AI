# Architecture: What If AI & The Register

**Status:** scaffold, 2026-09-24, on branch `site-scaffold`. Nothing is deployed yet.
**Repository:** `Lewis-U-Lib/What-If-AI`. It publishes to GitHub Pages at
`https://lewis-u-lib.github.io/What-If-AI/`.

## 1. What changes, and what does not

The two tools look and behave exactly as they do in the single-file build. The new build
changes how they are delivered.

| | Single-file build (Faculty-AI-Evaluation-Tool) | This site |
|---|---|---|
| Files | Two HTML files, 2.6–2.8 MB each. Each page has its own copy of the activity data, CSS and JS inlined. | Four pages, plus shared CSS, JS, fonts and data files |
| Activity data | Embedded twice (once per page) | One file, downloaded once and cached for both pages |
| Fonts | Google Fonts, requested from Google | Self-hosted from the site (OFL); no third-party requests |
| Cache safety | Every change replaces the whole page | Every asset name carries a content hash, so a new release never mixes with old files |
| Security | No policy | A Content-Security-Policy with narrow exceptions for Umami analytics and the Ask Us iframe, and no inline code |
| Entry point | None | Landing page, plus a 404 page that works at any depth |
| Deploy | Not set up | GitHub Actions builds, runs every test, and deploys only if all of them pass |

The corpus pipeline stays where it is (§3). This repository holds only what the pages show.

## 2. Repository layout

```
data/                 the published release, exported from the pipeline (never edited here)
  acts.json             every published activity (card and detail fields only)
  register.json         The Register: sources, AI-system types, policy spectrum
  guide.json            links from terms to the Gen AI Faculty & Staff Guide
  release.json          manifest: release id, pipeline commit, counts, SHA-256 of each file
src/
  pages/                index.html, what-if-ai.html, register.html, 404.html (templates)
  partials/             icons.svg, footer, dialogs, walkthrough, help (inlined at build)
  css/                  fonts, lul-core, site, shell · what-if-ai, register · theme-plate, lab, inline-moved
  js/                   boot · linkify + shared · what-if-ai · register · lul-core
  fonts/                Barlow, Barlow Condensed, JetBrains Mono (woff2, latin + latin-ext) and their OFL texts
  img/                  logo.png
tools/
  build.py              src/ + data/ → _site/   (Python standard library only)
  check_release.py      verifies data/ against release.json and the public-data contract
tests/
  serve.js              static server that behaves like Pages (base path, 404.html)
  site.test.js          fingerprints, CSP, same-origin loading, loading and failure states, determinism
  pages.test.js         ported from the pipeline: 162 behavior checks
  a11y.test.js          axe, WCAG 2.2 A/AA, 40 states (adds the landing page and 404)
  contrast.test.js      text on textured surfaces
site.json               base URL, bundles, pages, Content-Security-Policy
.github/workflows/pages.yml
```

## 3. Two repositories, one door between them

```
Faculty-AI-Evaluation-Tool  (pipeline: corpus inputs, reconcile, validate, held/retired records, review notes)
        │  scripts/corpus_pages.py      → data/pages/*.json   (as today)
        │  scripts/export_release.py    → refuses unless only published, public data leaves
        ▼
What-If-AI/data/                  acts.json · register.json · guide.json · release.json
        │  tools/check_release.py   (hashes, contract version, public fields, totals)
        │  tools/build.py           → _site/
        ▼
GitHub Pages
```

**The export refuses** to run in any of these cases:

- `data/pages` is stale;
- the activity store is not exactly the published set (accepted + variant);
- any held or retired id appears anywhere in the files;
- an activity carries a field outside the public list, or The Register carries a section outside
  it.

The export is deterministic, with no timestamps. It records the pipeline commit, and whether the
pipeline's `data/` was clean when it ran.

**The site re-checks the release on every build.** It checks:

- each file matches its SHA-256 in `release.json`, so nothing was edited by hand or partly copied;
- the contract version is one the site understands (currently 1);
- the fields are public, and the totals and cross-references agree.

The site cannot tell whether an id was held, because it never receives held ids. That check
belongs to the export.

**Contract version.** A change to field names or meanings in `acts.json` or `register.json` bumps
`contract` in the export and in `check_release.py` together, with the JS that reads the fields.
A release with an unknown contract fails the build instead of rendering wrongly.

## 4. How a page loads

1. The HTML arrives complete: header, navigation, footer, dialogs, the walkthrough and the icon
   sprite are all inlined at build. The CSS is linked in `<head>`. The data files and two fonts
   are preloaded, so their downloads start immediately.
2. `boot.js` (deferred) reads the page's JSON manifest. The manifest names its data files and
   scripts, with fingerprinted paths.
3. It fetches the data files in parallel and exposes them as `window.SITE_DATA`. Then it runs the
   page's scripts in order, as the single-file page ran its inline scripts.
4. `#main` carries `aria-busy="true"` and a status message ("Loading activities…") until the
   scripts have run. Then the message is removed and `<html data-ready>` is set. The tests wait
   on that attribute.
5. If a data file or script fails, the message becomes an alert with a **Try again** button. A
   page opened as a local file says it needs to be served.

The app code changed in only three places: `shared.js`, `register.js` and `linkify.js` now read
`window.SITE_DATA` instead of inline `<script type="application/json">` blocks. Four inline style
attributes in `register.js` and two in the SVG partials became classes (`inline-moved.css`,
loaded last so it wins as the attributes did). That was needed for the Content-Security-Policy.
Routing (`#q=`, `#a=`, `#act=`, `#src=`, `#activities?…`), saved activities (localStorage) and
printing are unchanged.

**Bundles** (`site.json`):

- **CSS:** `base` is fonts + lul-core + site + shell. Then comes the page's own file. `theme` is
  theme-plate + lab + inline-moved. This is the cascade order of the single-file pages.
- **JS:** `boot`, then `core` (linkify + shared), then the page script, then `engines` (lul-core).

`base`, `theme`, `core`, `engines`, the fonts and `acts` are shared by both tools, so opening the
second tool fetches only its own HTML, CSS, JS and (for The Register) `register.json`. Measured:
334 KB after What If AI, against 2.8 MB for the single-file Register.

## 5. Caching and releases

GitHub Pages sends `Cache-Control: max-age=600` for everything, and the site cannot change that.
Fingerprinted names make it safe:

- an HTML page is at most 10 minutes stale;
- the files it names can never be a mismatched older version, because a changed file has a new
  name;
- old files simply stop being referenced.

`version.json` records the release, the pipeline commit and the site commit, and the page
carries them in `<meta name="generator">`.

Pages serves every file gzipped. First visit to What If AI: 2.77 MB uncompressed, of which the
activity data is 2.29 MB (464 KB gzipped).

## 6. Security and privacy

- The Content-Security-Policy (a `<meta>` tag, because Pages cannot set headers) reads:
  `default-src 'self'; script-src 'self' https://cloud.umami.is/script.js; style-src 'self'; font-src 'self'; img-src 'self' data:;
  connect-src 'self' https://gateway.umami.is/api/send; frame-src https://lewisu.libanswers.com; object-src 'none'; base-uri 'self'; form-action 'self';
  upgrade-insecure-requests`.
- There are no inline scripts, inline styles or event-handler attributes; the tests enforce
  this. The only inline `<script>` blocks are `type="application/json"`, which never runs.
- Umami pageview analytics loads `https://cloud.umami.is/script.js` on every page and sends
  visits to `https://gateway.umami.is/api/send`. Configuration lives in `site.json → analytics`
  and the shared build adds the tracker once per page. It reuses website ID
  `80635adb-f2b4-41bc-9f59-15376ca0b5e8`, preserving the existing account and history.
  `data-domains` restricts reporting to the hostname in `base_url`; local previews do not
  report visits. Query strings and fragments are excluded, so filter and search selections
  are not included in analytics URLs or counted as separate pageviews. Session replay, performance tracking and visitor identification are not enabled.
  In Umami, filter Path / URL by **contains `/What-If-AI/`**, or Tag by **`what-if-ai`**,
  to separate these visits from the old Faculty AI Evaluation Tool.
- Activity pop-ups include optional radio-button feedback, shared by both tools. Nothing
  is sent on selection alone: the reader must choose **Send feedback**. Only **Already
  used** and **Not a fit** reveal an optional follow-up; changing the main answer clears
  the hidden follow-up. The form is excluded from printed activities.
  Acknowledged responses are remembered under `lul-whatifai-feedback-v1` in localStorage
  by activity ID. Identical answers are suppressed in the same browser; changed answers
  remain possible. With storage unavailable, suppression lasts for the current page.
  Feedback uses the configured Umami intake endpoint with the same domain and opt-out
  restrictions, and requires a successful response before showing a sent message. A
  blocked tracker, service rejection or connection failure leaves the form retryable.
  In **Events**, look for `activity-feedback` (initial responses) and
  `activity-feedback-updated` (changes). Properties are `activity_id`, `surface`,
  `response`, optional `outcome` or `reason`, and `previous_response` for updates. The
  standard `what-if-ai` tag applies. No names, contact information, free text or custom
  visitor IDs are sent. These are voluntary response events, not unique faculty counts
  or verified classroom adoption; repeat suppression is best effort within one browser.
- **Ask Us** loads the Lewis Library LibAnswers widget inside its iframe only when opened;
  `frame-src` permits only `https://lewisu.libanswers.com`. Fonts are self-hosted. Links out
  (the Faculty Guide, the feedback form, sources) are ordinary links with `rel="noopener
  noreferrer"`.
- Referrer policy: `strict-origin-when-cross-origin`.
- Saved activities stay in the reader's own browser (localStorage), as before.

## 7. Build and deploy

- **Local:**
  ```
  python3 tools/build.py
  node tests/serve.js
  ```
  Then open `http://localhost:8080/What-If-AI/`.
- **Tests:** `npm ci`, then `npx playwright install chromium`, then `npm test`.
- **CI** (`.github/workflows/pages.yml`):
  - Every push and pull request runs the release check, the build and all five test suites.
  - A push to `main` also uploads `_site/` and deploys it.
  - Pull requests never deploy.
  - A repository admin must set **Settings → Pages → Source: GitHub Actions** once.
- **Base URL:** `site.json → base_url` is the one place to change for a custom domain. For a
  custom domain, also add a `CNAME` step to the build.

## 8. Verification at scaffold time

These results come from the scaffold, built from release `66661c47c06b` (pipeline commit
`aab8197`).

| Check | Result |
|---|---|
| Release check | OK: 745 activities, 249 works, contract 1 |
| `site.test.js` | 21/21 |
| `pages.test.js` (ported) | 162/162. The checks that read the corpus changed: "no held or retired record reaches either page" now runs in `export_release.py`, where the corpus is available. The address checks for held and removed ids use ids that are not in the release |
| `a11y.test.js` | 0 violations across 40 states: the 36 existing ones, plus the landing page and the 404 page at desktop and phone widths |
| `contrast.test.js` | 189 text runs on textured surfaces, 0 below AA; the tightest is 5.99:1 |
| Visual parity with the single-file pages | Full-page screenshots of 8 states at 1440 and 390 px: 13 of 16 are identical pixel for pixel. In the other 3, the content is the same but a scrolled or open element was captured at a slightly different position; the computed fonts and text metrics are identical |
| Determinism | Two builds are byte-identical (42 files) |

## 9. Decisions still open

1. **Where the presentation code lives.** From now on the templates, CSS and JS in `src/` are the
   source for the public pages. Options for the pipeline repo's own `templates/`:
   - (a) keep them for its local review build only, and let them drift;
   - (b) delete them and have the pipeline's QA run against this site;
   - (c) have this repo's `src/` pulled into the pipeline for review builds.
   
   Recommendation: (a) for now, (b) once this site is live.
2. **How releases arrive.** The manual path: run `export_release.py --out ../What-If-AI/data`
   and open a pull request here. An automated path, a workflow in the pipeline repo that opens
   that pull request, needs a token with write access to this repo. That is a settings
   decision.
3. **Landing page.** The copy reuses the approved descriptions. The oversized two-line title on
   the landing header can be tuned.
4. **Legacy URLs.** The old Faculty AI Evaluation Tool (`index.html`, `Reference.html`) stays where
   it is. Whether it should link here, or here to it, is open.
5. **Software license.** As in the pipeline repo, the code has no license file yet. The site
   content is CC BY-NC-SA 4.0, and the fonts are OFL 1.1.
6. **Later performance work, if wanted.** Split `acts.json` into a card index plus details loaded
   on demand, which would cut What If AI's first load by about half. Or subset the fonts to the
   glyphs used.

## 10. Not done in this step

- Nothing was pushed, merged or published. GitHub Pages is not enabled, and the old tool has not
  been replaced.
- The NoDerivatives preview is not part of this site. Its branch in the pipeline repo stays
  parked and unmerged.
