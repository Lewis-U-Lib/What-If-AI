# Source-link audit — 27 October 2026

The initial changes from [PR #27](https://github.com/Lewis-U-Lib/What-If-AI/pull/27) are now combined with the publisher-destination follow-up in [PR #28](https://github.com/Lewis-U-Lib/What-If-AI/pull/28). The counts below describe the initial audit; see the [177-DOI verification and integration report](PUBLISHER-DESTINATIONS-2026-10-27.md) for the current combined policy and remaining follow-up items.

## Scope and result

The release contains 1,033 use-case ideas and 618 references: 982 activity URLs and 618 reference URLs yield **894 distinct primary URLs**. The 51 ideas without a primary URL retain links to works in The Register. All reference records have primary links, so none use the catalog-search fallback.[4]

Every primary URL was submitted to web retrieval. This is a source-link audit, not a fresh scholarly review of every cited work. Embedded links in prose, license deeds, AI-type examples, and external sites' own outgoing links are outside the primary-URL inventory.

| Result | Count |
|---|---:|
| Distinct primary URLs, including distinct page fragments | 894 |
| Retrieved as HTML | 521 |
| Retrieved as PDF | 46 |
| GitHub file confirmed separately; link uses its HTML viewer | 1 |
| Retrieval inconclusive | 326 |
| File-like URLs selected for detailed review | 61 |
| Reviewed endpoints after removing page fragments | 59 |
| Verified webpage defaults | **39** |
| File-only endpoints retained behind a notice | **18** |
| Existing HTML links retained as-is | 2 |

Three reviewed endpoints are HTML exceptions: a GitHub PDF preview, a full-text College & Research Libraries article, and an IRIS PDF URL that redirects to an HTML case study. The IRIS destination is one of the 39 webpage defaults. Thus 38 of 56 file or PDF-wrapper endpoints now lead first to a verified webpage; 18 lead first to a local file notice. The shared policy covers 116 activity/reference occurrences: 78 webpage defaults, 34 notice-first links, and four existing HTML links.

**Inconclusive does not mean broken.** The 326 results include restricted retrieval, rate limits, timeouts, and inaccessible DOI responses. One UNODC URL initially returned 404 and then retrieved the correct activity page on retry; it was retained. The CSV records outcomes instead of treating retrieval failures as confirmed dead links.

## What readers will see

- Where verified: **Open source webpage**, with a locator when the page lists several resources.
- For original files: **Read file notice — PDF may download** (or **file may download**).
- On the notice page: **Open PDF — may download (new tab)**. The file is requested only after that separate choice.
- A shared notice: “Source links open in a new tab. External sites and browser settings may still cause a file to download.”

The notice page explains: “Opening this source may download a file instead of displaying it in your browser. The source website and your browser settings control what happens.” A new tab cannot override an attachment response or a browser configured to download PDFs.[1][2][3]

Verified replacements include JMLR's article record and UCL's UNESCO book record.[19][921]

The ACS lesson and Copilot report offer readable webpage content; other replacements are publisher or repository records with separate file links.[96][1028]

## Secondary review and corrections

- Cross-checked replacement identities and, where available, followed file links back to the recorded resource. Preserved original URLs, query strings, and PDF page fragments.
- Distinguished Carnegie Hall's activity page from its separate worksheet download: the interface explains that the original PDF contains the full Grade 4 packet.[929]
- Rejected the NSRF Text Rendering resource page as a default because it redirects to restricted content. Its direct PDF remains behind the notice.[933]
- Kept uncertain landing-page suggestions out of the mapping. No generic DOI rewrite, guessed PDF-to-HTML conversion, or third-party viewer is used.
- Verified collection IDs, source relationships, licenses, and release fingerprints remain unchanged. Both tools share the presentation overlay.
- Added checks for every activity/reference occurrence, HTML exceptions, aliases, page locators, malformed and unrecognized notice URLs, keyboard activation, no automatic file request, narrow screens, and accessibility.
- Updated the existing integration test to expect a verified webpage or notice URL while requiring preservation of the original file. Its earlier assertion required direct file links, which conflicts with the requested behavior.

Local release, build, 23 Python tests, data integration, matching, and link-policy checks pass. The new browser and accessibility tests passed in the initial CI run. The final full-suite result is recorded in [PR #27's checks](https://github.com/Lewis-U-Lib/What-If-AI/pull/27/checks). Local browser launch is restricted in this environment.

## Limits and maintenance

Web retrieval can use cached content and does not expose raw Content-Disposition headers. This audit does not certify every external site's current browser behavior, every inferred content type, or the 326 inconclusive URLs. Hosts can change redirects and headers later. HTML pages can also contain embedded viewers. Known file endpoints are guarded; external behavior beyond the site remains outside its control.

New file-like primary URLs now fail the build until a review decision is added. Ordinary-looking URLs still need periodic review because later redirects can turn them into file endpoints.

## Review files

- [All 894 URLs and their activity/reference IDs](research/source-links-2026-10-27.csv)
- [Retrieval outcomes and replacement-page evidence](research/source-links-2026-10-27-evidence.json)
- [Shared link policy](../content/source-links.json)

## Sources
[4] [https://github.com/Lewis-U-Lib/What-If-AI/tree/1fc6298df72b2f82f2bcb7d48976292fd76eb0a8](https://github.com/Lewis-U-Lib/What-If-AI/tree/1fc6298df72b2f82f2bcb7d48976292fd76eb0a8)
[1] [Content-Disposition header - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
[2] [<a> HTML anchor element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)
[3] [Navigator: pdfViewerEnabled property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/pdfViewerEnabled)
[19] [DoubleML - An Object-Oriented Implementation of Double Machine Learning in Python](https://www.jmlr.org/papers/v23/21-0862.html)
[921] [AI competency framework for teachers - UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/10196729)
[96] [Lesson 1.1: Molecules Matter](https://www.acs.org/middleschoolchemistry/lessonplans/chapter1/lesson1.html)
[1028] [Summary of evaluation findings | digital.gov.au](https://www.digital.gov.au/initiatives/copilot-trial/summary-evaluation-findings)
[929] [Music Educators Toolbox Grade 4: Composing a Melody | Carnegie Hall](https://www.carnegiehall.org/Education/Programs/Music-Educators-Toolbox/4-Composing-a-Melody)
[933] [Content restricted – National School Reform Faculty](https://nsrfharmony.org/resource-library/textrendering-inbrief)
