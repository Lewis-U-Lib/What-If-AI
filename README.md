# What If AI & The Register

Two faculty resources from Lewis University Library:

- **What If AI.** Answer a few questions about teaching, research, or administrative work to find use-case ideas that use or deliberately leave out generative AI.
- **The Register.** Browse those ideas with their sources and licenses, a sourced guide to types of AI systems, examples of course AI policies, and the source bibliography.

[Open the tools](https://lewis-u-lib.github.io/What-If-AI/).

## Repository contents

- `data/` contains the reviewed public collection: **1,033 use-case ideas and 618 sources**, shared by both tools. `release.json` records the collection date, counts, and exact file fingerprints.
- `content/ai-type-guide.json` supplies the AI guide's explanations, groups, claim-level citations, and 43 references. Its groupings are an editorial synthesis of the cited sources.
- `content/tool-license.json` supplies the scoped tool license and the exact entry-note clarifications applied during the build.
- `src/` contains page templates, partials, scripts, styles, fonts, and images.
- `tools/build.py` checks the collection, combines it with the guide and license notices, and writes fingerprinted files to `_site/`. It needs only Python 3.
- `tests/` checks data integrity, matching, page behavior, licensing, accessibility, and contrast.
- `.github/workflows/pages.yml` runs the checks on pull requests and publishes `main` through GitHub Pages.

See the [architecture](docs/ARCHITECTURE.md), [matching contract](docs/MATCHING.md), [AI guide sources](docs/AI-TYPE-GUIDE-2026-10-08.md), and [license scope](docs/TOOL-LICENSE-2026-10-08.md).

## Run locally

```
python3 tools/build.py
node tests/serve.js
```

Open `http://localhost:8080/What-If-AI/`. The pages load their data over HTTP.

## Test

```
npm ci
npx playwright install chromium
npm test
```

## Update the collection

Review changes to `data/acts.json`, `data/register.json`, and `data/guide.json` together. Keep identifiers, source relationships, quotations, attributions, and license terms consistent. Update the release date, collection fingerprints, and file hashes in `data/release.json` after reviewing the complete changes.

`python3 tools/check_release.py` checks file fingerprints, the public field contract, counts, source backlinks, remix parents, AI-operator consistency, and related-idea counts. After a reviewed data change, run `python3 tools/license_scope.py --pin`, inspect its exact changes, and run `npm test`. Merging a passing pull request to `main` publishes the site.

## Update the AI guide and examples

`content/ai-type-guide.json` is the guide's source of truth. Ten capability and system entries are separate from two access and participation choices. Citations appear beside claims and in each dialog. Reference lists show each citation alone; publication types and consulted sections stay in `content/ai-type-guide.json` and the research notes. Keep source IDs, URLs, and titles synchronized with `docs/research/ai-type-sources.json`.

The guide changes explanations while preserving the collection's related-idea keys, capabilities, IDs, and counts. The build rejects missing explanations, unknown citations, and unused references. References use APA-style entries with short `cite` labels for accessible in-text links. After a guide edit, run `python3 tools/license_scope.py --pin` and confirm that only the `register.json` hashes change. Each capability or system entry opens as a five-slide carousel — the four explanation fields, then References — defined by `TYPE_SLIDES` in `src/js/register.js`; its controls sit in the window's fixed footer. Editing `src/js/register-type-examples.js` also requires updating its pinned hash in `content/tool-license.json` (`preserved_files_sha256`), which guards that separately licensed file; record the checked date in the file itself.

`src/js/register-type-examples.js` contains illustrative product names, capability notes, official links, and their checked date. Product links need no additional numbered citations. Review those links when updating the examples.

Every carousel slide has a topic-specific watercolor illustration. The 55 drawings
are stored as 11 transparent WebP atlases in `src/img/types-*.webp`; CSS selects
one of five measured scene viewports per type and the build fingerprints each asset. The artwork is
decorative and hidden from assistive technology; the adjacent text remains the
complete explanation. See [the illustration map](docs/AI-TYPE-ILLUSTRATIONS.md).

## Edit the walkthroughs

The Register's header and floating menu open the nine-step walkthrough in `src/partials/register-tour.html`; `#about` links open it too. What If AI's header and floating menu open the seven-step walkthrough in `src/partials/tour.html`. Each header keeps two buttons: the walkthrough, as the one brass primary, and "How this site works"; the companion tool, the Gen AI guide, and feedback are reached from the floating menu and the footer. Page tests cover keyboard operation, focus, links, browser history, printing, and narrow screens.

## Edit "How this site works"

Both tools state in their headers that results come from fixed rules rather than an AI system, and a "How this site works" button opens the shared six-slide carousel in `src/partials/about.html`: What If AI, The Register, what leaves the browser, Ask Us, links to other sites, and how the site was made. It behaves like the walkthroughs (Previous, Next, dots, arrow keys, Home and End; it never advances by itself), and its slides share one grid cell so the controls never move. Each slide has a painted drawing that uses the `#wc` filter and `wc*` washes defined by the page's walkthrough partial, so a page that includes `about.html` must also include `tour.html` or `register-tour.html`; drawings carry no text and are hidden from assistive technology. The Finder repeats a short version beside the questions (`drawRail` and `drawWizard` in `src/js/what-if-ai.js`), and the Ask Us panel in `src/partials/help.html` says when staff answer. These statements must stay literally true. The footer's HCAI and HITL disclosure and the carousel's "How it was made" slide carry the same wording and the same two Stanford HAI links. `tests/how-this-site-works-2026-10-27.test.js` checks the wording and the facts behind it: each page's security policy lets it contact only itself and the visit counter, the only embedded service is Ask Us, and visit counting leaves out answers and search text. If the site starts calling another service, or the library changes how Ask Us answers after hours, revise the wording before changing the test.

## Light, logo, and the help menu

Every glow on both tools uses one incandescent palette defined in `src/css/theme-plate.css` (`--inc-*`): a white-hot core inside the house golds (#ffe8a0, #ffc72c, #f2a900) with an amber bloom. Lit lamps, the occasional pulse along a seam, the help button while its menu is open, hover glows, and the footer's CC symbols all draw on it. The CC symbols' glow sits behind a thin dark rim so the counters inside each mark stay distinct.

The Library logo is the original white mark. It lifts slightly and glows gold on hover and on keyboard focus; in forced-colors mode it is redrawn in the link color, and it prints in black.

The footer carries the Lewis Library logo (`src/img/library-emblem.webp`) in the site gold (`--gold`, #debb70), set in a recessed plate like the disclosure box below it. It is made from the logo's own pixels, which become the image's transparency and are scaled once; nothing is redrawn, so every icon matches the logo. To regenerate it, start from the Library's logo file again, not from a traced or generated copy. On hover and on keyboard focus it brightens, its glow widens, and it lifts 2px; the lift is skipped when reduced motion is requested. In forced-colors mode it is redrawn in the link color, and it prints in black. The footer reads in this order: emblem, the five links, the license block with its two collapsible panels, the AI-use disclosure, and a closing line with the tool license and last-updated date. From 1100px wide the emblem takes the left column; below that it stacks at 160px wide.

Edison bulbs appear in a few places rather than everywhere: the What If AI bulb icon (`i-bulb`) has a filament that lights white-hot when its link is pointed at or focused, and small Edison bulbs (`--edison`) mark the considerations console in The Register and the current question in What If AI. The help button is a domed yellow-brass rivet with the ✦ stamped into it; it glows softly at rest and brighter on hover, focus, and while its menu is open. It returns to plain white under "more contrast" and forced colors and prints in black. Help-menu items are opaque in every state and sit in an opaque housing; the footer leaves room so the fixed help button never covers the disclosure. In forced-colors mode the logo is redrawn in the link color. `tests/incandescent-2026-11-02.test.js` measures the logo and menu contrast from rendered pixels and checks that nothing behind a menu item shows through it.

## Crimson and steel blue

The help menu ends with a switch between two palettes: crimson, which is the default, and steel blue. Only colors change; layout, wording, textures' grain, gold, and the illustrations are the same in both.

The stylesheets in `src/css` are written once, in crimson. At build time `tools/palette.py` replaces each crimson literal in the CSS bundles with a custom property whose default is that literal and whose value under `html[data-theme="blue"]` is the same color in steel blue at the same relative luminance. Matching luminance keeps every contrast ratio, so text that passes on crimson passes by the same margin on steel. Gold, brass, incandescent yellows, neutrals, and the reds that carry meaning (errors, cautions, the restrictive end of the policy spectrum) are left alone; the list is `KEEP` in that file. `python3 tools/palette.py` prints every translated color. New crimson added to a stylesheet is translated automatically.

`src/js/theme.js` sets the attribute. It loads in the `<head>` without `defer`, so a reader who chose blue never sees crimson first. The choice is kept in this browser's storage only (`lul-whatifai-theme-v1`), carries across both tools and the landing page, and lasts until the page is left if storage is unavailable. Without JavaScript the pages are crimson and the switch stays hidden.

`tests/palette_test.py` checks the translation and `tests/theme.test.js` checks the switch. To run any browser check against the blue palette, set `SITE_THEME=blue`, for example `SITE_THEME=blue npm run test:contrast`.

## Licenses

The original tools are **CC BY-NC-ND 4.0**, with the exceptions in [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md). Every use-case idea keeps its own license, including synthesis and remix entries. Separately licensed guide content, policy quotations, sources, fonts, and dependencies retain their own terms. Earlier CC BY-NC-SA permissions remain in effect for earlier releases.

## Source links and file notices

`content/source-links.json` is a reviewed presentation overlay for activity sources and their references. Verified publisher/resource pages are preferred. Known file links go to `source-file.html`, which explains the possible download and requires a separate choice before contacting the file host. Original release data and PDF locators are preserved.

`tools/source_links.py` rejects new unreviewed file-like primary URLs. Add a verified webpage only after checking its source identity; keep uncertain endpoints behind a notice. Run `npm run test:source-links` after building. See [the October 2026 audit](docs/SOURCE-LINKS-2026-10-27.md) for the complete inventory, evidence, and limits.

The [publisher-destination follow-up](docs/PUBLISHER-DESTINATIONS-2026-10-27.md) records the individual checks of 177 DOI links and identifies which verified destinations were added to the shared policy. Indexed-only results and unresolved versions remain separate from retrieved source webpages.
