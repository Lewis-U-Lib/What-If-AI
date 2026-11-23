/* Color-vision simulation over what the two pixel tests measured.
 * tests/contrast.test.js (CONTRAST_PAIRS=file) and tests/nontext.test.js (NONTEXT_OUT=file) write the pair of
 * colors behind every measurement: text and the surface under it, an edge and what it stands against, a focus
 * ring and what it is drawn over. This test puts each pair through a simulation of protanopia, deuteranopia and
 * tritanopia and measures the contrast again. A pair passes when it still meets the threshold it had to meet
 * before: 4.5:1 for text, 3:1 for large text and for anything that is not text.
 *
 * The simulation is Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model for Simulation of Color
 * Vision Deficiency", at severity 1.0 (full dichromacy), applied to linear RGB. Seeing no color at all
 * (achromatopsia) needs no simulation: WCAG contrast is a ratio of luminances, so it is what the other tests
 * already measure.
 *
 * This checks contrast. It cannot tell whether two things that mean different things are told apart by hue
 * alone; axe's link-in-text-block rule and the tests of the state indicators cover the cases this site has.
 *   node tests/vision.test.js pairs.json [nontext.json ...]
 * Exits non-zero on any failure. */
const fs = require('fs');

const SIM = {
  protanopia:   [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia:   [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const clamp = v => Math.min(1, Math.max(0, v));
/* relative luminance of a color as a simulated viewer's display would have to show it */
function lum(rgb, m) {
  let v = rgb.map(lin);
  if (m) v = m.map(row => clamp(row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const ratio = (a, b, m) => { const x = lum(a, m), y = lum(b, m); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tests/vision.test.js pairs.json [nontext.json ...]'); process.exit(2); }

const pairs = [];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (Array.isArray(data)) {                                    // text, from tests/contrast.test.js
    for (const p of data) if (p.fg && p.bg) pairs.push({ kind: 'text', what: `"${p.text}" (${p.where})`, a: p.fg, b: p.bg, need: p.need });
    continue;
  }
  for (const b of data.boundaries || []) {                      // from tests/nontext.test.js
    if (b.cr >= 3) pairs.push({ kind: 'edge', what: `${b.what} "${b.label}" (${b.state})`, a: b.a, b: b.b, need: 3 });
    else if (b.pass && b.ink && b.surface) pairs.push({ kind: 'edge', what: `${b.what} "${b.label}" (${b.state})`, a: b.ink, b: b.surface, need: 3 });
  }
  for (const s of data.states || []) if (s.pass && !s.informative && s.a && s.b) pairs.push({ kind: 'state', what: s.what, a: s.a, b: s.b, need: 3 });
  for (const s of data.focus || []) if (s.pass && s.a && s.b) pairs.push({ kind: 'focus', what: `${s.what} "${s.label}" (${s.state})`, a: s.a, b: s.b, need: 3 });
}

let fails = 0;
const kinds = [...new Set(pairs.map(p => p.kind))];
console.log(`${pairs.length} measured pairs: ` + kinds.map(k => `${pairs.filter(p => p.kind === k).length} ${k}`).join(', '));
for (const [name, m] of Object.entries(SIM)) {
  let tight = null, below = 0;
  for (const p of pairs) {
    const now = ratio(p.a, p.b, m), was = ratio(p.a, p.b, null);
    if (was < p.need) continue;                                  // a median color can sit under a threshold its pixels met; judge only what holds unsimulated
    if (!tight || now / p.need < tight.now / tight.p.need) tight = { now, was, p };
    if (now < p.need) { below++; fails++; console.log(`FAIL ${name}: ${p.kind} ${p.what} ${was.toFixed(2)}:1 becomes ${now.toFixed(2)}:1 (needs ${p.need}:1)`); }
  }
  console.log(`  ${name}: ${below} below threshold` + (tight ? `; tightest ${tight.p.kind} ${tight.p.what}: ${tight.was.toFixed(2)}:1 becomes ${tight.now.toFixed(2)}:1 against ${tight.p.need}:1` : ''));
}
console.log(fails ? `\n${fails} failure(s)` : '\nPASS color-vision simulation: every measured pair keeps its contrast');
process.exit(fails ? 1 : 0);
