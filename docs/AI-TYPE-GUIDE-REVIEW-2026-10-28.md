# Types of AI systems: review of October 28, 2026

This review covers the guide on The Register's *Types of AI systems* page (`content/ai-type-guide.json`), its 43 references, the product examples (`src/js/register-type-examples.js`), and the code that renders them.

## Scope and method

- **Claims.** Every cited field was split into individual claims, and each claim was checked against the source it cites. That covers the introduction, the five "Whatever the tool" considerations, the no-student-AI entry, and the *what*, *does*, *io*, and *limits* fields of all 11 entries. Reviewers read abstracts and full texts, using the locator in each reference to find the passage.
- **Reference details.** Each reference was checked for authors, year, title, venue, pages, identifier, URL, publication status ("kind"), and whether its locator points to a real section.
- **Illustrative faculty use.** The *why* fields describe ideas in this collection, so they were checked against `data/acts.json`: that the named examples exist, carry the entry's capability, and match how they are described, and that statements such as "mainly in…" match the distribution.
- **Repetition.** Points repeated across fields, across entries, or between the guide and the general considerations.
- **House style.** Descriptive, not directive; neutral on AI; American spelling.
- **Product examples.** All 33 were checked. Each official page was opened, the product name confirmed as current, and the description compared with what the page says.
- **Code.** The type window and its references were reviewed for structure, keyboard behavior, escaping, and link handling.

Five reviewers worked in parallel on separate sections. Every change below was applied by a script that first confirmed the old text was present. The two research files (`docs/research/ai-type-sources.json` and `docs/research/ai-type-excerpts.md`) were brought into line with the revised references.

**Access limits.** doi.org, the Crossref API, unesco.org, and some publisher pages could not be reached from the review environment. Reference details were confirmed through publisher pages, arXiv, ACL Anthology, OpenAlex, PMLR, NeurIPS, OpenReview listings, and NIST's AI Resource Center instead. Items that could not be confirmed are listed at the end.

## Summary

| | Count |
|---|---|
| Claims not supported as written by the cited source (corrected) | 20 |
| Reference detail, label, or locator problems (corrected) | 16 sources |
| Wording, repetition, or directive phrasing (corrected) | about 20 |
| Product examples changed | 8 of 33 (one renamed product) |
| Code issues (fixed) | 1 |

Most corrections narrow a claim to what the study tested. Common patterns:

- one study's result stated as a general rate
- a 2023 benchmark described in the present tense
- an example that goes beyond the cited paper

No claim was found to rest on a nonexistent source; every reference names a real work, confirmed through publisher or repository records (DOI links themselves could not be opened from the review environment).

## Corrections to claims

| Location | Problem | Change |
|---|---|---|
| Intro, first paragraph | "Do not require a particular product" is too absolute: 561 records fill in a tool field and some name a product as the route. | Now says each idea records what a tool must be able to do, or that no tool is needed. |
| Intro, third paragraph | "Generating new content" as a task is not in sources 2–3. | Source 1 (OECD's Task & Output dimension) added. |
| Consideration 2 | "How a tool is hosted… does not establish privacy" has no source. | Clause removed; only source 5 is cited. |
| Consideration 4 | "People tend to over-rely" is stronger than the source's "may over-rely." | "may over-rely." |
| Language models, *does* | "Revises them in response to feedback" is not in sources 7–8. | Removed. |
| Multimodal, *limits* | MMMU's overall score was presented as a finding about charts; written in the present tense about 2023 models; ended with a "consider" directive. | Dated to models tested in 2023 and 2024, scope restated, closing phrased as a question. |
| Image, *what* | "One widely used approach" and "extend an image" are not in source 16. | Restated as "the approach in the cited research"; "extend" removed. |
| Speech and audio, *limits* | The Whisper study (one service, April–May 2023) was presented as a general rate; consent and ethics approval had no source; one directive. | Names the service and dates and adds the authors' December 2023 rerun ("far fewer produced invented text"). Consent and ethics approval are now raised as a question. |
| Code, *io* | "Data file… written interpretations" is not supported. | "A description, data, or existing code goes in; proposed code comes out, along with the results of running it…" Source 30 added. |
| Code, *limits* | "Analyses can apply inappropriate methods" has no source. The upload sentence relied on source 5, which does not cover uploads, and repeated Consideration 2. | Replaced with a question about review; upload sentence and source 5 removed. |
| Discipline, *why* | "Mostly from faculty research in the sciences" overstated it: 12 of 28 ideas are sciences research. | "Most related ideas come from faculty research, much of it in the sciences." |
| Document-grounded, *what* | Placing text in the model's context is supported by source 35, which was not cited. | Source 35 added. |
| Document-grounded, *does* | Summarizing, comparing documents, and showing passages are not in source 34. "Retrieval" should be "retrieval-augmented generation." | Rewritten to what sources 34 and 36 describe; source 36 added. |
| Document-grounded, *io* | "Usually with references" and "typically start with a collection you supply" are unsupported; one directive. | "often with citations"; closing phrased as a question; source 36 added. |
| Document-grounded, *limits* | "Only as good as what is retrieved": source 36 found reasoning errors were most common for two of three tools. The upload sentence relied on source 5. | "Errors can come from retrieval or from what the model does with retrieved text…" Upload point is now a question; source 5 removed. |
| AI-assisted search, *what* | Scholarly indexes and limiting a search are not in source 37. | Restated; source 38 added. |
| AI-assisted search, *limits* | Misstated what the comparison was against, and attributed the shortfall to limited reach rather than question complexity. | "In one 2025 evaluation against four published evidence syntheses, an AI research tool found, on average, fewer than half of the studies those reviews included…" |
| Agents, *does* | "Filling in documents, sorting records, drafting messages" are not in sources 40–41. | Examples drawn from WebArena; source 42 added. |
| Agents, *limits* | "Errors can compound across steps" is not supported; the 14 percent figure was undated. | Opening clause removed; figure dated to a 2024 benchmark, "end to end." |
| Institutional access, *does* | "Context of use" is not an OECD dimension; "NIST assesses trustworthiness" is inaccurate. | "NIST's framework weighs a system's trustworthiness in light of its context of use." OECD citation moved out. The first sentence describes the access arrangement and remains editorial, which the build permits for this entry. |

## Other wording changes

- **Language models.** *what* now says models "can be further trained… a chat assistant is an interface to such a model." *io* drops "or code," which the cited source does not show and the code entry covers.
- **Multimodal, *what*.** No longer repeats *io*.
- **Consideration 1.** No longer repeats the no-student-AI entry; it now uses UNESCO's call for institutions to validate tools for ethical and pedagogical appropriateness. The excerpt is recorded in the research files.
- **Image, *limits*.** The Copyright Office point now matches the 2025 report: with current generally available technology, prompts alone do not give enough control to make a user the author.
- **Video.** *io* drops "check each product's documentation." *limits* states the study's scope (models trained on simple simulated motion) and drops a question that repeated Consideration 3.
- **Speech and audio, *why*.** Names voice role-play rehearsal, the largest group of ideas. The transcript example now matches the record, which uses qualitative-research audio, not an interview.
- **Code.** *does* now says "In one study of math, symbolic, and algorithmic reasoning tasks…". *limits* says "the best public system its authors tested" and "more likely to believe it was secure." *why* says "split almost evenly," and its second example now generates code, unlike the old one, which ran provided notebooks.
- **Discipline.** *what* says "Some such models…, such as protein structure prediction," with source 32 added. *limits* paraphrases rather than borrowing the source's phrase, and drops source 5.
- **AI-assisted search, *limits*.** Now says "model-written summaries," because source 39 tested summaries of given texts, not search tools.
- **Agents, *why*.** Ideas span teaching (the largest group), administrative, and research settings, rather than "mainly administrative and research."
- **Institutional access.** *why* now says the manuscript is "kept out of every tool," as in the record. *limits* attributes the NIST transparency sentence correctly and drops an unsourced clause.
- **Remaining directives.** One "consider…" remained, in lowercase after a semicolon, in the multimodal entry; it is now a question. No directives remain.

## Reference corrections

- **URLs in references.** Sources 7, 21, 23, 29, 30, 34, and 42 now include their URL in the reference, as APA 7 requires when there is no DOI.
- **Author name.** Source 8 now gives Christiano as "P. F."
- **Short labels.** APA 7 adds initials when first authors share a surname, so source 14 is now "Y. Liu et al., 2024", source 35 "N. F. Liu et al., 2024", and source 37 "N. Liu et al., 2023". The previous "2024a/2024b" suffixes are reserved for the same authors in the same year.
- **Source 41 (ReAct).** Now cited as the ICLR 2023 paper at OpenReview, with the arXiv camera-ready version named in the locator.
- **Locators corrected or made specific:**
  - source 6: Section 3 introduction, context of use
  - source 19: Section II.D and Executive Summary
  - source 27: the December 2023 rerun
  - source 42: Section 3, task intents
  - source 43: Section 3.1, injection methods
- The guide's reviewed date is now October 28, 2026.

## Product examples (checked October 28, 2026)

| Entry | Change |
|---|---|
| Agents | **Zapier Agents is now AI by Zapier** (Zapier, October 6, 2026; not retired). Name and link updated to Zapier's help article on adding tools to an AI by Zapier step. |
| Language models | Gemini's link moved from an overview page that still names a retired plan to Google's "Use Gemini Apps" help page, which supports the description. |
| Document-grounded | Gemini Notebook's link uses the general English locale instead of Singapore's. The name is current: NotebookLM was renamed in July 2026. |
| AI-assisted search | Perplexity's link moved from the retired Pro Search page to "How does Perplexity work?" Consensus's link moved to "How Consensus works," which supports "summarizes." Elicit now reads "Finds research papers and extracts data into tables and reports." |
| Image | Adobe Firefly now reads "Generates and edits images from text prompts." |
| Institutional access | Claude for higher education now reads "Provides university-wide Claude plans for students, faculty, and staff." |

The other 25 examples were confirmed: official page, current name, accurate description, and correct type. Two notes:

- SpaceX acquired Cursor in August 2026, but the product is still called Cursor.
- Otter.ai's homepage now leads with a meeting agent, but transcription is still described.

The examples file carries its own license (CC BY-NC-SA 4.0), and its hash is pinned in `content/tool-license.json`. The pin was updated deliberately for this editorial revision; the license is unchanged.

## Code review

- **Fixed.** The type window's keyboard trap counted invisible elements as the last stop, so Tab could leave the window once slides were stacked. It now ignores anything hidden or inert.
- **Confirmed sound:**
  - All guide text is escaped before rendering.
  - Citation numbers match each reference's list value.
  - External links open in a new tab with `noopener noreferrer` and say so to screen readers.
  - The build rejects unknown citations and unused references.
  - The research files match the guide for all 43 sources.

## Interface changes in the same pull request

- **Five-slide carousel.** Each capability and system entry now pages through five slides, in the walkthroughs' style: What it does, Inputs and outputs, Illustrative faculty use, Limits and open questions, and References. References replaces "Sources for this explanation."
- **Controls.** Previous, position, dots, and Next sit in the window's fixed footer, so a long References slide never moves them. Arrow keys, Home, and End also work. On the last slide, Next reads "Back to types" and closes the window.
- **What stays outside the slides.** The short description, Current examples, and the related-ideas link. The no-student-AI entry keeps its single page and labels its list "References."
- **Page reference list.** Retitled from "All 43 references" to "References."

## Not changed, or not confirmed

- **Not confirmed (access limits):**
  - source 4: the UNESCO overview's "updated January 16, 2026" date
  - source 6: printed page numbers in the NIST AI RMF locator
  - source 3: Jordan & Mitchell full text, so pp. 257–258
  - source 8: DOI and page range
  - source 13: volume, issue, and article number
  - source 14: article number
  - source 31: page range
  - source 42: page range
  - source 43: page range
  - sources 38–39: the published versions; figures were checked against the preprints
- **To watch.** NIST states that a revision of the AI RMF (source 6) is in progress.
- **Left as is.** An optional rewrite of the speech and audio *what* field to reduce overlap with *does* and *io* was not applied, because it relied on details not checked against the sources.
