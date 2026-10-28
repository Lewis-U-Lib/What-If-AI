# Types of AI systems: carousel illustrations

The 55 illustrations supplement the five slides in each of the 11 type dialogs from PR #32. The no-student-AI choice remains a single page.

## Visual direction and provenance

Generated with OpenAI image generation on October 28, 2026, using the existing What If AI walkthrough robot in `src/partials/tour.html` as the visual reference. The palette follows the walkthrough's maroon, mustard gold, cream, steel, sage, and sky-blue washes. Each drawing is an illustrative metaphor rather than a research figure; all factual explanations and citations remain in the adjacent text.

## Asset contract

- `src/img/types-<key>.webp`: one transparent 1536 × 1024 atlas per type, encoded at quality 88 with full-quality alpha.
- Each atlas is a 3-column × 2-row grid of 512 × 512 cells. Reading order: What it does; Inputs and outputs; Illustrative faculty use; Limits and open questions; References; unused cell.
- `src/css/register-types.css` selects a distinct cell with background size `300% 200%` and positions `0 0`, `50% 0`, `100% 0`, `0 100%`, `50% 100%`.
- The existing build fingerprints the images and rewrites their CSS URLs. Only an opened type needs its atlas; subsequent slides reuse that asset.
- Artwork has `aria-hidden="true"`, contains no required information, and never takes focus. The complete textual explanation and citations stay readable if images are unavailable.
- Desktop slides put the drawing alongside the text; narrow screens put a smaller drawing above it. Navigation remains in the fixed dialog footer. No animation or automatic advance was added.

## Illustration map

### conversational

LANGUAGE MODELS AND CONVERSATIONAL AI. Top-left: friendly little box robot surrounded by three cream speech bubbles with abstract writing strokes, drafting and answering in language. Top-middle: cream prompt card and small keyboard on left, retro red computer in middle, two different written draft pages on right, suggesting text in and text out. Top-right: an open short-story book on a table, two human readers in discussion with different speech bubbles and a small robot's draft interpretation beside the book; people compare interpretations. Bottom-left: a human hand holds a magnifying glass over a fluent-looking page, revealing a broken citation chain and a small question-mark SHAPE (symbol allowed), conveying claims that need checking. Bottom-middle: a stack of scholarly books and two bookmarked research papers with speech-bubble motif on a cover, inspected with a small magnifier; evidence for language-model explanations.

### multimodal

IMAGE UNDERSTANDING AND MULTIMODAL AI. Top-left: retro robot with a magnifying glass studying a landscape photograph and a simple chart; a cream speech bubble conveys its description. Top-middle: photograph and question bubble entering a small red desktop scanner, with a written description page emerging, no newly created image. Top-right: human hand comparing a scanned archival handwritten page with a machine transcript line by line, with a gold pencil and magnifier. Bottom-left: a blurred handwritten page, tiny chart and ambiguous visual detail beneath a magnifier; uncertain machine interpretation, small gold caution triangle. Bottom-middle: a stack of scholarly research papers and a small illustrated figure/chart plate with bookmarks and magnifier, evidence about visual interpretation.

### image

IMAGE GENERATION. Top-left: a small red retro image-making machine with gold knobs produces three framed imaginative landscape variations. Top-middle: a cream written prompt card and a simple reference sketch beside the machine, and a finished framed illustration on the other side. Top-right: two human students compare a pencil portrait sketch with a generated portrait and exchange constructive visual feedback around a tabletop. Bottom-left: three too-similar stylized portraits beside a magnifier and scales, suggesting representation, copying, and authorship questions without a legal verdict. Bottom-middle: illustrated scholarly books, a research paper with small image thumbnails, and a magnifier, providing sources about image generation.

### video

VIDEO GENERATION. Top-left: a red retro film projector and a short ribbon of three successive frames of a little paper boat, representing generated moving scenes. Top-middle: a cream written prompt sheet beside a gold-knob video console, outputting a short strip of three scene frames with a play triangle. Top-right: human hands comparing a hand-drawn storyboard/shot specification against a small monitor showing the generated previsualization. Bottom-left: film frames showing a ball taking an implausible floating path, with a magnifier and small gold caution triangle, representing physical errors and verification. Bottom-middle: a stack of cinema research books and papers, a short film strip, and a magnifier, evidence for video model explanations.

### audio

SPEECH RECOGNITION AND AUDIO GENERATION. Top-left: three separate simple objects grouped with space: microphone beside transcript page, written card beside speaker, and short musical sound-wave ribbon beside another longer ribbon; distinct speech recognition, text-to-speech, audio continuation. Top-middle: microphone and waveform paired with transcript page, another written page paired with small speaker, clear distinct audio-text transformations, no arrows needed. Top-right: human hand with gold pencil checking an automatic transcript beside headphones and a second manually annotated transcript. Bottom-left: a transcript with an uncertain extra line beneath a magnifier, a microphone and small consent-hand symbol, representing invented phrases and permission to record. Bottom-middle: scholarly papers, a waveform chart, headphones and a magnifier, evidence about separate speech and audio tasks.

### code

CODE GENERATION AND DATA ANALYSIS. Top-left: retro red CRT computer with abstract code strokes on a sage screen beside a simple bar chart and cream data table. Top-middle: written task sheet and raw data table leading to a code page and a desktop machine, with a resulting chart beside it; code plus execution. Top-right: human researcher uses a pencil to compare an epidemic curve on a monitor against a stack of raw observation records. Bottom-left: a code page beneath a large magnifier beside a runnable computer showing a suspicious chart, small gold caution triangle; code running does not prove correctness. Bottom-middle: scholarly computing books, code-pattern pages and a magnifier, evidence behind programming and analysis claims.

### discipline

PREDICTION, CLASSIFICATION, AND PATTERN FINDING. Top-left: a retro red sorting machine arranging different small observation cards into three groups, with a small protein-like folded ribbon model beside it. Top-middle: measurements sheet, image tile and specimen card on one side of a simple console, grouped cards and a predicted ribbon structure on the other. Top-right: human researcher with microscope and gold stylus corrects the outline around one cell on a microscopy image; person checks the classification. Bottom-left: two visibly different sets of specimen cards, magnifier and scales, suggesting model transfer and testing against known cases, with a small gold caution triangle. Bottom-middle: scholarly science books, a microscopy figure, and a research paper under a magnifier, evidence for predictive systems.

### grounded

DOCUMENT-GROUNDED GENERATION AND RAG. Top-left: a retro robot reading a small bounded stack of open books, connecting a highlighted passage to its draft answer using a short gold ribbon. Top-middle: supplied documents and a question bubble beside a red filing box, with a draft answer page carrying a visible little link-chain symbol to a passage. Top-right: human hand compares a faculty proposal page against a supplied solicitation document using a pencil and source tabs, checking alignment. Bottom-left: a magnifier reveals a draft quotation that doesn't match the bookmarked source passage; other pages sit partly obscured, representing missed retrieval and misreading. Bottom-middle: a stack of retrieval research books and papers joined by paper clips and a magnifier, evidence about grounding rather than a guarantee.

### search

AI-ASSISTED SEARCH AND RESEARCH. Top-left: retro magnifying glass over a small connected cluster of research papers, with a red desktop assistant organizing a summary. Top-middle: a cream search-query bubble beside a red search console, then a concise summary sheet and three linked research papers, suggesting question in and cited synthesis out. Top-right: human researcher compares results on a retro computer with library catalog cards and an open original paper. Bottom-left: magnifier inspecting a broken link between a summary claim and source paper, with an empty outlined paper slot nearby suggesting missed literature. Bottom-middle: a carefully arranged stack of source studies and a systematic-review binder under a magnifier, evidence for search capabilities.

### agentic

TOOL-USING AGENTS AND WORKFLOWS. Top-left: friendly retro robot at a workbench operating three distinct small tools, a magnifier, a folder lever, and a document stamper, depicting connected steps rather than autonomous authority. Top-middle: goal card and a ring of permission keys beside a retro console; task cards, a document, and a settings dial on the other side show different possible outputs. Top-right: human reviewer with checklist and magnifier examines simulated inbox message cards while a small robot waits at the side; no actual messages sent. Bottom-left: a webpage card containing a hidden crooked red arrow is stopped by a human-held review paddle before a robot reaches a settings lever, illustrating injected instructions and human checkpoints. Bottom-middle: research papers about web tasks, a small tool box, and magnifier, evidence for agent workflows.

### institutional

INSTITUTIONAL ACCESS AND SELF-HOSTED AI. Top-left: modest campus building beside a red server cabinet and access key, representing institutional terms and hosting, not guaranteed security. Top-middle: a central access doorway with a key, with separate text page, image tile, and microphone around it; the access arrangement can serve different underlying capabilities. Top-right: human researcher at an offline desktop checks a blank review-notes page while a closed manuscript remains separate on the desk, representing confidential review without uploading the manuscript. Bottom-left: institutional agreement page with magnifier beside an unanswered checklist and a gold caution triangle; institutional access is not proof of privacy or accuracy, NO shield or checkmark guarantees. Bottom-middle: scholarly governance framework papers, a campus archive book, and magnifier, evidence about institutional arrangements.

## Keyboard regression

When ArrowLeft, ArrowRight, Home, or End changes a slide while a citation owns focus, the incoming slide receives focus before the old slide is hidden. Keyboard navigation can continue. Focus originating in a persistent footer control stays there.

`tests/types.test.js` checks all 55 atlas cells, image decoding, same-origin loading, decorative semantics, keyboard focus, and the existing nine responsive widths. The sourced guide, product examples, collection, and license pins are preserved from PR #32.

