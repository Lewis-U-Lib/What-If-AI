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

Every carousel slide has a topic-specific line drawing. The 55 drawings are stored as
11 SVG atlases in `src/img/types-*.svg` (five scenes stacked in each); CSS selects a scene
per slide, a type's card shows its first scene, and the build fingerprints each asset. The
artwork is decorative and hidden from assistive technology; the adjacent text remains the
complete explanation. See [the illustration map](docs/AI-TYPE-ILLUSTRATIONS.md).

## Edit the walkthroughs

The Register's header and floating menu open the nine-step walkthrough in `src/partials/register-tour.html`; `#about` links open it too. What If AI's header and floating menu open the seven-step walkthrough in `src/partials/tour.html`. Each hero keeps two buttons: the walkthrough, as the one lit primary, and "How this site works". The walkthrough has no second button on the page. The top bar carries the Library logo, the two tools as tabs (the open one is marked with `aria-current`), the saved-ideas button, and Pause motion; the Gen AI guide and feedback are reached from the floating menu and the footer. Page tests cover keyboard operation, focus, links, browser history, printing, and narrow screens.

## Edit "How this site works"

Both tools state in their headers that results come from fixed rules rather than an AI system, and a "How this site works" button opens the shared six-slide carousel in `src/partials/about.html`: What If AI, The Register, what leaves the browser, Ask Us, links to other sites, and how the site was made. It behaves like the walkthroughs (Previous, Next, dots, arrow keys, Home and End; it never advances by itself), and its slides share one grid cell so the controls never move. Each slide has a line drawing in the walkthroughs' style (`svg.il`: icy-blue lines in a dark well, with one lit yellow element marked `.il-lit` and red only for what went wrong); drawings carry no text or inline styles and are hidden from assistive technology. The Finder repeats a short version beside the questions (`drawRail` and `drawWizard` in `src/js/what-if-ai.js`), and the Ask Us panel in `src/partials/help.html` says when staff answer. These statements must stay literally true. The footer's HCAI and HITL disclosure and the carousel's "How it was made" slide carry the same wording and the same two Stanford HAI links. `tests/how-this-site-works-2026-10-27.test.js` checks the wording and the facts behind it: each page's security policy lets it contact only itself and the visit counter, the only embedded service is Ask Us, and visit counting leaves out answers and search text. If the site starts calling another service, or the library changes how Ask Us answers after hours, revise the wording before changing the test.

## Look, light, logo, and the help menu

The alloy look is defined in `src/css/theme-alloy.css`, with the instrument details in `src/css/lab.css`: brushed blue steel on a near-black ground, bolted frames, and dark wells for inputs, readouts, and drawings. The textures are procedural (inline SVG noise and CSS gradients). The palette is the Library's panel for this design: #0b0d0f, #2f5f75, #73c4d4, #ffe584, #e8c446, #940731, #c22033, and the grays #bab9af and #7e7f73.

Two lights are used. Icy blue (`--ice`) draws lines and frames, the lit bar under each hero, the pulse that now and then runs along a seam, and the band along the top of the footer. Yellow (`--lit`, with the `--inc-*` glow palette) marks whatever is current or primary: the open tab, the current question, a checked option, the one primary button, lit dots, and the help button. Headings are white.

The lit bar breathes slowly and the seam pulse is occasional. Pause motion in the top bar (`src/js/motion.js`) holds both still for the browser tab; nothing moves under reduced motion or "more contrast", and the lit bar holds still on phones, where the button has no room.

The Library logo is the original white mark, in the top bar on the two tools and above the hero on the landing and 404 pages. It gains a soft glow and one pass of reflected light on pointer hover; keyboard focus uses the shared outline. In forced-colors mode it is redrawn in the link color, and it prints in black. In the footer, the Library emblem sits in a chrome ring, centered on the circle that encloses its artwork.

The What If AI bulb icon (`i-bulb`) has a filament that lights when its link is pointed at or focused. The help button is a lit yellow orb with the ✦ stamped into it; it glows softly at rest and brighter on hover, focus, and while its menu is open. Under "more contrast" it trades the glow for a plain ring, and in forced colors it uses the system button colors. Help-menu items are opaque in every state and sit in an opaque housing; the footer leaves room so the fixed help button never covers the disclosure. `tests/incandescent-2026-11-02.test.js` measures the logo and menu contrast from rendered pixels and checks that nothing behind a menu item shows through it; `tests/contrast.test.js` measures the text on every brushed surface.

## Licenses

The original tools are **CC BY-NC-ND 4.0**, with the exceptions in [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md). Every use-case idea keeps its own license, including synthesis and remix entries. Separately licensed guide content, policy quotations, sources, fonts, and dependencies retain their own terms. Earlier CC BY-NC-SA permissions remain in effect for earlier releases.

## Source links and file notices

`content/source-links.json` is a reviewed presentation overlay for activity sources and their references. Verified publisher/resource pages are preferred. Known file links go to `source-file.html`, which explains the possible download and requires a separate choice before contacting the file host. Original release data and PDF locators are preserved.

`tools/source_links.py` rejects new unreviewed file-like primary URLs. Add a verified webpage only after checking its source identity; keep uncertain endpoints behind a notice. Run `npm run test:source-links` after building. See [the October 2026 audit](docs/SOURCE-LINKS-2026-10-27.md) for the complete inventory, evidence, and limits.

The [publisher-destination follow-up](docs/PUBLISHER-DESTINATIONS-2026-10-27.md) records the individual checks of 177 DOI links and identifies which verified destinations were added to the shared policy. Indexed-only results and unresolved versions remain separate from retrieved source webpages.
