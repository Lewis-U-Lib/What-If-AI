# Public terminology: use-case ideas

Reviewed October 7, 2026.

Both What If AI and The Register now call collection entries **use-case ideas**.
The singular is **use-case idea**. This wording applies to navigation, headings,
filters, result counts, cards, detail dialogs, feedback prompts, saved selections,
print and copied text, walkthroughs, accessibility labels, loading states, and
collection-authored descriptions shared by both tools.

The final presentation stage changes 1,374 public data fields after the record
review. When the old noun describes an action rather than a collection entry,
contextual wording preserves its meaning: street life, an action log, daily tasks,
lesson tasks, or intellectual work, for example.

## Source boundaries

Verbatim source language remains intact, including published titles, source
headings and locators, quotations, source-provided prompts, syllabus excerpts,
license quotations, bibliography entries, and the source/rights prefix of
attribution statements. Four entry titles that reproduce source titles remain
unchanged, as does a reference to the toolkit heading **Activity 2**. These
exceptions are named in `content/terminology.json`.

Only collection-authored prose following `Changes:` in attribution statements is
editable. One bibliography license field, `SRC-0143.lic`, has an editorial note
after the source's quoted license statement; only that note changes terminology.

The imported corpus, earlier decision manifests, and dated historical review
records retain their original wording and hashes. Those are the audit trail, not
the public presentation. Stable identifiers, saved-selection keys, analytics
fields, URL fragments, and internal code names retain their existing values so
saved lists, old links, feedback records, and matching behavior continue to work.

## Build and verification

`tools/terminology.py` runs after `tools/record_review.py`. The manifest pins input
and output SHA-256 hashes and the changed-field count. The build refuses upstream
changes until these source boundaries are reviewed and the manifest is repinned.
`version.json` records the terminology revision separately from the earlier data
and publication decisions.

The source-preservation tests compare all 1,033 records and 618 sources before and
after the terminology pass. They protect structural fields, source excerpts,
attributions, citations, bibliography and policy quotations, publication counts,
and record identifiers. Existing browser checks exercise the revised wording in
both tools, saved lists, printing, walkthroughs, navigation, matching, feedback,
accessibility, and narrow layouts.

This change adds or removes no use-case ideas or sources. The record-review
holds, withdrawals, source-access labels, and open review questions remain as
recorded in [the October 6 review](RECORD-REVIEW-2026-10-06.md).
