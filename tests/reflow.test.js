/* Zoom, reflow, text spacing and focus not hidden, for readers who enlarge the page (WCAG 2.2 SC 1.4.4, 1.4.10,
 * 1.4.12 and 2.4.11). A 1280×1024 window zoomed to 400% lays the page out as a 320×256 one, and zoomed to 200%
 * as a 640×512 one, so the test opens each state at those sizes and checks that:
 *
 *  - nothing scrolls sideways, and an open dialog fits the window's width;
 *  - no text is cut off by its own box (anything already shortened with an ellipsis at full size is left out);
 *  - with the spacing a reader may impose (line height 1.5, paragraph spacing 2em, letter spacing .12em, word
 *    spacing .16em), no text is cut off that was not cut off before, at desktop and phone widths;
 *  - Tab never lands on something wholly covered by the sticky bar, the help button or a backdrop.
 *
 * One palette and view per run: SITE_THEME=blue|light and SITE_PLAIN=1 choose it, as in every browser test.
 * REFLOW_OUT=file.json also writes the findings.
 *   node tests/reflow.test.js [siteDir]
 * Exits non-zero on any failure. */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const path = require('path');
const fs = require('fs');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const { start } = require('./serve');
const VIEW = (process.env.SITE_THEME === 'blue' || process.env.SITE_THEME === 'light' ? process.env.SITE_THEME : 'crimson') + (process.env.SITE_PLAIN === '1' ? ', plain reading view' : '');

const STATES = [
  ['finder, first question', 'what-if-ai.html', async p => {}],
  ['finder, results', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {}],
  ['finder, details open', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => { await p.click('#plan [data-open]'); }],
  ['finder, saved drawer', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {
    const s = await p.$$('#plan button[data-save]'); await s[0].click(); await p.click('.topbar [data-open-saved]'); }],
  ['finder, help menu', 'what-if-ai.html', async p => { await p.focus('#fabToggle'); await p.keyboard.press('Enter'); }],   // opened from the keyboard, as it is Tabbed through
  ['finder, walkthrough', 'what-if-ai.html#tour', async p => {}],
  ['register, activities', 'register.html#activities', async p => {}],
  ['register, activity dialog', 'register.html#act=CAN-G-GAP-004', async p => {}],
  ['register, policies', 'register.html#policies', async p => {}],
  ['register, AI types', 'register.html#ai-types', async p => {}],
  ['register, type details', 'register.html#ai-types', async p => { await p.click('[data-open-type="conversational"]'); }],
  ['register, how to use', 'register.html#about', async p => {}],
  ['register, sources', 'register.html#sources', async p => {}],
  ['landing page', 'index.html', async p => {}],
];
const SPACING = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}p{margin-bottom:2em !important}';

let SRV = null;
async function ready(page) { await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready') || !document.getElementById('site-manifest'), null, { timeout: 15000 }); }
async function open(ctx, file, act) {
  const page = await ctx.newPage();
  await page.goto('about:blank'); await page.goto(SRV.url(file)); await ready(page);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}*,*::before,*::after{transition:none !important;animation:none !important}' });
  await page.waitForTimeout(150); await act(page); await page.waitForTimeout(500);
  return page;
}

/* text cut off by its own box: an element that holds text directly, clips its overflow, and has more than it shows */
const CLIPPED = () => {
  const top = document.querySelector('dialog[open]'), out = [];
  for (const el of (top || document.body).querySelectorAll('*')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && /\S/.test(n.nodeValue))) continue;
    if (el.closest('.sr-only, [hidden], [aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.display === 'inline') continue;
    const cut = (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) || (/hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1);
    if (!cut) continue;
    out.push({ key: el.tagName + '.' + String(el.className).split(' ')[0] + ':' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), ellipsis: cs.textOverflow === 'ellipsis' });
  }
  return out;
};
const WIDE = () => {
  const top = document.querySelector('dialog[open]');
  const d = top ? top.getBoundingClientRect() : null;
  return { page: document.documentElement.scrollWidth - innerWidth, dialog: d ? Math.round(Math.max(d.right - innerWidth, -d.left)) : 0,
    inner: top ? Math.max(0, ...[top, ...top.querySelectorAll('.dlg__body')].map(n => n.scrollWidth - n.clientWidth)) : 0 };
};

(async () => {
  SRV = await start({ dir: SITE });
  const browser = await chromium.launch();
  const fails = [], notes = [], out = { view: VIEW, sizes: [], spacing: [], focus: [] };

  /* text that is already shortened at full size, state by state: the design's own ellipses are not a zoom failure */
  const base = {};
  {
    const ctx = await createContext(browser, { viewport: { width: 1280, height: 1024 }, bypassCSP: true });
    for (const [name, file, act] of STATES) { const page = await open(ctx, file, act); base[name] = new Set((await page.evaluate(CLIPPED)).map(c => c.key)); await page.close(); }
    await ctx.close();
  }

  /* ══ 200% and 400% ══ */
  for (const [zoom, vp] of [['200%', { width: 640, height: 512 }], ['400%', { width: 320, height: 256 }]]) {
    const ctx = await createContext(browser, { viewport: vp, bypassCSP: true });
    for (const [name, file, act] of STATES) {
      let page;
      try { page = await open(ctx, file, act); } catch (e) { fails.push(`${zoom} ${name}: could not reach this state (${String(e.message).split('\n')[0]})`); continue; }
      const wide = await page.evaluate(WIDE), clipped = (await page.evaluate(CLIPPED)).filter(c => !c.ellipsis && !base[name].has(c.key));
      out.sizes.push({ zoom, state: name, wide, clipped: clipped.map(c => c.key) });
      if (wide.page > 1) fails.push(`${zoom} ${name}: the page scrolls sideways by ${wide.page}px`);
      if (wide.dialog > 1) fails.push(`${zoom} ${name}: the dialog is ${wide.dialog}px wider than the window`);
      if (wide.inner > 1) fails.push(`${zoom} ${name}: the dialog's content scrolls sideways by ${wide.inner}px`);
      clipped.forEach(c => fails.push(`${zoom} ${name}: text cut off: ${c.key}`));

      /* Tab through the state: nothing that takes focus may be wholly covered */
      if (/first question|results|activities|help menu|landing/.test(name)) {
        const seen = new Set();
        for (let k = 0; k < 30; k++) {
          await page.keyboard.press('Tab'); await page.waitForTimeout(40);
          const f = await page.evaluate(() => {
            const el = document.activeElement; if (!el || el === document.body) return null;
            const r = el.getBoundingClientRect();
            const mine = h => h && (h === el || el.contains(h) || h.contains(el) && !h.matches('html, body, main, .fab-scrim, [class*="scrim"]') || (el.labels && [...el.labels].some(l => l.contains(h))));
            const pts = [[.5, .5], [.15, .25], [.85, .25], [.15, .75], [.85, .75]].map(([a, b]) => [r.left + r.width * a, r.top + r.height * b]).filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
            /* a translucent backdrop does not hide what is under it (tests/nontext.test.js measures what shows through), so look beneath it */
            const by = pts.map(([x, y]) => document.elementsFromPoint(x, y).find(h => !h.matches('.fab-scrim, .scrim, dialog::backdrop')));
            return { key: el.tagName + '#' + el.id + '.' + String(el.className).split(' ')[0] + ':' + (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36),
              inView: pts.length > 0, shown: by.some(mine), cover: by.filter(h => h && !mine(h)).map(h => h.tagName + '.' + String(h.className).split(' ')[0])[0] || '' };
          });
          if (!f || seen.has(f.key)) continue;
          seen.add(f.key);
          out.focus.push({ zoom, state: name, ...f });
          if (!f.inView) fails.push(`${zoom} ${name}: focus is off screen: ${f.key}`);
          else if (!f.shown) fails.push(`${zoom} ${name}: focus is wholly covered by ${f.cover}: ${f.key}`);
        }
      }
      await page.close();
    }
    await ctx.close();
  }

  /* ══ text spacing ══ */
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await createContext(browser, { viewport: vp, bypassCSP: true });
    for (const [name, file, act] of STATES) {
      const page = await open(ctx, file, act);
      const before = new Set((await page.evaluate(CLIPPED)).map(c => c.key));
      await page.addStyleTag({ content: SPACING }); await page.waitForTimeout(200);
      const after = (await page.evaluate(CLIPPED)).filter(c => !before.has(c.key));
      const wide = await page.evaluate(WIDE);
      out.spacing.push({ width: vp.width, state: name, clipped: after.map(c => c.key), wide });
      after.forEach(c => fails.push(`text spacing @${vp.width} ${name}: text cut off: ${c.key}`));
      if (wide.page > 1) fails.push(`text spacing @${vp.width} ${name}: the page scrolls sideways by ${wide.page}px`);
      await page.close();
    }
    await ctx.close();
  }

  await browser.close(); await SRV.close();
  if (process.env.REFLOW_OUT) fs.writeFileSync(process.env.REFLOW_OUT, JSON.stringify({ ...out, fails }));
  console.log(VIEW);
  console.log(`  200% and 400%: ${out.sizes.length} states opened; ${out.focus.length} focus stops checked`);
  console.log(`  text spacing: ${out.spacing.length} states`);
  fails.forEach(f => console.log('FAIL ' + f));
  console.log(fails.length ? `\n${fails.length} failure(s)` : '\nPASS zoom, reflow, text spacing and focus not hidden');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
