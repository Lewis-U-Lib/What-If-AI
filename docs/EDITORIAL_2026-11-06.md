# Editorial pass, November 6, 2026

A diagnostic of the current build (code, accessibility, spelling, grammar, punctuation, and voice) found
the interface and the collection in good order and left five editorial decisions for the library. This
pass carries out the decisions the library made. Every change to the collection, with before and after
text, is in `docs/research/editorial-2026-11-06-changes.csv` (791 rows). Interface text changes are in
the source files under `src/`.

## Decisions and what changed

### 1. Interface and data corrections

- The Register's tagline no longer promises "every work" behind the collection; it now reads "All the
  use-case ideas in What If AI, the kinds of AI systems they involve, course policy examples, and the
  works behind them."
- "the Library" is lowercased wherever it is a common noun (page text, About, Help, status messages, and
  three pinned test strings).
- The Register walkthrough: "Use-case ideas" sentence no longer doubled the phrase; "Each use-case idea
  is described and classified"; the Corrections slide points broken links and wrong licenses to Report an
  Issue and experience reports to the feedback form.
- The What If AI walkthrough: "one preference you could change"; "scale, AI use, and cost where it is
  known"; and the "Open in The Register" sentence is now one sentence rather than two fragments.
- Header button label "Feedback" → "Send feedback" on the home and 404 pages, matching the other verb-led
  buttons.
- Five AI Assignment Library citations in `register.json` had a space before the period ("Library . 16.").
  One policy institution name carried trailing spaces. Work titles that coincide with use-case idea titles
  were left as they are: they quote the source.

### 2. The Sources section explains its count

The filter shows 736 licensed adaptations while the Sources intro counted 739. Three licensed adaptations
also belong to the synthesis set and are counted there by the filter. The intro now says so.

### 3. Titles in sentence case

Titles were in title case in some sets and sentence case in others. The library chose sentence case, applied
by script: 524 titles changed. The script kept capitals for quoted spans, parenthesized names, proper nouns,
product names, and course-style labels, with hand overrides where the script could not tell a name from a
common noun (Banks' levels, South Napa, and Quick, Draw! keep their capitals; the trolley problem, comfort
zone, panic zone, summit, and society do not). Three summaries
that name another idea by title were updated to match. The three use-case ideas whose titles are quoted in
The Register's works list were not touched there.

### 4. Second person addresses the instructor only

Decision: "you" in a description means the faculty member reading it; students and other participants are
described in the third person. Of the 250 ideas whose actor is a student, 252 fields (`sum`, and `na` in
eight) were rewritten from second to third person, and 20 titles were reworded ("Predict the figure before
seeing it", "Write the discussion the authors withheld"). Each rewrite was checked for length (within 10%),
for every quoted span, number, and capitalized term, and for sentence count. Nine student-actor summaries
keep a "you" that addresses the instructor (for example, "the prompt you already have for your writing
assignment", "at a length you specify") or that is part of a product name (You.com). Second person in
change notes quotes the source and was left alone. Guardrail sentences with no stated actor ("Keep a correct
reference…", "Require tests…") were read as instructor imperatives and kept.

### 5. The five longest summaries, condensed

| Idea | Before | After |
|---|---|---|
| WIA-R-MMOD-08 | 1,595 | 1,472 |
| WIA-R-INST-10 | 1,544 | 1,499 |
| WIA-R-CODE-10 | 1,523 | 1,383 |
| WIA-R-DISC-09 | 1,519 | 1,452 |
| WIA-R-INST-05 | 1,512 | 1,457 |

Every step, tool, output, and check was kept; only connective phrasing was removed. The saving was 3–9%.

**Scan of other candidates.** Length is structural, not accidental. Summaries written for the collection
run long because each sentence carries a component of the procedure:

| Set | Ideas | Median length | Over 1,100 characters |
|---|---|---|---|
| Licensed adaptations | 736 | 810 | 29 |
| Remix (hybrid synthesis) | 86 | 1,370 | 86 |
| Synthesis (original) | 112 | 1,093 | 49 |
| Synthesis (hybrid) | 96 | 1,087 | 41 |
| Licensed adaptations in the synthesis set | 3 | 1,115 | 2 |

Condensing the remix and synthesis sets to the adaptations' median would mean dropping components, which
the library ruled out. A different, smaller target does exist: 128 summaries contain a sentence of 55 or
more words, mostly semicolon lists of required steps (CAN-W-workflow-021, 103 words; CAN-B-WRIT-16, 99;
CAN-B-CASE-07, 94). Splitting those sentences would improve readability without removing anything, and
without changing the length. For the 29 long licensed adaptations, any trimming must keep every element the
license-bearing source states, so the recommendation is to split sentences rather than cut. This is left
for a library decision.

## Release

`data/release.json` is re-stamped: release `06479e306bbd`, built 2026-11-06, with new sizes and hashes.
`tools/check_release.py` passes; `tools/license_scope.py --pin` re-pinned `content/tool-license.json` with no
change to the clarified set (244 notes).

## Not changed

- Change notes (`chg`) and attribution lines, where "you" or title case quote the source.
- Work titles in The Register, which reproduce their sources.
- The summaries of the remix and synthesis sets beyond the five above (see the scan).
