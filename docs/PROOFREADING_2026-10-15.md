# Proofreading pass, October 15, 2026

After the October 14 release went live, the library found misplaced commas and similar errors. The text on
`main` was identical to what pull request #23 proposed (the two commits added before the merge changed only
code and tests), so the errors were in the text itself, much of it the change notes and attribution lines
written during the October 13 corrections. They were not introduced by the upload.

This pass checked every piece of text a reader sees. The full list of changes, with before and after text,
is in `docs/research/proofreading-2026-10-15-changes.csv`. Points the proofreaders did not change, because
they need the source or a library decision, are in `docs/research/proofreading-2026-10-15-for-review.csv`.

## What was checked

- All 1,033 use-case ideas: title, summary, outcome statement, deliverable, reflection, adaptations, what the
  source reports, prompts written for the collection, no-AI route, evidence, change note, risk, dependency,
  and check notes, missing-material lists, tools, locators, relationship notes, license notes, and the
  compilers’ “Changes:” sentence in each attribution line.
- The Register’s policy-spectrum, origin, and tier text; the guide labels; the AI-system-types guide; the
  license notices; and the text of every page, dialog, walkthrough, button, and status message.
- Titles, quotations, citations, creator names, and license statements reproduce their sources. They were not
  reworded; only straight quotation marks were made curly.

## How

1. **Syntax.** Every JSON file parses; every script passes `node --check`; the W3C validator (vnu 26.10.12)
   reports no errors on the built pages.
2. **Automatic checks.** LanguageTool 6.8 (American English) and pattern checks for doubled punctuation,
   capitals after semicolons, quotation marks, and dashes. These pointed to problems but miss most comma
   errors, so they were used as hints only.
3. **Typography**, applied the same way everywhere: curly quotation marks and apostrophes, double marks
   outside and single inside, commas and periods inside closing quotation marks, a spaced em dash for a
   break, and an en dash for a range of numbers. Strings whose marks could not be paired automatically (24)
   were corrected by hand.
4. **A full read-through** of every field, in 27 batches, for comma placement, grammar, spelling,
   capitalization, and wording damaged by an earlier global replacement of “activity” with “use-case idea”.
5. **An independent check** of every read-through correction by readers who had not made them. Of 1,711
   corrections, 4 were reverted and 2 adjusted.

## What changed

| Kind | Changes |
|---|---|
| Typography: quotation marks, apostrophes, dashes, ranges | 10,253 spans in 3,980 strings |
| Commas (mostly the serial comma; also commas between independent clauses, splices, and stray commas) | 653 |
| Capital after a semicolon in step lists (“Specify the program; generate …”) | 339 |
| Final period on outcome, deliverable, and reflection fields | 212 |
| Quotation marks corrected by hand | 186 |
| Sentences with no main verb (“The compilers added …”, “This version keeps …”) | 118 |
| Other punctuation (doubled periods before “Changes:”, lists inside lists) | 102 |
| Spelling (American forms, product names such as DALL·E, QuillBot, DeepSeek) | 94 |
| “Use-case idea” restored to “activity” or “task” where it meant something people do | 81 |
| Grammar (tense, agreement, missing or extra “and”) | 63 |
| Dashes and ranges corrected by hand | 62 |
| Consistency sweep after the read-through | 30 |
| Other wording slips | 11 |

Other fixes found along the way:
- Counts read correctly in the singular (“1 exact match”, “1 source matches”, “Remove the saved use-case idea?”).
- 58 ideas with no broad discipline showed raw codes such as `discipline_general` in the Discipline row;
  they now show words (“Any discipline”, “Environmental science”).
- Clearing three or more answers now reads “Cleared the task, your field, and level …”.
- In 140 attribution lines of synthesis ideas, the “Changes:” notice named only the element drawn from the
  source (“Changes: Detailed model descriptions of documentary photographs …”), which is not a statement of
  change. It now says what changed: “Changes: The compilers wrote a new use-case idea that draws on this
  element of the source: detailed model descriptions …”.
- The theme “How Generative AI Works — and What It Can and Can’t Do” shows a curly apostrophe. Its filter
  value is unchanged, so saved and shared links keep working.

## Left for the library

- **Title style.** About half the titles are in title case and half in sentence case. Each title was left in
  its own style.
- **Theme names** are filter values in saved links. Their display labels add serial commas; the stored values
  do not.
- **The library guide** is named three ways (“Gen AI Faculty & Staff Guide”, “Gen AI Faculty Guide”, “the
  Faculty Guide”).
- **203 points for review**, such as a title that may be misprinted in its source (“Though Generative AI”),
  counts that disagree within one idea, and inconsistent model names. These are listed in the review file.
  A few were settled later in this pass: straight apostrophes in attribution titles, the nested quotation
  marks in CAN-B-RSCH-06, and the attribution notices that named only what was drawn from a source.

## Tests

`tests/proofreading-2026-10-15.test.js` checks that the text readers see has curly, paired, non-nested
quotation marks, no doubled punctuation or hyphens used as dashes, lowercase after semicolons in step lists,
final periods where they belong, and a statement of change in every synthesis attribution line. It also
checks that the Discipline row never shows codes. It runs with
`npm run test:review`.
