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
- `.github/workflows/pages.yml` runs the checks on pull requests and publishes `main` through GitHub Pages. The browser suites run side by side in five groups (saved, matching, pages, accessibility, contrast); the `build` check passes only when every group does, and only then is `main` published.

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

## Edges and the lit ring

Plates and cards have a light rim (`--rim`) against a darkened page, outlined controls sit on a dark fill, and one thing at a time is lit with a gold ring (`--halo`): the current question, an open dialog, and the card or door being pointed at or focused. The rules are the "edges" block near the end of `src/css/theme-plate.css`. Steel blue follows automatically; the plain reading view redefines `--halo` as a solid gold line with no glow. In the light palette the same rules give a dark rim against a paler page, outlined controls on a pale fill, and the ring in crimson. `tests/edges.test.js` (run by `npm run test:theme`) checks all four views.

Question 3's optional level-and-setting questions sit behind the same bar as the expandable sections in a use-case idea's details (`.qmore` shares the rules in `src/css/use-case-accordions.css`), with a note of how many choices are inside.

In a Types of AI pop-up, current examples are a slide of their own before References, and an Examples button in the footer jumps to it.

## Answering What If AI's questions

Each question takes one answer. Selecting the answer that is already selected clears it, by pointer or with Space on the focused option; a double-click selects once. Skip does the same from the foot of the question. `tests/answers.test.js` (run by `npm run test:pages`) covers this and the walkthrough's steps.

## Edit the walkthroughs

The Register's header and floating menu open the nine-step walkthrough in `src/partials/register-tour.html`; `#about` links open it too. What If AI's header and floating menu open the nine-step walkthrough in `src/partials/tour.html`. Saving, comparing, planning and printing, The Register, and feedback and corrections each have a step in it; both walkthroughs describe comparing two or three saved use-case ideas. Each header keeps two buttons: the walkthrough, as the one brass primary, and "How this site works"; the companion tool, the Gen AI guide, and feedback are reached from the floating menu and the footer. Page tests cover keyboard operation, focus, links, browser history, printing, and narrow screens.

## Edit "How this site works"

Both tools state that results come from fixed rules rather than an AI system: The Register in its header, and What If AI beside its questions, so that its header stays short and the first choices sit higher on the page. A "How this site works" button opens the shared six-slide carousel in `src/partials/about.html`: What If AI, The Register, what leaves the browser, Ask Us, links to other sites, and how the site was made. It behaves like the walkthroughs (Previous, Next, dots, arrow keys, Home and End; it never advances by itself), and its slides share one grid cell so the controls never move. Each slide has a painted drawing that uses the `#wc` filter and `wc*` washes defined by the page's walkthrough partial, so a page that includes `about.html` must also include `tour.html` or `register-tour.html`; drawings carry no text and are hidden from assistive technology. The Finder's statement is written in `drawRail` (the rail, on wide screens) and `drawWizard` (the first question, on narrow ones) in `src/js/what-if-ai.js`, and the Ask Us panel in `src/partials/help.html` says when staff answer. These statements must stay literally true. The footer's HCAI and HITL disclosure and the carousel's "How it was made" slide carry the same wording and the same two Stanford HAI links. `tests/how-this-site-works-2026-10-27.test.js` checks the wording and the facts behind it: each page's security policy lets it contact only itself and the visit counter, the only embedded service is Ask Us, and visit counting leaves out answers and search text. If the site starts calling another service, or the library changes how Ask Us answers after hours, revise the wording before changing the test.

## Light, logo, and the help menu

Every glow on both tools uses one incandescent palette defined in `src/css/theme-plate.css` (`--inc-*`): a white-hot core inside the house golds (#ffe8a0, #ffc72c, #f2a900) with an amber bloom. Lit lamps, the occasional pulse along a seam, the help button while its menu is open, hover glows, and the footer's CC symbols all draw on it. The CC symbols' glow sits behind a thin dark rim so the counters inside each mark stay distinct.

The Library logo is the original white mark. It lifts slightly and glows gold on hover and on keyboard focus; in forced-colors mode it is redrawn in the link color, and it prints in black.

The footer carries the Lewis Library logo (`src/img/library-emblem.webp`) in the site gold (`--gold`, #debb70), set in a recessed plate like the disclosure box below it. It is made from the logo's own pixels, which become the image's transparency and are scaled once; nothing is redrawn, so every icon matches the logo. To regenerate it, start from the Library's logo file again, not from a traced or generated copy. On hover and on keyboard focus it brightens, its glow widens, and it lifts 2px; the lift is skipped when reduced motion is requested. In forced-colors mode it is redrawn in the link color, and it prints in black. The footer reads in this order: emblem, the five links, the license block with its two collapsible panels, the AI-use disclosure, and a closing line with the tool license and last-updated date. From 1100px wide the emblem takes the left column; below that it stacks at 160px wide.

Edison bulbs appear in a few places rather than everywhere: the What If AI bulb icon (`i-bulb`) has a filament that lights white-hot when its link is pointed at or focused, and small Edison bulbs (`--edison`) mark the considerations console in The Register and the current question in What If AI. The help button is a domed yellow-brass rivet with the ✦ stamped into it; it glows softly at rest and brighter on hover, focus, and while its menu is open. It returns to plain white under "more contrast" and forced colors and prints in black. Help-menu items are opaque in every state and sit in an opaque housing; the footer leaves room so the fixed help button never covers the disclosure. In forced-colors mode the logo is redrawn in the link color. `tests/incandescent-2026-11-02.test.js` measures the logo and menu contrast from rendered pixels and checks that nothing behind a menu item shows through it.

The help menu closes when focus moves to anything outside it, as well as on Escape and on a click outside. Tab therefore never carries on through the page beneath the open menu and its backdrop. In the plain reading view the walkthrough dots for steps other than the current one keep a 2px outline, since the glow that marks them elsewhere is off. The lines under "Your answers" wrap instead of ending in an ellipsis, so a reader's own text spacing cannot cut them off. `tests/reader.test.js` (run by `npm run test:theme`) checks all three.

## Results, and the entry for work without an AI tool

What If AI's results lead with one group: exact matches when there are any, otherwise possible fits, otherwise close matches. The title counts that group, one sentence invites the reader to open or save a use-case idea, and six cards are drawn at a time. Every other group sits under "Broader possibilities", folded in a disclosure whose summary is its heading and count; a group the reader opens stays open while more cards are drawn. The matching rules and the groups themselves are unchanged.

The landing page, What If AI's first question, and The Register's use-case ideas section each link to `register.html#activities?op=none`, the use-case ideas in which no one operates an AI tool.

## Saved use-case ideas: compare, print, move, export

`src/js/saved-tools.js` adds four things to the saved list and to a use-case idea's details. All of them run in the browser; none sends anything anywhere.

- **Compare.** In Saved use-case ideas, tick Compare on two or three and choose Compare selected. The table has one column per idea and six rows: purpose, participants, preparation, access requirements, human judgment, and the route without AI. `facets()` lists the record fields behind each row. Every cell quotes the record; a field the record lacks reads "Not stated", and nothing is inferred. The comparison prints with each idea's citation, license, and attribution.
- **Two printouts.** Full reference (the default) prints everything in each record, one idea to a page. Planning summary prints each idea's complete description, at-a-glance facts, division of work, cautions, route without AI, and its whole Source and license section, and leaves out three reference sections: Adapting it, What the source reports, and Works it draws on. It is `detailHTML(a, {brief: true})`: sections are omitted, and no field is shortened. The record's shared description field is not touched.
- **Move a list.** Download this list writes a small JSON file (`format: "what-if-ai-saved-list"`, the saved ids and titles). Restore a list from a file reads one in the browser and first describes it: how many ideas would be added, how many are already saved, how many are no longer in the collection, and how many trial plans it carries. Nothing changes until the reader chooses Add to my saved list; the file's ideas are then added to whatever is already saved. A file over 2 MB, with more than 3,000 entries, from another format version, or with an entry that is not shaped like an idea identifier is refused whole. There is still no account.
- **Copy or export one idea.** In an idea's details, Copy or export offers the idea as text ("Copy as assignment text" for teaching ideas) or as a Word document. Both are built from the whole record (`detailHTML(a, {print: true})`, the same sections as the full details and the full printout), reproduced as written, and always include the source, license, attribution, and change notes, plus a link to the record online. A reader who has written a trial plan for the idea can tick Include my trial plan; it is left out otherwise. The `.docx` is written in the browser as a ZIP of stored XML parts, with no library.
- **Export the whole list.** Download all as a Word document, in Saved use-case ideas, writes every saved idea into one document, one idea to a page, each followed by any trial plan written for it.

`tests/saved-tools.test.js` (`npm run test:saved`) checks each of these, including that descriptions, citations, licenses, attribution, and change notes appear whole in both printouts and both exports, that the Word file is a valid archive of well-formed XML whose paragraphs match the copied text, and that nothing leaves the browser. It also exports all 1,033 ideas and checks that every description, note, citation, license, and attribution in each record appears in the export as written. One step restores a list downloaded in Chromium into Firefox; it runs in the deploy workflow and is skipped, with a message, where Firefox is not installed.

## Plan a small trial

An optional worksheet a reader can attach to a saved use-case idea, from the saved list or from the idea's details (`src/js/trial-plan.js`, which extends `saved-tools.js`). It asks five questions, in the reader's own voice:

1. What am I trying to improve?
2. What will I try, and what remains my responsibility?
3. What preparation and checking will this require?
4. What would indicate that it helped?
5. When would I revise or abandon the approach?

Beside the questions, folded until asked for, the worksheet quotes what the record already says: what is produced, the judgment that stays with people, what output is checked against, cost and access, data, the course AI policy it assumes, and its route without AI, for comparison. The Library supplies the questions and the quotations and suggests no answers.

Answers are saved as they are typed, in this browser only (`lul-whatifai-plans-v1`), and are never sent anywhere. A plan belongs to a saved idea: starting one saves the idea, and removing the idea (after a confirmation when something is written) or clearing the list removes its plan. A plan prints by itself with its idea's planning summary, prints after its idea in both saved printouts, joins the idea's text and Word exports, marked as the reader's own notes, when the reader ticks Include my trial plan, and travels in a downloaded list; restoring a list fills only questions left empty in the receiving browser. A worksheet open in two tabs shows what is written in the other, unless something typed in this tab is still waiting to be saved.

`tests/trial-plan.test.js` (run by `npm run test:saved`) covers the worksheet, storage, two tabs, printing, export, moving, and removal.

## Crimson, steel blue, and light

The help menu has a "Color palette" row with three tiles: Crimson, which is the default, Blue (steel blue), and Light. Each is one click away. The current palette's tile is filled and shows a check mark in place of its swatch, and is the pressed one (`aria-pressed`) for assistive technology. The swatch colors are attributes in the markup, not CSS, so the palette pass leaves them the same in every palette. Only colors change; layout, wording, textures' grain, and the illustrations are the same in all three.

The stylesheets in `src/css` are written once, in crimson. At build time `tools/palette.py` replaces each crimson literal in the CSS bundles with a custom property whose default is that literal and whose value under `html[data-theme="blue"]` is the same color in steel blue at the same relative luminance. Matching luminance keeps every contrast ratio, so text that passes on crimson passes by the same margin on steel. Gold, brass, incandescent yellows, neutrals, and the reds that carry meaning (errors, cautions, the restrictive end of the policy spectrum) are left alone; the list is `KEEP` in that file. `python3 tools/palette.py` prints every translated color. New crimson added to a stylesheet is translated automatically.

The light palette (`html[data-theme="light"]`) is derived in the same pass from the same literals, but every color takes part, not only the crimsons (`paper()` in `tools/palette.py`):

- Luminance is turned over with `L' = 0.0525 / (L + 0.05) - 0.05`, which exchanges black and white and leaves the WCAG contrast ratio between any two colors exactly as it was. The dark plates become pale and the pale lettering becomes ink.
- Crimson plates and grounds become a warm off-white metal and are then lifted further toward white. The lift only raises pale grounds, so dark lettering on them gains contrast.
- Gold lettering, lines, and filled buttons become Lewis crimson (hue of `#940731`), held no darker than the deep maroon so it still reads as crimson. Cream and white lettering becomes near-black ink.
- Other hues keep their hue: the reds in `KEEP` stay red, green stays green.
- In `box-shadow`, `text-shadow`, and `filter`, a dark color is a cast shadow and stays dark at about a third of its strength; white highlights stay white.
- Rules inside `@media print` and `@media (forced-colors)` are left alone, because they already put dark ink on white.
- `ISLANDS` lists parts that keep their crimson-palette colors in light. It holds one entry, the help button, which stays a yellow-brass rivet.

`src/css/light.css` holds the few things the build cannot derive: the header logo and the footer emblem are drawn through a mask in `#940731` (the emblem's gold is in the image's pixels), the page ground is not dimmed, the walkthrough drawings keep their cream drawing paper, and native controls use `color-scheme: light`. The build leaves any rule that names `html[data-theme="light"]` exactly as written, so colors in that file are written as they should appear. `python3 tools/palette.py light` prints every color and its light twin.

`src/js/theme.js` sets the attribute. It loads in the `<head>` without `defer`, so a reader who chose blue or light never sees crimson first. The choice is kept in this browser's storage only (`lul-whatifai-theme-v1`), carries across both tools and the landing page, and lasts until the page is left if storage is unavailable. Without JavaScript the pages are crimson and the switch stays hidden.

`tests/palette_test.py` checks both translations and `tests/theme.test.js` checks the switch through all three palettes. To run any browser check against another palette, set `SITE_THEME=blue` or `SITE_THEME=light`, for example `SITE_THEME=blue npm run test:contrast`. `npm run test:light` runs the axe and rendered-contrast suites in the light palette, and the workflow runs both on every pull request.

## Plain reading view

The help menu's last item switches the plain reading view on or off. It is a separate choice from the palette and works in any of the three. The pages, wording, and controls are the same; `src/css/plain.css` takes off the brushed textures, bolts, seams, lamps, glows, letter shadows, and the moving light, flattens brass to gold, and sets everything in Barlow in sentence case in place of the condensed display face and the monospaced readouts.

`src/js/theme.js` sets `data-plain` on `<html>` before the page is drawn and keeps the choice in this browser's storage only (`lul-whatifai-plain-v1`), across both tools and the landing page. Without JavaScript the pages are textured and the switch stays hidden. The colors in `plain.css` are crimson literals, so `tools/palette.py` gives them steel-blue and light twins like any others.

`tests/plain.test.js` (run by `npm run test:theme`) checks that the view changes no word and no control, that the tool still works in it, and that it passes axe in crimson and steel blue. To run any browser check in the plain view, set `SITE_PLAIN=1`, alone or with `SITE_THEME=blue` or `SITE_THEME=light`.

## Low-vision checks

`npm run test:lowvision` measures, from rendered pixels, what axe does not: it runs four tests in each of the six views (crimson, steel blue, and light, each textured and in the plain reading view) and prints one summary. A full run takes about half an hour; `VIEWS=light,light-plain npm run test:lowvision` runs only the views named, and `LOWVISION_OUT=dir` keeps the measurements.

- `tests/contrast.test.js` measures text over the textured surfaces against WCAG AA.
- `tests/nontext.test.js` measures the boundaries of controls, the indicators of state (a chosen answer, a ticked filter, the question bar, the current tab), and the keyboard focus indicator at every Tab stop, against 3:1 (SC 1.4.11, 2.4.7, 2.4.13).
- `tests/vision.test.js` takes every pair of colors those two measured and repeats the contrast under simulated protanopia, deuteranopia, and tritanopia (Machado, Oliveira & Fernandes, 2009, at full severity). Having no color vision needs no simulation, because WCAG contrast is already a ratio of luminances.
- `tests/reflow.test.js` opens each state at 640×512 and 320×256 (a 1280×1024 window at 200% and 400%), and with the text spacing a reader may impose, and checks that nothing scrolls sideways, no text is cut off, and Tab never lands on something wholly covered (SC 1.4.4, 1.4.10, 1.4.12, 2.4.11).

The workflow runs them on every pull request and every push to `main`, one job for each of the six views (`Checks (lowvision-light)` and so on), and nothing is published unless all six pass. Each job saves its measurements as an artifact. They are not part of `npm test`, which would take half an hour longer.

When they were first run, on November 23, 2026, they reported the same three findings in every palette: focus carrying on beneath the open help menu, a line under "Your answers" cut off by a reader's text spacing, and walkthrough dots in the plain reading view that could not be seen. All three are fixed (see "Light, logo, and the help menu"), and `tests/reader.test.js` checks each directly.

The tests do not replace a person using a screen magnifier or a screen reader.

## Licenses

The original tools are **CC BY-NC-ND 4.0**, with the exceptions in [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md). Every use-case idea keeps its own license, including synthesis and remix entries. Separately licensed guide content, policy quotations, sources, fonts, and dependencies retain their own terms. Earlier CC BY-NC-SA permissions remain in effect for earlier releases.

## Source links and file notices

`content/source-links.json` is a reviewed presentation overlay for activity sources and their references. Verified publisher/resource pages are preferred. Known file links go to `source-file.html`, which explains the possible download and requires a separate choice before contacting the file host. Original release data and PDF locators are preserved.

`tools/source_links.py` rejects new unreviewed file-like primary URLs. Add a verified webpage only after checking its source identity; keep uncertain endpoints behind a notice. Run `npm run test:source-links` after building. See [the October 2026 audit](docs/SOURCE-LINKS-2026-10-27.md) for the complete inventory, evidence, and limits.

The [publisher-destination follow-up](docs/PUBLISHER-DESTINATIONS-2026-10-27.md) records the individual checks of 177 DOI links and identifies which verified destinations were added to the shared policy. Indexed-only results and unresolved versions remain separate from retrieved source webpages.
