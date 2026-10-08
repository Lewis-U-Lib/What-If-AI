# AI-type guide: sourcing and scope, October 8, 2026

> Later the same day, [the restored-limits revision](AI-TYPE-GUIDE-LIMITS-2026-10-08.md)
> kept this structure, restored the earlier guide's practical limits with sources, and
> expanded the bibliography from sixteen to forty-three APA references. The record below
> describes the first revision as made.

The Register's AI explanations previously carried no claim-level source references. This
revision replaces the introduction, all eleven original descriptions, the no-student-tool
entry, previews, and general recommendations with a newly researched guide. It does not
retroactively attribute the earlier writing to these sources.

## Editorial decisions

- Ten capability/system entries and two access/participation choices occupy three labeled
  groups. Institutional provision and no student AI tool use are explicitly not AI capabilities.
- The introduction distinguishes modalities, tasks, approaches, and deployment context.
  The grouping is a bounded, overlapping editorial synthesis for faculty, not an exhaustive
  or validated classification adopted from OECD or any other source.
- Broadened explanations distinguish speech recognition from speech generation, prediction
  from content generation, and code generation from execution. The former discipline-specific
  card now introduces prediction, classification, and pattern finding; its related entries
  remain the existing selected discipline-specific use cases.
- Definitions, mechanisms, inputs/outputs, and research limitations carry inline source links.
  Each dialog lists the sources used; the page supplies the full sixteen-item bibliography.
  Product examples retain their official links and separate September 25 check date.
- Source labels distinguish peer-reviewed publications, author manuscripts, preprints, and
  government/intergovernmental guidance. The studied systems and publication dates are
  not treated as current product ratings or evidence of learning gains.
- Faculty scenarios and practical checks are editorial suggestions. No independent subject
  expert review, classroom trial, or institutional endorsement is claimed.

## Reproducible provenance

`content/ai-type-guide.json` holds original paraphrases and source mappings. The source ledger
in `docs/research/ai-type-sources.json` was assembled while retrieving the sources. Reference
lists are generated from that mapping. Short exact excerpts in `docs/research/ai-type-excerpts.md`
anchor the ledger, and the citation/evidence verifier checks the guide's reference mapping.
Locators state what was consulted: paper abstracts,
specified framework/report sections, and UNESCO's publication overview. No full-text review
of every paper is claimed. The revision was researched and written with AI assistance.

The source texts are referenced, not incorporated as licensed teaching activities. No claim
is made that publication or public access grants adaptation rights. No figures or tables
from the cited works are reproduced. Existing source rights and activity attribution remain
under the collection's earlier review stages.

The build's guide stage may change prose only; a later license-scope pass clarifies
entry-license notes without changing this guide or its references. It preserves all related-idea IDs,
capability keys, and counts. `acts.json` and `guide.json` remain byte-identical to the
terminology stage; non-type fields in `register.json` remain structurally identical.

## Validation

### Presentation display adjustment

At the owner's request on October 8, the public guide temporarily omits the
"About this revision" callout and source-check notes. The foundational-studies,
preprint, and editorial-suggestion caveats now appear together under "Sources for
this guide" instead of being repeated in each type dialog. Citations and reference
lists remain visible. The provenance and review-status fields remain in
`content/ai-type-guide.json` and this documentation for later restoration.

### Checks

The new unit tests check corpus preservation, complete source mappings, and separation of
access/teaching choices. The dialog suite checks rendered reference URLs and IDs, source
visibility, links-only product examples, keyboard focus, scroll restoration, related-idea
navigation, and nine viewport widths. Existing release, deterministic-build, matching,
page, feedback, WCAG, and contrast checks remain part of the deployment workflow.
