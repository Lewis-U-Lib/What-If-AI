# Architecture: What If AI & The Register

Both tools read the same public collection. GitHub Actions builds and tests the site, then deploys a successful `main` build to [GitHub Pages](https://lewis-u-lib.github.io/What-If-AI/).

## Data and build

1. `tools/check_release.py` verifies the three public data files against `data/release.json` and contract version 2. The contract includes source relationships, synthesis and remix fields, AI operators, and source-access labels.
2. `tools/ai_type_guide.py` combines the guide in `content/ai-type-guide.json` with the collection's related-idea keys and counts. The guide's 43 references are separate from the collection's 618 sources.
3. `tools/license_scope.py` clarifies 244 entry license notes using pinned inputs, outputs, and exact replacement counts. Each entry retains its own rights.
4. `tools/build.py` combines templates and partials, fingerprints data and assets, and writes `_site/`. Identical inputs produce identical output, including `version.json`.

`data/acts.json` contains 1,033 use-case ideas plus the shared labels and filters. `data/register.json` contains source records, policy quotations, and related-idea mappings. `data/guide.json` contains links to the Library's faculty and staff guide. Collection records retain their citations, attributions, licenses, source relationships, and qualifications about evidence and classroom use.

`version.json` identifies the collection, site commit, guide revision, license scope, and public asset map. All three public data files are loaded by content-hashed filenames, so a browser cannot mix files from different releases.

## Pages and interface

`src/pages/` supplies the landing page, Finder, Register, and 404 page. `src/partials/` supplies shared footers, dialogs, and walkthroughs. CSS and JavaScript bundles are listed in `site.json`.

- `src/js/boot.js` loads each page's manifest, data, and scripts, with visible loading and failure states.
- `src/js/matching.js` implements the [matching contract](MATCHING.md).
- `src/js/shared.js` renders use-case ideas, sources, saved selections, and print output.
- `src/js/what-if-ai.js` manages the Finder questions, results, and browser history.
- `src/js/register.js` manages catalog filters, the guide, policy examples, sources, and dialogs.

The tools use the same detail renderer. Stable activity and source addresses support direct links. Unknown or incomplete addresses show a message and leave navigation available. Dialogs preserve keyboard focus and page position. Saved selections use local browser storage.

Fonts are self-hosted with their OFL notices. Each page includes a Content Security Policy, with explicit allowances for configured analytics and the Library's Ask Us iframe. The build fingerprints fonts and images and checks references to those files.

## Validation

`npm test` runs release and collection checks, citation and license safeguards, matching rules, source and count consistency, browser paths, page behavior, dialog tests, feedback, accessibility, and contrast. Tests cover the existing matching regression grid, all public records' reachable Finder paths, source backlinks, no-student-tool filters, and licensed content in screen and print views.

The deployment workflow runs the same suites before uploading the site. Pull requests run the tests without deploying.
