/* The low-vision checks, run in every palette and view, with one summary at the end.
 * For each of crimson, steel blue and light, textured and in the plain reading view, this runs:
 *   tests/contrast.test.js   text over textured surfaces, AA
 *   tests/nontext.test.js    boundaries of controls, state indicators, keyboard focus (SC 1.4.11, 2.4.7, 2.4.13)
 *   tests/vision.test.js     every pair those two measured, under protanopia, deuteranopia and tritanopia
 *   tests/reflow.test.js     200% and 400% zoom, text spacing, focus not hidden (SC 1.4.4, 1.4.10, 1.4.12, 2.4.11)
 *
 *   node tests/lowvision.js [siteDir]
 *   VIEWS=light,light-plain node tests/lowvision.js      only these (crimson, crimson-plain, blue, blue-plain, light, light-plain)
 *   LOWVISION_OUT=dir                                     keep the measurements (JSON) and each test's output there
 * Exits non-zero if any test in any view fails. A full run takes about half an hour. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const site = process.argv[2] ? [process.argv[2]] : [];
const out = process.env.LOWVISION_OUT ? path.resolve(process.env.LOWVISION_OUT) : fs.mkdtempSync(path.join(os.tmpdir(), 'lowvision-'));
fs.mkdirSync(out, { recursive: true });
const ALL = ['crimson', 'crimson-plain', 'blue', 'blue-plain', 'light', 'light-plain'];
const views = (process.env.VIEWS ? process.env.VIEWS.split(',').map(v => v.trim()) : ALL).filter(v => ALL.includes(v));
const test = f => path.join(__dirname, f);

const rows = [];
let failed = false;
for (const view of views) {
  const [theme, plain] = view.split('-');
  const env = { ...process.env, SITE_THEME: theme, SITE_PLAIN: plain ? '1' : '0' };
  const pairs = path.join(out, `text-${view}.json`), nontext = path.join(out, `nontext-${view}.json`);
  const run = (name, file, args, extra) => {
    const r = spawnSync(process.execPath, [test(file), ...args], { env: { ...env, ...extra }, encoding: 'utf8', maxBuffer: 1 << 26 });
    fs.writeFileSync(path.join(out, `${name}-${view}.log`), (r.stdout || '') + (r.stderr || ''));
    const fails = ((r.stdout || '').match(/^FAIL /gm) || []).length;
    if (r.status !== 0) failed = true;
    return r.status === 0 ? 'pass' : (fails ? fails + ' finding' + (fails > 1 ? 's' : '') : 'error');
  };
  const row = { view };
  row.text = run('contrast', 'contrast.test.js', site, { CONTRAST_PAIRS: pairs });
  row.nontext = run('nontext', 'nontext.test.js', site, { NONTEXT_OUT: nontext });
  row.vision = run('vision', 'vision.test.js', [pairs, nontext].filter(f => fs.existsSync(f)), {});
  row.reflow = run('reflow', 'reflow.test.js', site, { REFLOW_OUT: path.join(out, `reflow-${view}.json`) });
  rows.push(row);
  console.log(`${view.padEnd(14)} text ${row.text.padEnd(12)} non-text ${row.nontext.padEnd(12)} color vision ${row.vision.padEnd(12)} zoom and spacing ${row.reflow}`);
}
console.log(`\nMeasurements and each test's output: ${out}`);
console.log(failed ? 'Findings above; see the logs for each.' : 'PASS low-vision checks in ' + views.length + ' view(s)');
process.exit(failed ? 1 : 0);
