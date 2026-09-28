# Oxford-comma and header update — September 28, 2026

Both tools now use Oxford commas in editorial copy, including activity descriptions,
source-report paraphrases, adaptation notes, AI-type explanations, help text, and
display labels. The shared-data review records **1,432 comma insertions across
1,151 fields** in `content/serial-comma-corrections.json`. Interface copy is edited
directly in `src/`. Ten theme names receive punctuated display labels while retaining
their original filter values, preserving existing links and theme membership.

The review considered comma-bearing sentences with coordinating conjunctions across
all published data, then distinguished serial lists from paired terms, independent
clauses, introductory phrases, and compound expressions. Direct quotations,
source-provided prompts, verbatim license statements, bibliography, and official
source titles remain as supplied. Reviewed descriptive activity titles can receive
commas; titles quoted in citations remain untouched.

The punctuation stage runs **after** the existing editorial and publication reviews.
It can only insert commas at individually recorded positions in approved prose
fields. Input file hashes, whole-field hashes, visible context, and output file hashes
must agree. Any new upstream release or publication edit requires reconciliation.
This preserves the original imported release, the 815 published activities, the 315
sources, source relationships, eligibility decisions, and matching classifications.
Automated safeguards also check that all non-comma text and all source quotations
remain unchanged by this stage.

The accompanying interface changes use the requested Register walkthrough wording,
the expanded What If AI introduction, the revised HCAI disclosure, and the new
`https://lewisu.libwizard.com/f/What-If-AI` destination for every external feedback link.
The anonymous activity-feedback submit buttons continue to submit the existing form.
Header logo dimensions are doubled at the existing screen sizes, with responsive
spacing that keeps the title and introduction clear of the logo.
