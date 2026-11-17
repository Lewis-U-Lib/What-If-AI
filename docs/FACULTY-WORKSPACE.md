# Faculty workspace

The Finder starts with the best available matching group. Other confirmed groups
and unconfirmed requirements remain distinct, with their original counts and rules.
Opening a broader group is a reader choice. A match is not evidence of effectiveness.

Plain reading view is independent of crimson/blue. Its browser preference applies
before first paint and follows the reader between the Finder and Register. Native
controls, content, links, and full-reference printing remain available.

## Saved ideas and trials

Saved selections retain the existing `lul-whatifai-saved-v1` storage key and alias
normalization. Trial plans use `lul-whatifai-trials-v1`. Notes save on input, in this
browser only; no request sends their contents to a server or analytics. Storage
failure is reported as temporary state. Download before leaving if storage fails.
Removing an idea from the saved list keeps its notes. Delete notes explicitly in
the trial dialog. Downloads include retained notes for removed/unavailable IDs.

The collection format is `what-if-ai-collection`, version 1. Restore validates the
whole file before changing state, previews the contents, and merges after the
reader confirms. Existing local plans win conflicts. Unavailable IDs and their
notes are retained; aliases map to canonical IDs. Ambiguous duplicate plans are
rejected. The limit is 2 MB, 2,000 saved IDs/plans, and 5,000 characters per field.
Imports are plain text, never markup or executable code. Downloads are readable
files: they are not encrypted or synchronized automatically.

The brief print presentation adds a worksheet and reference/reuse information.
Full-reference printing still renders the complete `sum`, citation, attribution,
license, change notes, and other sections from the full record, plus any trial.
The released narrative fields are not shortened or rewritten by these features.

## Public editorial notes

`content/editorial-reviews.json` is a separate, initially empty presentation overlay.
It never rewrites `data/acts.json`, alters matching, or assigns an effectiveness
score. `tools/editorial.py` validates known IDs, review scope, reviewer, date,
sources for reported use/outcome claims, and the basis for time estimates. Empty
records are described as unassessed, not as evidence that an activity was never used.

The independent private editorial workspace holds check logs and draft judgments.
Its publication-candidate export uses this overlay's schema and excludes private
notes and check logs. Publishing requires a reviewed repository change. Do not copy
a private backup into this public repository. The overlay's fields are public.

An estimate without a stated basis cannot be published. Unknown duration,
preparation, and verification effort remain unknown. The existing activity scale
(for example, one class) is not treated as a preparation estimate.

## Repeatable relevance review

Run `node tools/editorial-audit.js` to inspect the first ten results in each group
for six representative faculty problems. This creates a review queue, not an
automatic retagging decision. Check broad-field cases for subject knowledge,
materials, and adaptation; a transferable teaching method is not necessarily ready
for another discipline. Review cost, accounts, data, and preparation against sources
and date each check. Prioritize frequently used ideas using actual knowledge of use,
not an invented usage metric. A source's outcome claim may not transfer to this
collection's adapted workflow.

Tests: `npm run test:workspace` and `python3 -m unittest discover -s tests -p '*_test.py'`.
The existing matching, full-detail, print, accessibility, and licensing suites remain
required. Browser tests now explicitly open secondary result disclosures before
examining their contents.
