# Record review, 2026-10-06

`content/record-review.json` is the seventh data stage (`tools/record_review.py`). It runs after
the AI-use review, pins its input and output like the earlier stages, and applies the decisions
taken after the October 2026 audit and the review of this change. Both tools now serve
**1,033 activities / 618 sources** (1,078 / 637 before).

This is a first correction pass. It does not close the audit: section 10 lists what is still open.

| Change | Records | Why |
|---|---|---|
| Synthesis records published with a source-access label: a source item is not openly licensed | 115 | WIA-01; first held, then released with labels (section 1) |
| Records held: their own license wording breaks the source's terms | 5 | Hold clear violations; flag the rest |
| Activities withdrawn: the only AI step was added editorially | 34, one provisional | September 29 scope decision (WIA-18) |
| Remixes held because their parent was withdrawn or held | 6 | A remix must build on a published activity |
| Reviewed corrections to activity fields | 139 on 65 activities | WIA-04, WIA-05, WIA-08, WIA-15, the review of this change |
| Source-access labels | 115 | WIA-01 |
| Reviewed corrections to source records | 32 fields | WIA-15 |
| Page text held in the data | 5 | D-01, D-07, D-12 |
| Records flagged for review, publication unchanged | 249 | License, scope and coding questions |

Held and withdrawn records are not deleted. They stay intact in the data release and the
earlier stages; releasing one means deleting its entry from the manifest and running
`python3 tools/record_review.py --pin`, which recomputes the pinned counts and hashes. Check the
diff before committing: only the entry, the counts, and the hashes should change.

## 1. Source items that are not openly licensed: published with a label (115)

The audit counted 114 synthesis records (WIA-01, strict reading) that use a source item, as
published and by link, that is not openly licensed. WIA-S-STE-A-08 meets the same rule: its source
item carries no page-level license, and its images ask for permission beyond fair use. The first
pass held all 115. Weighing what they add (coverage of fields and tasks the rest of the collection
reaches thinly, and designs found nowhere else in it), they are published again, each with a
source-access label (`sa`). Each label is a reviewed correction that names the item and quotes
its terms.

| Label | Records | Meaning |
|---|---|---|
| `not_open` | 86 | The item carries no clear open license. |
| `unmodified` | 21 | The item may be shared as published but not changed (NoDerivatives, or a reproduce-only permission). |
| `restricted` | 8 | Using the item needs a purchase, membership, subscription, or permission first. |

None of these records copies or adapts its item. The write-up is the collection's own, under its
CC BY-NC-SA 4.0 license; it cites the item and links to it. For readers:

- **Card:** a "Source item" fact with the label.
- **Activity page and print:** the label under "At a glance", and a note under "Before you use it"
  that names the item, says what using it requires, and points to its terms in The Register.
- **The Register:** a "Source items open to adapt" filter, which leaves out all 115. "No cost to participants" leaves
  out `restricted` records, so it confirms exactly what What If AI confirms.
- **What If AI:** a `restricted` record is never a confirmed fit for "Nothing anyone has to pay
  for" or "No special equipment, travel, or purchases"; it is listed as one to check.
- **Statements:** the synthesis set's description, the Sources legend, the Register walkthrough and
  `NOTICE.md` say that activities adapt only openly licensed works, and that some synthesis
  activities use a published item as is, by link, under its own terms (rows D-01 to D-05).
- **Build:** a fourth consistency rule, `source_access_has_item`: a label may sit only on a record
  that lists a "Used unmodified" item.

The restricted records say what access they need in their risks. Three needed a correction to do so:
WIA-S-SOC-B-08 (membership or a $10 purchase, and a permissions request from every user; its cost
and prerequisite codes are corrected too), and WIA-S-BUS-B-04 and -05 (the simulation is licensed
per participant).

## 2. Licenses: hold clear violations, flag the rest

A **clear violation** is a record whose own license statement contradicts its source's license
wording. Five were found, checked against the source pages on 2026-10-06, and held:

| Record | Record states | Source states |
|---|---|---|
| CAN-W-health-018 | CC BY 4.0 | CC BY-NC 4.0 (Dove Medical Press) |
| CAN-W-human-018, -019, -022, -023 | CC BY-NC 4.0 | CC BY-NC-SA 4.0 (UND AI Assignment Library) |

Each returns once a person relabels it to its source's license. Their two remixes (WIA-R-SRCH-03,
WIA-R-VIDG-05) return with them.

No published record adapts a NoDerivatives work, a work with no stated license, or a work under
copyright, and no set record adapts a CC BY-SA work. Everything else is **flagged** in the
manifest and stays published:

| Flag | Records | Question |
|---|---|---|
| `license_sharealike_under_site_license` | 31 | Each states its source's CC BY-SA license, but the footer and `NOTICE.md` place write-ups under CC BY-NC-SA 4.0. The four condensed CC BY-SA policy quotations raise the same question. A rights decision |
| `license_version_not_stated` | 61 | The source names no license version |
| `license_statements_conflict` | 74 | The source's statements differ (including #creativeHE: PDF CC BY-NC-SA 4.0, Zenodo CC BY 4.0); the record follows the stricter terms and says so |
| `license_public_domain_us_only` | 14 | The record says "Public domain (U.S. Government work)"; the source adds that foreign copyright may apply |
| `license_software_or_copyleft` | 12 | GNU FDL, LGPL, MIT, BSD, Apache: confirm the notices each requires |
| `license_evidence_metadata_only` | 1 | Confirmed from repository metadata only |

Not legal advice. The library's copyright contact should settle the ShareAlike question.

## 3. Withdrawn: AI step added editorially (34)

Every activity in the collection uses, is about, or analyzes AI. In these 34 the only AI step was
added by the collection's editors: 33 adapt sources that do not involve AI, and one (CAN-A2-A-143)
deliberately leaves its source's AI, camera-based engagement detection, out of the activity. Each
withdrawal names its source and quotes the record's AI step. The stage re-checks that the record's
change note says "AI role and deliverable specified editorially". CAN-A2-A-132's article could not
be read automatically. Its withdrawal rests on the earlier review in `docs/AI-USE-2026-10-05.md`
§4.3, so it is marked **provisional** (`"status": "provisional"`) until a person reads the article.

| Source | Records |
|---|---|
| Winstone et al. (2017), feedback recipience | CAN-A2-A-038 to -047 |
| Nicol (2021), internal feedback | CAN-A2-A-048, -049 |
| Alemdag & Narciss (2025), peer assessment | CAN-A2-A-059 |
| Ramos-Vallecillo et al. (2024), thinking routines | CAN-A2-A-064 to -071 |
| Li (2026), argumentation scaffolds | CAN-A2-A-099 |
| Camacho (2026), embedded business communication | CAN-A2-A-132 |
| Arruabarrena et al. (2019), student-generated content | CAN-A2-A-141 |
| Wu et al. (2023), computer vision (left out of the activity) | CAN-A2-A-143 |
| Sweller et al. (2019), cognitive architecture | CAN-A2-A-209 to -217 (eight records) |
| Yüksel (2025), design-based STEM | CAN-A2-A-228 |

Twenty-six are the records listed in `docs/AI-USE-2026-10-05.md` §4.3. The audit found eight
more with the same pattern, six of them with a required student AI step. Four withdrawn records are
remix parents, so their remixes (WIA-R-DISC-03, -04, -06, WIA-R-SRCH-10) are held. Each can return
once it is re-based on its parent's source.

The other 44 records whose AI role was "specified editorially" adapt sources that involve AI. They
stay published and are flagged (`ai_step_specified_editorially`) so the full review confirms that
each AI step matches its source.

## 4. Corrections

Each correction names the value it replaces, the reason, and the evidence, usually a quoted
source passage.

- **WIA-04.** CAN-L-079, WIA-S-EDU-A-08 and CAN-A2-A-097 now record `student_work`. The six other
  records coded `student_derived_deidentified` are flagged for a source check; the limit now treats
  that value as a requirement to check.
- **WIA-05.** CAN-W-health-021 (D-15: adjudication by majority vote), CAN-W-lis-018 (D-16),
  CAN-B-MATL-02 (D-17), CAN-W-gapdisc-009 (D-18), CAN-A1-EQ-017 (D-19; also `pol` transparency and
  `dis` documented_log, as its sibling EQ-018), CAN-A2-A-074 (D-20; the source caveat moves to
  `risk`).
- **WIA-15.** The NSPA prompt library moved: 22 activities and CSR-D08 now point to its new address
  (both repositories are CC0), and CSR-D08 carries the library's title. The Journal of Information
  Literacy article now links to the working address (the DOI target returns 404; citations keep the
  DOI). CSR-0430 names the collection's editors. Twenty-three source license statements lose
  internal process notes or truncation, or now give the terms as the item states them (the IRIS
  Center's CC BY-NC-ND terms for SRC-0248, "All rights reserved" for SRC-0238, the purchase route for
  SRC-0206).
- **The review of this change.** WIA-R-DISC-01: the distance and agreement thresholds now run in
  the right directions (the label is withheld when neighbor distance is above a threshold or
  agreement is below one). CAN-B-ASMT-13: the capability is image generation (Scribble Diffusion),
  not text chat. CAN-D-ADM-001: the summary restores the prompt's audience (first-generation
  college students), eligibility in the first sentence, and "no jargon". WIA-S-EDU-A-08: a working
  note leaves the public citation. WIA-S-BUS-B-13: its tools are free to students.
- **WIA-08 (recoding).** See section 5.

## 5. Recoding and the consistency rules

Four rules now hold for every published record, and the build refuses a record that breaks one:

1. `no_operator_no_tool`: when no one operates an AI tool (`op: none`), no AI tool is needed
   (`cap: none_required`).
2. `no_tool_no_operator`: a record that needs no AI tool says no one operates one, and lists no
   other capability.
3. `withheld_not_students`: an AI tool kept out of the activity (`ar: withheld`) is not one that
   students operate.
4. `source_access_has_item`: a source-access label (`sa`) sits only on a record that lists a source
   item used unmodified (section 1).

The manifest can list records still pending a decision under a rule; a pending record must still
fail it, so the list can only shrink. It is empty.

The 28 contradictory records found in the audit are settled:

- **No AI tool needed (16).** CAN-B-ARGU-01, BIAS-06, ETHI-01, ETHI-03, ETHI-05, ETHI-10, PROC-01,
  PROC-04, PROC-05, PROC-06, PROC-10, PROF-07, PROF-11, STYL-08, CAN-W-gapwork-018 and
  workflow-034. PROF-11's role becomes `withheld`.
- **Operator not stated (2).** CAN-B-BIAS-11 (the source does not say who produces the outputs;
  capability adds image generation) and CAN-W-workflow-026.
- **No one operates a tool (1).** CAN-B-ETHI-04: the source lists "any" tool, but no step uses one.
  The summary now says so.
- **AI role (5).** CAN-A2-A-074 and -081 (also `cap: text_chat`), CAN-B-PROF-04 and WRIT-02 become
  `generator`; CAN-B-RSCH-08 becomes `instrument`.
- **Capability (1).** WIA-S-LIB-A-02: the librarian prepares the sample exchanges with a
  conversational tool, so `cap: text_chat`.
- **Warning and cost, settled in code or kept (3).** CAN-L-008 and CAN-L-067 (like PROC-10 and
  STYL-08) warned that data goes "into an AI tool" though no one operates one; the warning now names
  "a third-party tool" when `op` is `none` (D-13). CAN-B-PROC-09 lists a cost with no AI operator,
  as six of the records above do: it is the cost of the non-AI tool the activity uses (the p5.js
  editor), so it stays.

Sampled values the source does not support are also corrected: CAN-B-VERI-10 (`text_chat` only),
CAN-B-VISU-17 (image, not video, generation), CAN-D-ADM-010 (`sen: none`; the prompt's safety rule
restored in the summary and the judgment), CAN-D-ADM-100 (tool list without "Make").

## 6. Interface fixes in this change

| Finding | Change |
|---|---|
| WIA-02 | An activity recorded for any course is a possible fit for every field, never a field mismatch. Its card says "Recorded for any course." |
| WIA-03 | Under the first limit, a card that qualifies only through its route without AI says so, with the route's first sentence. Every card shows **Who uses AI**. The limit's note, help text and Register card name optional AI steps (D-12). |
| WIA-04 | `student_derived_deidentified` is a requirement to check, in both tools. |
| WIA-10 | Ask Us behaves as a modal dialog: focus moves in, the page behind is inert, Tab and Shift+Tab stay inside, and closing it from its own controls (✕, or Escape while focus is on them) returns focus to the menu button. Escape pressed inside the chat widget goes to the widget's own frame, not to this page, so it does not close the dialog there. |
| WIA-11 | The saved-activities printout is exposed to assistive technology while printing, so a saved PDF is tagged. |
| WIA-12 | Opening an activity from What If AI results adds a history entry; Back closes it and keeps the results as they were (expanded lists, scroll position, focus on the card). Forward reopens it over the same results, so a second Back, Escape or Close returns to them again. Returning to that entry from another page shows the activity over the same results. In The Register, closing an activity reached by Forward goes back rather than adding a duplicate entry. |
| WIA-14 | Statements D-06 to D-11: product names in type dialogs, the Types intro, the policies intro, the footer date (now the latest reviewed stage, built into every page), the print description, and the HCAI disclosure. |
| WIA-19 | When the AI tool is withheld, the "how people and the tool divide the work" sentence and heading no longer assume tool output (D-14). |

## 7. Other flags for the full review

| Flag | Records |
|---|---|
| `scope_remix_parent_without_ai` | CAN-L-042, -043, -073 (`docs/AI-USE-2026-10-05.md` §4.1) |
| `scope_procedural_generators` | Six CAN-B-PROC records (§4.2) |
| `scope_ai_as_framing` | Five records (§4.4) |
| `engagement_requires_review` | Seven records (WIA-26) |
| `tool_not_in_source` | Seventeen administrative records listing "Make" |
| `sensitivity_student_derived` | Seven records still coded `student_derived_deidentified` (WIA-04) |

## 8. The full review of every record

The audit's random sample is replaced by a review of every published, held and withdrawn record,
using the protocol the 24 sampled records followed (`content/record-review.json` is where its
results land, as corrections with evidence):

1. **Citation:** authors, year, title, venue, DOI and link match the source.
2. **License:** the license and version as the source states them, where they are stated, and
   whether the record's own license statement keeps every term.
3. **Procedure:** each step in the summary is in the source, or is disclosed in the change note as
   an addition.
4. **Claims:** outcomes are attributed and reported at the source's strength, with its
   qualifications.
5. **Classification:** operator, capability, AI role, human move, sensitivity, cost, prerequisites,
   policy position, field and engagement class, each against the source.
6. **Scope:** an adapted activity uses, is about, or analyzes AI in the source itself. A set record
   (synthesis or remix) takes its AI step from a documented AI-operation source it names, or says
   that the step was written for the collection.
7. **Source access (synthesis records):** every item used unmodified is linked, its terms are
   quoted, and the `sa` label matches them.

Records are reviewed source by source, so one reading settles every activity drawn from it. The 249
flagged records come first, then CAN-A2-A-132 (provisional) and the 115 labeled records.

## 9. Checks

- `tests/record_review_test.py`: kept records change only where a correction names them; withdrawn
  and held records leave no source, type or remix pointing at them; every published record passes
  the consistency rules; nineteen unreviewed or unsafe changes are refused; source-access labels sit
  only on synthesis records with a used item, and an unknown label or withdrawal status is refused;
  input and output are pinned.
- `tests/matching.test.js`: any-course field compatibility for every field; the student-work rule;
  the restricted-source rule for the payment and purchase limits.
- `tests/review-fixes-browser.test.js`: Back, Forward, Back, Escape and Close over an activity
  opened past the first nine results (expansion, scroll, focus and address each time); the same in
  The Register; Ask Us focus with waits for focus to settle; the source-access labels on cards,
  pages and print; the open-license and no-cost filters.
- `tests/data-integration.test.js`, `tests/site.test.js`, `tests/pages.test.js`: counts, the
  consistency rules on the served data, the version record, and the absence of every removed record
  from both tools.

## 10. Still open

This change is a first correction pass. These items from the audit and the review of this change
remain:

- **Hidden evidence qualifications (A-03).** 173 records carry an evidence statement (`evs`) that
  no page shows. It needs a faculty-facing rewrite before it is shown on screen and in print.
- **Use ranking (A-04).** A record with no reported use status (for example CAN-L-014) ranks as if
  use had been reported. Ranking should require affirmative evidence.
- **Student and faculty accounts (A-06).** CAN-W-oer-010 is still left out under "Students
  shouldn't have to make an account" although only faculty or staff operate the tool.
- **Route without AI (A-05).** CAN-A2-A-097 still lacks the unaided route its source documents.
- **Field tags.** 65 activities (67 activity and field pairs) show a field tag that disagrees with
  the field comparison. This needs a distinction between a primary field and additional fields,
  not broader matching.
- **Student-derived information (A-01).** Seven records stay a requirement to check
  (`sensitivity_student_derived`) until their sources are read.
- **Saved list (A-07, A-10).** The saved-activities list does not mark synthesis, remix or untried
  activities, and a save made when browser storage is refused falls back silently to the page.
- **Malformed records (A-13).** The page's ready state when a record is malformed is unchanged.
- **Print (A-08).** The tagged PDF still needs a check of reading order, with assistive technology,
  and in another browser.
- **Links (A-09).** The two SkillsCommons links and the Wabash link could not be reached during the
  audit; they are unverified, not confirmed broken.
- **Rights (A-11, A-12).** The CC BY-SA question (section 2), the scope of the scvi documentation
  and software licenses, and the scope questions in §4.1, §4.2, §4.4 and §4.5 of the AI-use record.
- **Editorial corrections (A-15).** Further sampled source-note corrections beyond those in
  section 4.
- **Faculty testing (A-14).** On phones, the distance to the first question.
- **Held and provisional records.** The five records with license wording to correct, the six
  remixes waiting on their parents, and CAN-A2-A-132 (section 3).
- **The full review of every record** (section 8).
