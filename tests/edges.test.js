/* Edges. Plates and cards have a light rim against a darker page, outlined controls sit on a dark fill, and one thing
 * at a time is lit with a gold ring: the current question, an open dialog, the card being pointed at or focused.
 * The same holds in steel blue; the plain reading view draws the ring as a solid line with no glow.
 * The light palette is the same idea turned over: a dark rim against a paler page, outlined controls on a pale fill,
 * and the ring in Lewis crimson.
 * Run after `python3 tools/build.py`:  node tests/edges.test.js [site-dir] */
const assert = require('assert/strict');
const path = require('path');
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const pass = message => console.log('PASS  ' + message);
const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
/* luminance of a css color as the browser reports it, and its alpha */
const read = (page, selector, prop) => page.$eval(selector, (e, prop) => {
  const v = getComputedStyle(e)[prop], m = v.match(/rgba?\(([^)]+)\)/); if (!m) return { v, lum: 0, a: 0 };
  const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  return { v, lum: .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b), a };
}, prop);
const shadow = (page, selector) => page.$eval(selector, e => getComputedStyle(e).boxShadow);
/* a glow is a shadow layer with blur; a ring is a layer with spread and no blur or offset */
const layers = value => value.split(/,(?![^(]*\))/).map(s => s.trim()).filter(s => !/inset/.test(s)).map(s => {
  const n = s.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat); return { x: n[0], y: n[1], blur: n[2], spread: n[3] || 0, gold: /rgba?\((2[2-9]\d|2[0-5]\d), ?(1[6-9]\d|2\d\d), ?(\d{2,3})/.test(s),
    crimson: /rgba?\((9\d|1[0-6]\d), ?([0-3]?\d), ?([0-7]?\d)[,)]/.test(s) };
});

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  try {
    for (const [name, storage] of [['crimson', {}], ['steel blue', { 'lul-whatifai-theme-v1': 'blue' }], ['plain reading view', { 'lul-whatifai-plain-v1': '1' }], ['light', { 'lul-whatifai-theme-v1': 'light' }]]) {
      const context = await createContext(browser, { viewport: { width: 1280, height: 900 } });
      await context.addInitScript(storage => { try { for (const k in storage) localStorage.setItem(k, storage[k]); } catch (_) { /* ignore */ } }, storage);
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const plain = name === 'plain reading view', light = name === 'light';

      await page.goto(server.url('what-if-ai.html#a=focus:teaching;task:design')); await ready(page); await page.waitForSelector('.acard');
      /* rims: light, and clearly present */
      for (const selector of ['.hdr.hdr--compact', '.acard', '.rail button.railitem, .rail a']) {
        const rim = await read(page, selector, 'borderTopColor');
        if (light) assert.ok(rim.lum < .1 && rim.a >= .4, `${name}: ${selector} has a dark rim (${rim.v})`);
        else assert.ok(rim.lum > .6 && rim.a >= .4, `${name}: ${selector} has a light rim (${rim.v})`);
      }
      /* outlined controls: a visible outline on a dark fill */
      const outline = await read(page, '.acard .btn:not(.btn--primary)', 'borderTopColor'), fill = await read(page, '.acard .btn:not(.btn--primary)', 'backgroundColor');
      if (light) {
        assert.ok(outline.a >= .75 && outline.lum < .1, `${name}: buttons have a clear outline (${outline.v})`);
        assert.ok(fill.lum > .8 && fill.a >= .4, `${name}: and a pale fill (${fill.v})`);
      } else {
        assert.ok(outline.a >= .75 && outline.lum > .5, `${name}: buttons have a clear outline (${outline.v})`);
        assert.ok(fill.lum < .02 && fill.a >= .4, `${name}: and a dark fill (${fill.v})`);
      }

      /* the thing in focus: the card under the pointer, and nothing else on the page */
      const lit = async selector => layers(await shadow(page, selector)).filter(l => (light ? l.crimson : l.gold) && (plain ? l.spread >= 2 && !l.blur : l.blur >= 20));
      assert.equal((await lit('.acard')).length, 0, `${name}: a card at rest is not lit`);
      await page.locator('.acard').first().hover(); await page.waitForTimeout(250);
      assert.equal((await lit('.acard')).length, 1, `${name}: the card under the pointer is lit`);
      assert.equal((await lit('.acard:nth-of-type(2)')).length, 0, `${name}: its neighbor is not`);

      await page.goto(server.url('what-if-ai.html')); await ready(page);
      assert.equal((await lit('.qpanel')).length, 1, `${name}: the current question is lit`);
      if (plain) assert.ok(layers(await shadow(page, '.qpanel')).every(l => !(l.gold && l.blur)), 'the plain view draws the ring without a glow');

      await page.goto(server.url('register.html#ai-types')); await ready(page);
      await page.click('[data-open-type="conversational"]'); await page.waitForSelector('#aiTypeDialog[open]');
      assert.equal((await lit('#aiTypeDialog')).length, 1, `${name}: an open dialog is lit`);
      assert.deepEqual(errors, []);
      await context.close();
      pass(light ? 'light: dark rims, outlined controls on a pale fill, and one crimson-ringed thing at a time'
        : `${name}: light rims, outlined controls on a dark fill, and one lit thing at a time` + (plain ? ' (a solid line, no glow)' : ''));
    }
  } finally { await browser.close(); await server.close(); }
  console.log('\nEdge checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
