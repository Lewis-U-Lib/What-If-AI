# September 28, 2026 activity update review

## Decision and scope

Accept all 81 supplied activities (`CAN-L-001` through `CAN-L-081`) and 75 source works
(`CSR-0437` through `CSR-0511`). The shared collection increases from 745 to 826 activities
and from 249 to 324 source works. All 745 prior activity objects and 249 prior source
objects are unchanged. The guide file is byte-identical. Existing spelling corrections
remain applied to the public data shared by both tools.

The 81 additions comprise 62 teaching activities, 14 research activities, and 5 administrative
activities; 73 are labeled licensed adaptations and 8 prompt specifications. The workbook's
IDs, titles, licenses, work focuses, policy labels, and source URLs agree with the JSON.
The 16 held-back rows remain documentation only and were not imported as additional records.

This package is a manual supplement, not a new export from the original corpus pipeline.
The supplied release manifest accurately retains its base commit and sets `clean: false`.
The original input files are imported intact. Reviewed corrections are recorded separately
in `content/editorial-corrections.json`, with original text, reason, source, and final hashes.

## Review findings and accepted fixes

1. **Scale correction:** CAN-L-040 is one 60-minute session, so `quick` is the appropriate
   existing matcher option, not `module` (defined here as several weeks).
   [Publisher's description](https://www.mededportal.org/doi/10.15766/mep_2374-8265.11412).
2. **Free-route clarity:** CAN-L-034's supplied adaptation note narrows the activity to the
   free chatbot role-play, but its summary/output also required a reflection from commercial
   simulations. The displayed summary and output now distinguish the chatbot task from the
   larger study. The reported study evidence still refers to the combined orientation and
   is not presented as proof of the isolated chatbot component's effectiveness.
   [Source study](https://esmed.org/MRA/mra/article/view/6786).
3. **Pending license checks resolved:** The publisher's Rights and permissions sections
   explicitly state CC BY-NC 4.0 for
   [CAN-L-063](https://journals.sagepub.com/doi/10.1177/16094069261425173) and
   [CAN-L-065](https://journals.sagepub.com/doi/10.1177/16094069251404329). Their notes now
   record direct confirmation on September 28, 2026. The latter's reported question-count
   discrepancy is retained rather than silently resolved.
4. **Chapter license confirmed:** [CAN-L-078's chapter](https://pressbooks.bccampus.ca/accessibilityhandbook/chapter/closed-captions-3/)
   states CC BY-NC-SA 4.0 with the exception clause. Its note preserves the distinction between
   the paraphrased procedure and third-party screenshots/linked instructions.
5. **Section-menu repair accepted and strengthened:** The proposed desktop scroll clearance
   and deferred scrolling address the sticky-header overlap. The completed fix also waits for
   initial page loading, restores heading focus, and handles ordinary section-menu clicks
   without a competing native jump. Modified clicks retain normal link behavior. A pending
   callback is ignored if the route has changed. Long license links wrap and the source
   legend fits at 320 pixels, avoiding horizontal overflow.

The supplement adds six reviewed fields to the existing 22-field correction list: 28 fields,
29 replacements overall. Scale changes require an exact original value, a supported label,
and a reason/source. Other matching classifications remain outside the prose correction path.

## Matcher and synchronization checks

- Both pages load the same corrected, fingerprinted activity JSON.
- Every matching value in all 826 records has a supported intake or capability label.
- All 81 additions pass the existing admission gate and have a selectable path with no
  preference mismatch. All 590 supported task/level/setting combinations for the new records
  were exercised. Unspecified field, level, or setting values remain compatible, not exact.
- Every new source link resolves to a bibliography record that links back to the activity.
  Type, policy, origin, activity, and source counts reconcile.
- Matching tests preserve the original 16,452-state regression grid and additionally exercise
  the expanded 26,514-state grid. Of those, 25,994 have exact/compatible/close matches and
  520 offer explicitly labeled broader results. No blank result plan occurred.
- All 128 combinations of selected limits and 448 single-limit additions preserve the
  confirmed/unknown/excluded distinction and never widen results when a limit is added.
- Browser integration checks exercise result pagination and pop-ups for every addition in
  both tools, complete wizard paths for all three work focuses, section navigation at six
  widths, and mobile overflow. These checks are included in deployment CI.

## Evidence limits

The review covers the full supplied records, all matching metadata, cross-references,
preservation of the prior collection, the workbook, and the complete proposed code diff.
No duplicate IDs, identical source URLs, or source DOI/URL occurrences in the prior records
were found. Title screening and procedure review did not identify an exact duplicate to
remove; these checks are not a proof of exhaustive semantic distinctness across all 826.

This was not a fresh full-text and license audit of all 75 new works. Except for the targeted
checks above, source descriptions, license statements, scope caveats, and evidence levels are
the supplied record evidence. Known ambiguous licensing notes, third-party exceptions, and
unpiloted prompt-specification labels remain visible. Middle-school source context in
CAN-L-004 remains explicit; `any` is a compatibility label, not evidence of college validation.
The matcher confirms discoverability and recorded constraints, not educational effectiveness.
Non-AI alternatives retain the original record's other requirements under the existing matcher
contract; alternative-specific requirements were not independently inferred.

## Per-activity matching witness

Every row below has a valid zero-mismatch matcher route with no hard limits selected.
“Compatible” means at least one field, level, or setting is unspecified. Rank is within that
result group; later entries remain available through **Show more matches**.

| Activity | Work focus | Task | Field | Scale | Level | Setting | Group / rank |
|---|---|---|---|---|---|---|---|
| [CAN-L-001](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:online) | teaching | discussion | interdisciplinary | quick | firstyear | online | compatible / 2 |
| [CAN-L-002](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:online) | teaching | discussion | interdisciplinary | quick | firstyear | online | compatible / 3 |
| [CAN-L-003](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:design;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:online) | teaching | design | interdisciplinary | quick | firstyear | online | compatible / 1 |
| [CAN-L-004](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:design;disc:interdisciplinary;depth:module;lvl:firstyear;mod:in_person) | teaching | design | interdisciplinary | module | firstyear | in_person | compatible / 1 |
| [CAN-L-005](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:policy;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:in_person) | teaching | policy | interdisciplinary | quick | firstyear | in_person | compatible / 2 |
| [CAN-L-006](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:policy;disc:interdisciplinary;depth:assignment;lvl:firstyear;mod:online) | teaching | policy | interdisciplinary | assignment | firstyear | online | compatible / 1 |
| [CAN-L-007](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:interdisciplinary;depth:module;lvl:grad;mod:in_person) | teaching | research | interdisciplinary | module | grad | in_person | exact / 1 |
| [CAN-L-008](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:creative;disc:interdisciplinary;depth:module;lvl:grad;mod:in_person) | teaching | creative | interdisciplinary | module | grad | in_person | compatible / 1 |
| [CAN-L-009](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:policy;disc:interdisciplinary;depth:assignment;lvl:grad;mod:in_person) | teaching | policy | interdisciplinary | assignment | grad | in_person | compatible / 4 |
| [CAN-L-010](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:interdisciplinary;depth:assignment;lvl:firstyear;mod:in_person) | teaching | research | interdisciplinary | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-011](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:design;disc:interdisciplinary;depth:assignment;lvl:firstyear;mod:hybrid) | teaching | design | interdisciplinary | assignment | firstyear | hybrid | compatible / 20 |
| [CAN-L-012](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:interdisciplinary;depth:assignment;lvl:grad;mod:hybrid) | teaching | discussion | interdisciplinary | assignment | grad | hybrid | compatible / 1 |
| [CAN-L-013](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:health;depth:assignment;lvl:grad;mod:online) | teaching | discussion | health | assignment | grad | online | exact / 1 |
| [CAN-L-014](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:creative;disc:arts;depth:assignment;lvl:grad;mod:hybrid) | teaching | creative | arts | assignment | grad | hybrid | compatible / 1 |
| [CAN-L-015](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:arts;depth:module;lvl:firstyear;mod:in_person) | teaching | research | arts | module | firstyear | in_person | compatible / 1 |
| [CAN-L-016](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:materials;disc:humanities;depth:assignment;lvl:upper;mod:in_person) | teaching | materials | humanities | assignment | upper | in_person | compatible / 2 |
| [CAN-L-017](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:creative;disc:arts;depth:assignment;lvl:upper;mod:hybrid) | teaching | creative | arts | assignment | upper | hybrid | exact / 1 |
| [CAN-L-018](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:creative;disc:arts;depth:assignment;lvl:grad;mod:in_person) | teaching | creative | arts | assignment | grad | in_person | compatible / 3 |
| [CAN-L-019](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:creative;disc:arts;depth:assignment;lvl:firstyear;mod:in_person) | teaching | creative | arts | assignment | firstyear | in_person | exact / 3 |
| [CAN-L-020](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:materials;disc:interdisciplinary;depth:grant_proposal;lvl:scholarly;mod:in_person) | research_own | materials | interdisciplinary | grant_proposal | scholarly | in_person | compatible / 2 |
| [CAN-L-021](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:design;disc:business;depth:assignment;lvl:firstyear;mod:online) | teaching | design | business | assignment | firstyear | online | compatible / 1 |
| [CAN-L-022](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:social;depth:module;lvl:grad;mod:in_person) | teaching | research | social | module | grad | in_person | compatible / 1 |
| [CAN-L-023](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:interdisciplinary;depth:assignment;lvl:grad;mod:in_person) | teaching | discussion | interdisciplinary | assignment | grad | in_person | compatible / 5 |
| [CAN-L-024](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:business;depth:assignment;lvl:firstyear;mod:in_person) | teaching | research | business | assignment | firstyear | in_person | exact / 1 |
| [CAN-L-025](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:business;depth:assignment;lvl:upper;mod:in_person) | teaching | research | business | assignment | upper | in_person | exact / 2 |
| [CAN-L-026](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:business;depth:assignment;lvl:grad;mod:in_person) | teaching | discussion | business | assignment | grad | in_person | exact / 1 |
| [CAN-L-027](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:materials;disc:interdisciplinary;depth:professional_workflow;lvl:firstyear;mod:in_person) | teaching | materials | interdisciplinary | professional_workflow | firstyear | in_person | compatible / 1 |
| [CAN-L-028](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:qualitative;disc:education;depth:research_phase;lvl:scholarly;mod:in_person) | research_own | qualitative | education | research_phase | scholarly | in_person | compatible / 1 |
| [CAN-L-029](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:humanities;depth:quick;lvl:upper;mod:in_person) | teaching | discussion | humanities | quick | upper | in_person | exact / 1 |
| [CAN-L-030](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:design;disc:social;depth:assignment;lvl:upper;mod:in_person) | teaching | design | social | assignment | upper | in_person | exact / 1 |
| [CAN-L-031](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:education;depth:module;lvl:firstyear;mod:in_person) | teaching | feedback | education | module | firstyear | in_person | exact / 1 |
| [CAN-L-032](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:education;depth:assignment;lvl:upper;mod:online) | teaching | assessment | education | assignment | upper | online | exact / 1 |
| [CAN-L-033](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:education;depth:assignment;lvl:grad;mod:in_person) | teaching | feedback | education | assignment | grad | in_person | exact / 1 |
| [CAN-L-034](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:health;depth:assignment;lvl:upper;mod:online) | teaching | discussion | health | assignment | upper | online | exact / 1 |
| [CAN-L-035](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:health;depth:assignment;lvl:firstyear;mod:in_person) | teaching | assessment | health | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-036](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:materials;disc:interdisciplinary;depth:grant_proposal;lvl:scholarly;mod:in_person) | research_own | materials | interdisciplinary | grant_proposal | scholarly | in_person | compatible / 3 |
| [CAN-L-037](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:materials;disc:health;depth:grant_proposal;lvl:scholarly;mod:in_person) | research_own | materials | health | grant_proposal | scholarly | in_person | compatible / 1 |
| [CAN-L-038](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:materials;disc:interdisciplinary;depth:grant_proposal;lvl:scholarly;mod:in_person) | research_own | materials | interdisciplinary | grant_proposal | scholarly | in_person | compatible / 1 |
| [CAN-L-039](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:admin;task:discussion;disc:interdisciplinary;depth:professional_workflow;lvl:scholarly;mod:in_person) | admin | discussion | interdisciplinary | professional_workflow | scholarly | in_person | compatible / 1 |
| [CAN-L-040](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:health;depth:quick;lvl:grad;mod:in_person) | teaching | discussion | health | quick | grad | in_person | exact / 1 |
| [CAN-L-041](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:health;depth:assignment;lvl:grad;mod:in_person) | teaching | feedback | health | assignment | grad | in_person | exact / 1 |
| [CAN-L-042](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:humanities;depth:assignment;lvl:firstyear;mod:in_person) | teaching | research | humanities | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-043](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:humanities;depth:grant_proposal;lvl:grad;mod:in_person) | teaching | research | humanities | grant_proposal | grad | in_person | compatible / 1 |
| [CAN-L-044](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:research;disc:humanities;depth:research_phase;lvl:scholarly;mod:in_person) | research_own | research | humanities | research_phase | scholarly | in_person | compatible / 1 |
| [CAN-L-045](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:humanities;depth:quick;lvl:firstyear;mod:in_person) | teaching | discussion | humanities | quick | firstyear | in_person | exact / 2 |
| [CAN-L-046](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:arts;depth:assignment;lvl:firstyear;mod:in_person) | teaching | discussion | arts | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-047](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:policy;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:in_person) | teaching | policy | interdisciplinary | quick | firstyear | in_person | compatible / 1 |
| [CAN-L-048](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:materials;disc:education;depth:module;lvl:upper;mod:in_person) | teaching | materials | education | module | upper | in_person | exact / 1 |
| [CAN-L-049](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:admin;task:assessment;disc:library;depth:professional_workflow;lvl:firstyear;mod:in_person) | admin | assessment | library | professional_workflow | firstyear | in_person | compatible / 1 |
| [CAN-L-050](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:library;depth:assignment;lvl:firstyear;mod:in_person) | teaching | research | library | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-051](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:in_person) | teaching | discussion | interdisciplinary | quick | firstyear | in_person | compatible / 2 |
| [CAN-L-052](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:library;depth:quick;lvl:firstyear;mod:in_person) | teaching | discussion | library | quick | firstyear | in_person | exact / 1 |
| [CAN-L-053](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:stem;depth:assignment;lvl:firstyear;mod:online) | teaching | feedback | stem | assignment | firstyear | online | compatible / 1 |
| [CAN-L-054](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:stem;depth:module;lvl:firstyear;mod:in_person) | teaching | assessment | stem | module | firstyear | in_person | compatible / 1 |
| [CAN-L-055](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:stem;depth:module;lvl:grad;mod:in_person) | teaching | research | stem | module | grad | in_person | compatible / 1 |
| [CAN-L-056](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:stem;depth:quick;lvl:grad;mod:in_person) | teaching | research | stem | quick | grad | in_person | compatible / 1 |
| [CAN-L-057](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:business;depth:writing_cycle;lvl:upper;mod:in_person) | teaching | feedback | business | writing_cycle | upper | in_person | exact / 1 |
| [CAN-L-058](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:research;disc:education;depth:research_phase;lvl:scholarly;mod:in_person) | research_own | research | education | research_phase | scholarly | in_person | compatible / 2 |
| [CAN-L-059](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:admin;task:admin;disc:education;depth:professional_workflow;lvl:scholarly;mod:online) | admin | admin | education | professional_workflow | scholarly | online | compatible / 1 |
| [CAN-L-060](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:admin;task:feedback;disc:stem;depth:quick;lvl:scholarly;mod:online) | admin | feedback | stem | quick | scholarly | online | exact / 1 |
| [CAN-L-061](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:research;disc:social;depth:research_phase;lvl:grad;mod:in_person) | research_own | research | social | research_phase | grad | in_person | compatible / 1 |
| [CAN-L-062](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:admin;task:assessment;disc:health;depth:professional_workflow;lvl:firstyear;mod:in_person) | admin | assessment | health | professional_workflow | firstyear | in_person | compatible / 1 |
| [CAN-L-063](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:qualitative;disc:social;depth:research_phase;lvl:grad;mod:in_person) | research_own | qualitative | social | research_phase | grad | in_person | compatible / 2 |
| [CAN-L-064](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:design;disc:social;depth:research_phase;lvl:grad;mod:in_person) | research_own | design | social | research_phase | grad | in_person | compatible / 1 |
| [CAN-L-065](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:policy;disc:social;depth:research_phase;lvl:grad;mod:in_person) | research_own | policy | social | research_phase | grad | in_person | compatible / 1 |
| [CAN-L-066](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:materials;disc:health;depth:research_phase;lvl:scholarly;mod:in_person) | research_own | materials | health | research_phase | scholarly | in_person | exact / 1 |
| [CAN-L-067](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:humanities;depth:module;lvl:firstyear;mod:online) | teaching | discussion | humanities | module | firstyear | online | exact / 2 |
| [CAN-L-068](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:discussion;disc:stem;depth:module;lvl:firstyear;mod:in_person) | teaching | discussion | stem | module | firstyear | in_person | exact / 1 |
| [CAN-L-069](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:qualitative;disc:social;depth:research_phase;lvl:scholarly;mod:in_person) | research_own | qualitative | social | research_phase | scholarly | in_person | compatible / 3 |
| [CAN-L-070](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:stem;depth:quick;lvl:firstyear;mod:in_person) | teaching | assessment | stem | quick | firstyear | in_person | compatible / 1 |
| [CAN-L-071](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:business;depth:assignment;lvl:firstyear;mod:in_person) | teaching | assessment | business | assignment | firstyear | in_person | compatible / 1 |
| [CAN-L-072](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:stem;depth:quick;lvl:firstyear;mod:in_person) | teaching | assessment | stem | quick | firstyear | in_person | compatible / 2 |
| [CAN-L-073](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:library;depth:quick;lvl:grad;mod:in_person) | teaching | research | library | quick | grad | in_person | compatible / 1 |
| [CAN-L-074](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:feedback;disc:stem;depth:assignment;lvl:firstyear;mod:online) | teaching | feedback | stem | assignment | firstyear | online | exact / 1 |
| [CAN-L-075](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:research_own;task:research;disc:interdisciplinary;depth:research_phase;lvl:grad;mod:in_person) | research_own | research | interdisciplinary | research_phase | grad | in_person | compatible / 1 |
| [CAN-L-076](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:stem;depth:assignment;lvl:firstyear;mod:in_person) | teaching | assessment | stem | assignment | firstyear | in_person | exact / 1 |
| [CAN-L-077](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:education;depth:professional_workflow;lvl:firstyear;mod:online) | teaching | assessment | education | professional_workflow | firstyear | online | compatible / 1 |
| [CAN-L-078](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:materials;disc:interdisciplinary;depth:professional_workflow;lvl:firstyear;mod:online) | teaching | materials | interdisciplinary | professional_workflow | firstyear | online | compatible / 1 |
| [CAN-L-079](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:qualitative;disc:health;depth:professional_workflow;lvl:firstyear;mod:in_person) | teaching | qualitative | health | professional_workflow | firstyear | in_person | compatible / 1 |
| [CAN-L-080](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:research;disc:interdisciplinary;depth:assignment;lvl:firstyear;mod:in_person) | teaching | research | interdisciplinary | assignment | firstyear | in_person | compatible / 2 |
| [CAN-L-081](https://lewis-u-lib.github.io/What-If-AI/what-if-ai.html#a=focus:teaching;task:assessment;disc:interdisciplinary;depth:quick;lvl:firstyear;mod:in_person) | teaching | assessment | interdisciplinary | quick | firstyear | in_person | compatible / 1 |

## Held-back items retained as documentation

| Draft or source | Supplied reason |
|---|---|
| Assigning each assessment a level on the five-level AI Assessment Scale and redesigning it for validity | framework only (AI Assessment Scale); journal versions are NoDerivatives |
| Groups judge the credibility of one AI tool's answer to a shared prompt, check its references and report back | license version not confirmed on source (page shows CC-BY-NC-SA without version; the only deed link is 3.0, likely for the embedded P.R.O.V.E.N. framework) |
| Prompt Lab: choose a generative AI tool, test and refine a prompt, and reflect on how the output changed | license version not stated on source; record rests on page summary only |
| Jigsaw comparison of AI research tools and academic search, with each team evaluating and presenting one tool | license version not stated on source; record rests on page summary only |
| Design project with permitted AI use: cite each tool, explain its role, and reflect as a team | duplicate of NEW-1-11 (same Shukla et al. source) |
| 3.4 Environmental Impact of AI Lesson (DAILy curriculum 2.0, Everyday AI) | Fails admission test on what is publicly described. License confirmed on the lesson page (CC BY-NC 4.0; the site footer contradicts itself). The public page gives only a pacing outline, and the linked 'Calculate Your Carbon Footprint' activity has students enter their own daily activities into an online carbon calculator and compare the result with AI training emissions during a teacher-led discussion (active, not constructive or interactive). The slides, script and exit ticket that might carry a constructive task require a site login and were not accessed. The materials are also middle-school level. |
| Towards a public understanding of AI: on the design and delivery of an introductory course for a general audience | License could not be confirmed on the source: the Springer article page and PDF returned a JavaScript bot challenge and the fetch tool was rate-limited (HTTP 429), and no open repository copy exists. CC BY 4.0 appears only in Crossref/OpenAlex metadata, and the article text could not be read. Retry from a browser before writing a record. |
| AI Guidance for Schools Toolkit: Sample Letter to Parents and Guardians | No runnable activity: a model letter to families, not an activity or workflow. License: CC BY-NC-SA 4.0 is stated on the toolkit landing page (teachai.org/toolkit); the letter page itself shows only “© 2025 TeachAI”. |
| AI Scope and Sequence: PreK-12 Concepts for Teaching About AI (LibraryReady.AI) | No runnable activity: a curriculum scope-and-sequence model document. License: “The Scope and Sequence uses the Creative Commons BY license” on the libraryready.ai page (linked to CC BY 4.0); the PDF carries no license statement. |
| AI4K12 Grade Band Progression Charts (Five Big Ideas in AI) | No runnable activity: national guideline progression charts, labeled drafts open for public feedback. License: CC BY-NC-SA 4.0 on the site's Licensing Terms page. |
| Collaboration Agreement for Use of Generative AI in a Research Project Template | No runnable activity: a model document (template for agreeing on AI use among collaborators, advisors and thesis students) with no described procedure beyond prompting a discussion; the template file itself sits behind a bot challenge and could not be read. License confirmed on the repository page: CC BY-NC-SA 4.0. |
| Do teachers spot AI? Evaluating the detectability of AI-generated texts among student essays | No runnable activity: two experimental studies of whether teachers can identify ChatGPT essays; a detection-calibration exercise built on it would be the compilers' own design. License not confirmed on the article page (ScienceDirect returned a bot check); Elsevier's API metadata lists CC BY 4.0, while OpenAlex and Unpaywall list CC BY-NC-ND, so the terms need checking before any use. |
| Generative artificial intelligence-driven chatbots and medical misinformation: an accuracy, referencing and readability audit | No runnable activity: a research audit of five chatbots; its rating scheme is a study instrument, not a teaching or practice activity the source presents for others to run. License confirmed in the PMC record: CC BY-NC 4.0. |
| PICOT questions and search strategies formulation: A novel approach using artificial intelligence automation | No runnable activity: a comparison study of LLM-written and expert-written PICOT questions and search strings; a class exercise would be the compilers' design. License CC BY 4.0 confirmed on the University of Maribor repository record only; the publisher page and repository PDF were not reachable. |
| More AI Assistance Reduces Cognitive Engagement: Examining the AI Assistance Dilemma in AI-Supported Note-Taking | No runnable activity: a within-subject lab experiment (N=30) on a custom note-taking system, not a lesson or workflow; participants' move in each condition is note-taking and a post-test. License confirmed on the arXiv record as CC BY 4.0. Its finding (intermediate AI support gave the best post-test scores, full automation the worst) is worth citing against the legacy note-taking item. |
| Developing Research Software with Generative AI (Carpentries Incubator lesson) | No runnable activity: license confirmed (CC BY 4.0 on the lesson pages), but the lesson is marked pre-alpha and every episode, including testing and refactoring, contains only questions, objectives and a one-line introduction, with no exercises; the citation page still shows FIXME placeholders. |

## Input identity

Imported release: `25ec48b9d88c`. Supplied workbook SHA-256: `4981c4702d785d20714a60f37ef278abd9c317e4a8d3b360c4c247532e08733b`.
