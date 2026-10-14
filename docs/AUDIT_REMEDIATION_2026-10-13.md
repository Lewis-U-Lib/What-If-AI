# October 13 corrections (release 5fb0a19800a9)

This record describes the corrections made after the October 10–13 diagnostic audit. They cover seven requests:

1. Change notes that record what changed.
2. Prompts shown as the source's own.
3. The cost, account, approval, data, and "who uses AI" requirements.
4. The "Nothing my students wrote goes into a tool" limit.
5. Rights and attribution.
6. Accessibility.
7. The privacy notice.

The collection still contains 1,033 use-case ideas and 618 sources.

Two files make every change reviewable:

- [`research/remediation-2026-10-13-changes.csv`](research/remediation-2026-10-13-changes.csv) lists every changed field with its value before and after and the reason for the change. It has 4,541 rows covering 1,058 ideas, sources, and policy entries.
- [`research/remediation-2026-10-13-library-decisions.csv`](research/remediation-2026-10-13-library-decisions.csv) lists the 428 points the checkers could not settle from the sources. Each needs a library decision.

## How the data corrections were made

Each idea was compared with its adapted source, one source at a time. Cached full texts were used where they existed; otherwise the source was read on the web without bypassing paywalls or bot checks.

1. **First pass.** The first pass checked 949 ideas in 60 batches and wrote:
   - change notes
   - prompt checks
   - requirement-metadata decisions with reasons
   - attribution details for each adapted item: its own title, creator, year, link, and license as the item states it
   - corrected locators
2. **Independent check.** A separate checker re-read 36 changed ideas against their sources. About a quarter still had problems. Some were application errors: a prompt was restored to the source's exact text while its note still said it had been shortened, and a license URL was misread as "CC BY 4.0 DEE". Others were genuine gaps, such as small additions left undisclosed. The application errors were fixed.
3. **Second pass.** A second source-checked pass then verified and corrected all 676 source-based ideas (49 batches). It corrected statements the sources do not support, disclosed omissions, completed cut-off locators and titles, and replaced placeholder creators.
4. **Wording sweep.** A final sweep removed internal production wording ("workbook", "theory register", "the parent", "this record", "Change to the documented operation:") from 181 ideas.

| Change | Before | After |
|---|---|---|
| Stock change notes (five shared process sentences) | 650 ideas | 0 |
| Distinct change notes | 390 | 1,033 (each idea has its own) |
| Attribution lines with a "Changes:" notice | 185 | 920 |
| Student-operated ideas recorded as "nothing goes into a tool" (`sen: none`) | 292 | 0 |
| Ideas confirming no account, equipment, or approval (`pc: none`) | 389 | 132 |
| Licensed adaptations labeled "Public domain (U.S. Government work)" | 14 | 0 |

### 1. Change notes
- Every change note now says what the source contains, what this version keeps, and what the collection's compilers changed, added, or removed. That includes retitling, who operates AI, AI added or made optional, prompts the compilers wrote, and content omitted.
- Substantive redesign is attributed to "the compilers". About 265 ideas are marked as substantially redesigned.
- No change note uses internal production vocabulary. A new regression test enforces this.

### 2. Prompts
All 107 prompts shown under "A prompt the source provides" were checked against their sources.

- **Moved (31).** These were not in the source, including the 12 editorial prompts the audit found and 19 more. They now appear under "A possible adaptation" as "A prompt written for this collection", without quotation marks, and each change note says the compilers wrote the prompt.
- **Replaced (25).** These differed from the source and were replaced with its exact text.
- **Kept (51).** These match the source.
- **Not checked (3).** For CAN-W-workflow-009, CAN-W-workflow-010, and CAN-L-069 the source could not be read, so the prompt could not be compared. They are listed for a decision.

### 3. Requirement metadata (cost, account, approval, data, who uses AI)
Values were changed only where the idea's own text or its source contradicted them, and every change records its reason:

| Field | Values changed |
|---|---|
| `sen` | 369 |
| `pc` | 285 |
| `eq` | 107 |
| `cap` | 92 |
| `pol` | 48 |
| `op` | 32 |
| `dis` | 32 |

- **Account requirement.** Where students operate a free-tier tool and nothing establishes whether an account is needed, `pc` is now `not_specified`, so the account, equipment, and approval limits list the idea under "Check requirements". Where a named platform requires sign-up, it is `account_verification`.
- **Cost (`eq: free_tier`).** This was changed only when the record or source contradicts it: a paid plan, subscription, institutional license, or a tool whose free access has ended. Silence about cost for a general chat assistant was not treated as an error. Pass suggestions that rested only on that silence were not applied: 139 of them (44 from the first pass, 95 from the second).
- **Instructor-only cost.** The convention `no_tool_needed` with `op: faculty_or_staff` ("No student AI tool; instructor access and cost need checking") was kept. 46 ideas now use it.
- **Routes without AI.** Five pieces of text shown as "A route without AI" were not routes, and they made "My students won't use an AI tool themselves" confirmed. They were removed.

### 4. "Nothing my students wrote goes into a tool"
- Every idea in which students operate a tool now records what goes into it (`sen` is never `none` when `op` is `students`). `tools/check_release.py` now rejects a release that breaks this.
- The matcher also excludes student-operated ideas from this limit, whatever their input category. `docs/MATCHING.md` and the matching tests were updated.
- The Register's filters now use the same rules and wording as What If AI:
  - "Nothing anyone has to pay for"
  - "Nothing students wrote goes into a tool"
- When "Students use no AI tool" admits an idea through its route without AI, the Register now shows the route note.
- The AI guide's "Teaching with no student AI tool use" entry now opens the teaching ideas only.

### 5. Rights and attribution
- **Attribution lines.** Every licensed adaptation's "Attribution to keep when reusing" line now names the adapted item's own title, creator, a link, the license as the source states it, and a "Changes:" notice.
  - No license version is inferred: "version not stated" is kept where the source gives none, and no deed is linked for it.
  - Credits that sources ask for were added. Examples include the #creativeHE collection and editors, the AI Pedagogy Project, the Stanford Center for Teaching and Learning, the Carpentries, upstream prompt authors, and UNESCO's ISBN and derivative-work notice.
- **Multi-item collections.** Ideas drawn from prompt libraries and other multi-item collections now show the item they adapt, not an unrelated item. The source entries are titled with the collection: Rosehill, LAXIMA, Perry, the UK AI Playbook, Gamage & Wanigasooriya, Therriault, and Mongefranco. Three entries titled with a journal name now carry the article title.
- **Links and locators.** Links open the adapted item where it has its own page. Examples include TextGenEd chapters and Continuing Experiments items, the NSPA prompt categories, and the Rosehill files. Unfollowable locators ("lines 75–82", "DOI suffix 2.07", text cut off with "…") were replaced with pages, sections, and table rows.
- **U.S. Government source.** The 14 adaptations of the Mosovsky et al. playbook (a U.S. Government work) are the compilers' own writing, not government works. Following the collection's precedent for adaptations of public-domain sources, they now carry CC BY-NC-SA 4.0, and the source's status is shown separately. *Library decision: CC0 would also be consistent if public-domain status is intended.*
- **License corrections from the source's own statement:**
  - CAN-A2-A-081: CC BY 4.0
  - CAN-G-GAP-013: CC BY 4.0
  - CAN-W-human-029: "CC BY-NC-SA (version not stated)"
  - CAN-W-lis-022 and CAN-W-lis-023: CC BY-NC 4.0, for the adapted appendix sheets
  - CAN-W-oer-029: CC BY-SA 4.0
  - Several "version not stated" labels whose item pages state 4.0
  - The 28 LAXIMA entries now carry a note about the site's Terms of Use.
- **Policy examples.** The University of Delaware excerpt now quotes the "Use only with prior permission" statement shown under that label. The dated snapshot's range was corrected, and the source text and its hash are unchanged. All 21 sheet links now open the Policies tab (`gid=0`).
- **Source entries corrected:**
  - CSR-0073: authors, license, and DOI
  - CSR-0270: author order
  - CSR-0380: author name

### 6. Accessibility and print
- **Focus.** Focus returns to the control that opened a dialog after closing to a section address, after removing the last filter chip, and after "Clear all filters" inside the results. The `h-activities` heading id is fixed.
- **Status messages.** These go to the open dialog's own live region. Copy-link results are shown beside the button, with the address in a selectable field when copying is unavailable.
- **Reflow.** Long addresses wrap. At 320 px, none of the 1,033 ideas scrolls sideways in either tool (full scan, Chromium). The Register keeps its scrollbar gutter on desktop screens only.
- **Ask Us panel.** It is sized for the 125% desktop zoom and fits a 1280×720 screen.
- **Contrast.** Walkthrough step dots now have a gold ring of at least 5.5:1, and policy-position digits are at least 6.6:1.
- **Keyboard scrolling.** The What If AI walkthrough text can be scrolled from the keyboard in WebKit.
- **Print.**
  - "Print or save as PDF" in an idea's details prints that idea with its license and attribution, and so does the browser's own Print command while an idea is open.
  - Saved printouts include ideas saved under earlier-edition identifiers.
  - Printed text is dark.
  - Results printouts say where attribution is found.

### 7. Privacy notice
The footer now states what the site actually records:

- **Saved selections** stay in the browser.
- **Site usage.** Umami, which uses no cookies, records page visits: page address and title (without search text or the part after #), referring site, browser, operating system, device type, screen size, language, and country.
- **Feedback.** Answers to the feedback question are recorded with the idea's identifier, which tool was used, and any follow-up choices, linked to the visit.
- **Access.** Only the library team can view the reports, and the library does not sell or share them.
- **Do Not Track.** The site does not currently respond to Do Not Track or Global Privacy Control.
- **Ask Us and the feedback form** run on Springshare services the library uses.

The saved-drawer and walkthrough sentences no longer say "nothing is sent anywhere". They now say the saved list is not sent to the library or anyone else.

*Decisions for the library:*

- **Which ideas are opened.** Opening an idea is not currently recorded; data-exclude-hash removes the `#act=` part of the address. If the library wants that tracked, the site would need an explicit event, and the notice would need one more sentence.
- **Do Not Track.** Setting `data-do-not-track` on the analytics script would make the site honor Do Not Track.

## Verification
- `npm test` passes in full: release check, editorial tests, build, matching, site, licensing, pages, review fixes, types, feedback, accessibility, and contrast.
- `tests/remediation-2026-10-13.test.js` adds checks for:
  - student input
  - accounts
  - the U.S. Government label
  - internal wording in change notes
  - attribution
  - moved prompts
  - the policy excerpt and links
  - focus restoration
  - copy status
  - printing an open idea
  - 320 px reflow
  - the Register route note and labels
  - the privacy notice
- **Updated pinned counts:**
  - 17 distinct licenses (no longer 18)
  - 46 instructor-preparation ideas (no longer 44)
  - The page-weight budgets were raised by 200 KB to cover the longer change notes and attribution lines, an increase of about 170 KB compressed.

## Still open
`research/remediation-2026-10-13-library-decisions.csv` lists 428 points:

| Category | Points |
|---|---|
| Rights and attribution | 189 |
| Wording or content | 123 |
| Requirement metadata | 83 |
| Source access | 32 |
| Tool availability | 1 |

The ones with the widest effect are:

- **#creativeHE (CSR-0207, CSR-0212).** The PDFs state CC BY-NC-SA 4.0 while Zenodo's metadata says CC BY 4.0. The more restrictive terms are kept.
- **LAXIMA prompt library (28 ideas).** The page licenses its prompts CC BY 4.0, but the site's Terms of Use exclude derivative use.
- **TextGenEd: Continuing Experiments (52 ideas).** The only license is the release page's "CC-BY-NC" notice, with no version. WAC's site default is CC BY-NC-ND 4.0. A few items print their own terms (CC BY-SA 4.0, CC BY-NC-SA 4.0, "CC-NA").
- **Copyleft and upstream terms.** GNU FDL 1.3 or later (CAN-D-ADM-100, -101) and LGPL-2.1 (CAN-G-GAP-022) are the only licenses for the adapted text. Upstream terms are unconfirmed for prompts that sources credit to others (Park et al.) and for material from commercial or ND-licensed works (Bowen & Watson; Perkins et al.).
- **MDPI articles.** Page metadata cites CC BY 3.0 while Crossref gives 4.0. The printed statement could not be read.
- **Unreadable sources.** For CAN-W-lis-020, CAN-A2-A-011, CAN-A2-A-009/-010 (Wang & Cai), and the Anders (2026) book, change notes rest on abstracts or metadata and say so.
- **Dropped source requirements.** Several ideas omit requirements the source sets, such as a consent form, an equity check, aggregate-only data, or an AI-use acknowledgment. Their change notes disclose the omission, and the library may restore them.

## PR #23 review follow-up (October 14)

Two code-review findings were reproduced in the saved-idea and dialog logic and corrected before release:

- Saved selections normalize earlier-edition aliases to current identifiers and remove duplicates. Both identifiers refer to the same saved state when checking, adding, removing, or toggling an idea. Unavailable identifiers remain in the drawer so readers can remove them. Writes store the normalized list; reading alone does not rewrite browser storage.
- Status announcements follow dialog opening order. When an idea opens above the Saved drawer, save and copy-link messages go to the idea's live region. Closing it returns announcements to the drawer, then to the page when the drawer closes.

The browser regression checks in `tests/remediation-2026-10-13.test.js` cover both tools, duplicate legacy/current saves, unavailable identifiers, saved-button state, alias removal, nested-dialog save/copy announcements, and announcement routing after each dialog closes. These checks verify live-region placement in the browser, not actual speech output from a screen reader.

The 428 library decisions above remain open; the technical follow-up does not resolve source, rights, content, or policy questions.

These corrections are prepared on `audit-fixes-2026-10-13`. Merging PR #23 to `main` triggers the tested GitHub Pages release; this document alone does not establish deployment status.
