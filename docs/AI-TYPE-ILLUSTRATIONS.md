# Types of AI systems: carousel illustrations

The 55 illustrations supplement the five slides in each of the 11 type dialogs. The no-student-AI choice remains a single page.

## Visual direction and provenance

Redrawn in November 2026 for the alloy design, replacing the October 2026 watercolor atlases. The drawings are line art written directly as SVG with AI assistance (Claude) under the Library's direction, in the same style as the 22 walkthrough and "How this site works" drawings: icy-blue outlines on a dark well, one lit yellow element in each scene, and red only where a scene shows what went wrong. A small chip stands for a model, a dashed yellow line for a link back to a source, a magnifier for checking, and a warning triangle for a limit. Each drawing is an illustrative metaphor rather than a research figure; all factual explanations and citations remain in the adjacent text. No drawing contains text.

## Asset contract

- `src/img/types-<key>.svg`: one transparent 400 × 1200 atlas per type. Five 400 × 240 scenes are stacked top to bottom in slide order: What it does; Inputs and outputs; Illustrative faculty use; Limits and open questions; References.
- Each atlas is self-contained: shapes use presentation attributes only, and the glow on the lit element is the atlas's own `#lit` filter.
- `src/css/register-types.css` gives the slide a 5:3 slot drawn as a dark well. `--art-size: 100% 500%` and `--art-position` (0%, 25%, 50%, 75%, 100%) select the scene, which is shown at its original proportions.
- A type's card on the page shows the first scene (`.type-card__art`). The two access-and-participation choices keep their icons and have no card drawing.
- The existing build fingerprints the images and rewrites their CSS URLs. One atlas serves a type's card and all five of its slides.
- Artwork has `aria-hidden="true"`, contains no required information, and never takes focus. The complete textual explanation and citations stay readable if images are unavailable.
- Desktop slides put the drawing alongside the text; narrow screens put it above. Navigation remains in the fixed dialog footer. No animation or automatic advance was added.
- `src/img/step-describe.svg`, `step-explore.svg`, and `step-save.svg` are single 400 × 240 scenes in the same style, used as the three thumbnails under the What If AI hero.

## Keyboard regression

When ArrowLeft, ArrowRight, Home, or End changes a slide while a citation owns focus, the incoming slide receives focus before the old slide is hidden. Keyboard navigation can continue. Focus originating in a persistent footer control stays there.

`tests/types.test.js` checks all 55 scenes: image decoding, same-origin loading, original proportions, transparent edges (to catch clipping), decorative semantics, keyboard focus, and the existing nine responsive widths. The sourced guide, product examples, collection, and license pins are preserved from PR #32.

