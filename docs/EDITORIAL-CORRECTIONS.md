# Editorial corrections

On September 28, 2026, the American-English audit identified spelling and citation
corrections in the data shared by What If AI and The Register. The user approved all
corrections, including Americanizing four adapted display headings.

The upstream `release-export` branch and commit recorded by the imported release were
not available from `Lewis-U-Lib/Faculty-AI-Evaluation-Tool` when checked. The site therefore
keeps `data/` byte-identical to that release and records the approved edits separately in
`content/editorial-corrections.json`. This does not claim to update the upstream corpus.

## Original spelling scope

- 12 editorial word normalizations in activity prose, including seven instances of
  `wellbeing` → `well-being` and one regional vocabulary change, `maths` → `math`.
- Two citation transcription repairs: `interdiscipinary` → `interdisciplinary` and
  `realwork` → `real-work`, restoring the published contribution headings in
  [Towards AI Literacy](https://pure.bangor.ac.uk/ws/portalfiles/portal/75379554/AILiteracy101_June2024F.pdf),
  pp. 140–141 and 238–239.
- Four adapted activity headings, each also repeated in its attribution label:
  Counseling, Practice, Modeling, and Analyzing. Original bibliographic titles and role
  names remain intact, including `Professor in Counselling`.
- One internal policy-rule spelling: `authorisation` → `authorization`.

This is 23 replacements in 22 fields: 21 activity fields across 13 activities, plus one
policy field. Source quotations, source-defined terminology, original names and licenses,
and source-derived British wording documented by the audit remain unchanged. Identifiers,
matching facets, record counts, license boundaries, and activity procedures are unchanged.

## September 28 data supplement

The manifest is now reconciled to imported release `25ec48b9d88c`. All original spelling
corrections still apply. Six additional fields were reviewed during the import:

- `CAN-L-040.depth`: `module` to `quick`. The publisher describes a single 60-minute
  session, whereas this site's module option means a unit over several weeks.
- `CAN-L-034.sum` and `.dl`: distinguish the free chatbot role-play and its transcripts
  from the commercial simulations in the broader source study. The supplied adaptation
  note already made this distinction; the displayed procedure and output now do too.
- `CAN-L-063.licn`, `CAN-L-065.licn`, and `CAN-L-078.licn`: record direct confirmation of
  publisher/chapter licensing, preserving conditions and third-party boundaries.

The current total is 29 replacements in 28 fields. All imported data files remain
byte-identical to the supplied package. These additions do not claim a complete
independent revalidation of every publication in the package. See the
[data review](DATA-UPDATE-2026-09-28.md) for evidence and limits.

## Build and future updates

`tools/build.py` validates the imported release first, then applies the corrections once
before fingerprinting public data. Both pages, their search, saved activity views, and
print renderer use the same corrected activity store. No display-time text substitution
or new browser dependency is involved.

`tools/editorial_corrections.py` allows only the listed prose fields (including license
notes) and one classification field, `depth`. A scale correction must replace the complete
original value, use a labeled intake option, and include a reason and source URL. Other
matching fields cannot be changed through prose replacements. Every correction requires matching
record IDs, original text, occurrence counts, and reviewed final data hashes. It rejects
duplicate targets and a different upstream release. The input objects are not mutated.
The published `version.json` identifies the base release, editorial revision, field and
replacement counts, and a fingerprinted copy of the correction manifest.

When the upstream pipeline becomes available, incorporate these edits into its authoring
records and regenerate a release. Reconcile this manifest at the same time, removing
already incorporated edits and reviewing any remaining ones. Do not simply change its
base-release identifier to make a failing build pass.

Run `npm test` before publishing. The correction safeguard tests, imported-release hashes,
reviewed public-output hashes, deterministic build checks, and existing page/matching/
accessibility tests are part of CI.
