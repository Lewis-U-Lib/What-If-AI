# AI-type guide: restored limits and updated sources, October 8, 2026

This is the second revision of `content/ai-type-guide.json` on October 8. The first revision
([sourcing record](AI-TYPE-GUIDE-2026-10-08.md)) added claim-level citations and the three-group
structure. Its practical limits, however, were mostly reduced to what its sixteen sources'
abstracts could support. Several "Limits and practical checks" rows described the cited paper's
scope rather than the technology. This revision keeps the structure, field schema, related-idea
keys, filters, and counts. It restores the practical content of the earlier, uncited guide and
gives that content sources.

## What changed

- **Limits restored with sources.** Each restored limit now has a citation:
  - bias and stereotyping in text and image output;
  - resemblance to training images and the unsettled copyright questions;
  - consent, likeness, and misinformation concerns for synthetic video and voice;
  - transcription differences across speakers, and invented transcript phrases;
  - weaknesses with handwriting, charts, and specialist images;
  - insecure or incorrect generated code, and data leakage in predictive studies;
  - retrieval that misses or misgrounds passages, and AI search coverage gaps and overgeneralized summaries;
  - compounding agent errors and instructions planted in retrieved content;
  - variation between attempts and outdated knowledge.
- **Purpose restored to the introduction.** The first paragraph again explains that use-case
  ideas specify capabilities, not products, and what the page helps a reader recognize. The
  OECD dimensions and the modality/task distinction follow.
- **Card names and definitions aligned with the related-idea filters.** Three cards changed:
  - "Vision and multimodal AI" is now "Image understanding and multimodal AI." Its related ideas
    use the *Reads images* capability.
  - "Code generation and assisted analysis" is now "Code generation and data analysis." Its
    related ideas use *Code or data analysis*. The card still distinguishes writing code from
    running it.
  - Grounded and search previews now state the difference that matters to faculty: who chose the
    sources.
- **Illustrative uses describe the collection.** Each "Illustrative faculty use" row now names
  real related ideas in the published data, read from their summaries. The rows do not tell
  faculty what to require. No counts appear in the prose, since the buttons already show them.
- **Non-prescriptive voice.** "Whatever the tool" items are phrased as considerations
  ("Consider…"). Where a source supports an item, the recommendation is attributed to that
  source (UNESCO, NIST) rather than stated in the Library's voice. The earlier first-person
  "Our practical recommendation" is gone.
- **Citation fit corrected.**
  - The conversational card had cited only the GPT-3 paper, which predates chat systems. It now
    also cites instruction tuning with human feedback (Ouyang et al., 2022).
  - Code execution had partly cited ReAct, whose actions are lookups and game moves. It now cites
    program-aided models, where an interpreter runs the code (Gao et al., 2023).
  - The multimodal card adds a 2024 survey of multimodal language models (Yin et al., 2024).
  - AudioLM is now labeled and cited as the peer-reviewed IEEE/ACM TASLP article. The earlier
    ledger called it an author manuscript.
- **References in APA 7.** Every reference is a full APA 7 entry. Authors are listed through the
  nineteenth, then the final author. Titles are in sentence case, and DOIs are given where they
  exist. Links point to the DOI or the official proceedings page. Where a DOI version is
  paywalled, the locator names an open author manuscript.
- **Numbering by first appearance.** Sources are numbered in reading order: introduction,
  general considerations, then the cards in group order. Bracketed numbers now rise down the
  page.
- **Shorter accessible names.** Each source has a `cite` label (for example, "Brown et al.,
  2020"). The in-text links use it for their accessible name (`s.cite || s.title`), so a screen
  reader does not read twenty author names for each bracketed number.
- **Full reference list collapsed.** With 43 full references, an expanded list would have
  roughly doubled the section's length. The page-level list now sits in a disclosure, "All 43
  references," below the section's notes. Each dialog still lists its own sources in full, and
  the list stays in the page for search and testing. The section is shorter than before the
  revision: about 3,900 px at desktop width, compared with 5,300 px. These two display changes
  are the only edits to `src/js/register.js` and `src/css/register-types.css`.

## Sources

There are 43 sources: all 16 from the first revision, reformatted, plus 27 added. All added
sources date from 2022–2025; Ouyang et al. (2022) is the only one from 2022. Each entry labels
its status:

| Status | Count |
|---|---|
| Peer-reviewed (journal, conference, workshop, review, or meta-analysis) | 36 |
| Preprints, not peer reviewed (Imagen Video; Codex) | 2 |
| U.S. government guidance or report (NIST AI 100-1, NIST AI 600-1, U.S. Copyright Office Part 2) | 3 |
| Intergovernmental (OECD framework; UNESCO publication overview) | 2 |

ReAct is counted as peer-reviewed. It is linked through its ICLR 2023 camera-ready author
manuscript.

Changes to sources kept from the first revision:

- UNESCO is still cited through its publication overview. The full report
  (https://doi.org/10.54675/EWZM9535) refused automated retrieval. The reference now says so, and
  the guide makes only claims the overview supports.
- Jordan and Mitchell now link to the DOI. Their claims are checked against pp. 255–258 of the
  article rather than a PDF that opens mid-way through the preceding article.
- The NIST locators were rechecked against the printed page numbers.

## How identity and claims were checked

- **Identity.** Each DOI was resolved through Crossref, and APA strings were obtained by DOI
  content negotiation, then hand-corrected:
  - sentence case;
  - two OCR misspellings in the Tacotron 2 author list (Skerry-Ryan, Agiomyrgiannakis);
  - the MMMU author order, which follows the CVF and arXiv versions.

  Sources without DOIs were confirmed on the official proceedings page: NeurIPS 2020, PMLR 202
  and 267, ICLR 2024, and the CVF open-access page. OpenReview refuses automated access, so
  ReAct is linked through its arXiv DOI.
- **Claims.** Every guide sentence that carries a citation was compared with what was read. For
  most papers, that is the abstract. Five sources were checked against named sections of the full
  text, given in their locators:
  - NIST AI 600-1, §§2.2, 2.4, and 2.6–2.10;
  - NIST AI 100-1, §§3–3.1, 3.4, and 3.6;
  - U.S. Copyright Office Part 2, pp. 18 and 41;
  - Huang et al., §3.1.2;
  - Wang et al., §2.1.4.

  For Huang et al. and Wang et al., the open author manuscripts were read.
- **Excerpts.** `docs/research/ai-type-excerpts.md` holds short exact excerpts. A script checked
  each one against the retrieved abstract or section text, after normalizing whitespace and
  ligatures, before the files were written. Excerpts from copyrighted works are under fifteen
  words. U.S. government works may carry several.
- **Related ideas.** The ideas named in "Illustrative faculty use" rows were read from their
  published summaries. The selection was checked against each type's capability filter or ID
  list.

No independent subject-expert review, classroom trial, or institutional approval is claimed.
The research and source-check descriptions above are the supplied patch's research record.
Integration checks verify citation mappings, corpus preservation, and interface behavior;
they do not constitute a new independent review of all 43 publications.

The owner confirmed that the presentation setup should remain in place: `scope` stays
visible under "Sources for this guide," and the introduction still identifies the grouping
as an editorial synthesis. The `review_status` and `provenance` fields stay in the source
record without restoring the hidden revision callout or source-check notes.

## Build, pins, and tests

- The guide stage still changes only type prose. `acts.json` and `guide.json` are byte-identical.
  All related-idea IDs, capability keys, and counts are unchanged.
- The license-scope stage pins its input hashes, and `register.json` now carries the revised
  guide. The stage was therefore repinned with `python3 tools/license_scope.py --pin`. The diff
  is only the `register.json` input and output hashes in `content/tool-license.json`. The
  `acts.json` hashes, the 244 clarified identifiers, the note replacements, and every license are
  unchanged.
- The supplied patch reports a passing `npm test` run. Integration reruns the applicable
  checks, and publication runs the complete workflow: release, editorial units, build,
  matching, site, licensing, pages, review, types, feedback, axe, and contrast.
- Integration also checks keyboard operation of the new reference disclosure and adds
  its expanded state to the accessibility and contrast suites.
