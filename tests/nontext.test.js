/* Non-text contrast, measured from rendered pixels (WCAG 2.2 SC 1.4.11, 2.4.7 and 2.4.13).
 * axe-core does not measure any of this, and the surfaces are textured, so the test reads screenshots:
 *
 *  - Boundaries. Every control in view (form fields, option cards, buttons, tabs, disclosure bars) is crossed
 *    at the middle of each side. The edge counts as visible where the border, the fill inside it and the
 *    surface outside it differ by 3:1 somewhere: border against outside, border against inside, or inside
 *    against outside. The second-lowest side is the control's score, so three of four sides must show.
 *    Form fields and option cards must reach 3:1. A button, tab or bar is also identified by what is drawn
 *    in it (its label, its icon, or the dot it is), so it passes on its edge or on a visible patch of
 *    pixels inside its box that stand 3:1 off the surface around it; its edge score is reported either way.
 *  - States. Selecting an answer, ticking a filter, choosing a policy position and saving an idea are each
 *    photographed before and after; the pixels that change by 3:1 or more are the state's indicator, and
 *    there must be a visible patch of them. The question bar and the section tabs are sampled directly.
 *  - Keyboard focus. The Tab key is pressed through each state. The pixels that change by 3:1 or more when
 *    an element takes focus are counted against the area of a 2px line around it. SC 2.4.13 (AAA) asks for
 *    that whole area; this test fails a stop that shows less than half of it (a 1px line), or less than
 *    1,000px² on a large scrolling region whose own box clips part of its outline, and reports the stops in
 *    between.
 *
 * One palette and view per run: SITE_THEME=blue|light and SITE_PLAIN=1 choose it, as in every browser test.
 * NONTEXT_OUT=file.json also writes every measurement, with the colors compared, for tests/vision.test.js.
 *   node tests/nontext.test.js [siteDir]
 * Exits non-zero on any failure. */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const path = require('path');
const fs = require('fs');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const { start } = require('./serve');

const VIEW = (process.env.SITE_THEME === 'blue' || process.env.SITE_THEME === 'light' ? process.env.SITE_THEME : 'crimson') + (process.env.SITE_PLAIN === '1' ? ', plain reading view' : '');
const CONTROLS = 'button, a.btn, a.hdr-cta, select, input:not([type="hidden"]), textarea, summary, .secnav a, [role="tab"], [role="radio"], [role="option"]';
const FIELD = el => /^(input|select|textarea)$/.test(el.tag) || el.option;
const TABS = 36;          // Tab presses per state
const PATCH = 36;         // px²: the least a state's indicator may cover (a 6×6 mark)
const REGION = 1000;      // px²: enough of a focus indicator for a large scrolling region, whose own box clips part of its outline

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
  ['landing page', 'index.html', async p => {}],
];

/* each: [name, page, set-up, the control to act on, how to act on it] */
const CHANGES = [
  ['an answer, chosen', 'what-if-ai.html', async p => {}, '.opt', async (p, sel) => p.locator(sel).first().click()],
  ['a filter checkbox, ticked', 'register.html#activities', async p => {}, '#activities .check input', async (p, sel) => p.locator(sel).first().check()],
  ['a policy position, chosen', 'register.html#policies', async p => {}, '.pos[aria-selected="false"]', async (p, sel) => p.locator(sel).first().click()],
  ['a use-case idea, saved', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {}, '#plan button[data-save]', async (p, sel) => p.locator(sel).first().click()],
];

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]; return (hi + 0.05) / (lo + 0.05); };
const median = cs => [0, 1, 2].map(i => { const v = cs.map(c => c[i]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; });

async function ready(page) { await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready') || !document.getElementById('site-manifest'), null, { timeout: 15000 }); }
async function open(ctx, file, act) {
  const page = await ctx.newPage();
  await page.goto('about:blank'); await page.goto(SRV.url(file)); await ready(page);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}*,*::before,*::after{transition:none !important;animation:none !important}' });
  await page.waitForTimeout(200); await act(page); await page.waitForTimeout(700);
  return page;
}
let SRV = null;

/* ---- in the scratch page: pixels ---- */
const PIXELS = `
  window.load = async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data }; };
  window.px = (im, x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= im.w || y >= im.h) return null; const i = (y * im.w + x) * 4; return [im.d[i], im.d[i + 1], im.d[i + 2]]; };
  window.med = cs => [0, 1, 2].map(i => { const v = cs.map(c => c[i]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; });
  window.lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  window.cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
`;

/* the colors crossing each side of each box, from 7px outside to 9px inside: one median color per pixel of depth */
async function profiles(scratch, shot, boxes) {
  return scratch.evaluate(async ({ shot, boxes }) => {
    const im = await load(shot);
    return boxes.map(b => {
      const deep = Math.max(3, Math.min(9, Math.floor(Math.min(b.w, b.h) / 2) - 1));
      const sides = {};
      for (const side of b.sides) {
        const flat = side === 'top' || side === 'bottom';
        const span = Math.max(4, Math.min(24, (flat ? b.w : b.h) - 2 * b.rad - 6));
        const rows = [];
        for (let o = -7; o <= deep; o++) {
          const cs = [];
          for (let t = -span / 2; t <= span / 2; t++) {
            const x = flat ? b.x + b.w / 2 + t : side === 'left' ? b.x + o : b.x + b.w - 1 - o;
            const y = flat ? (side === 'top' ? b.y + o : b.y + b.h - 1 - o) : b.y + b.h / 2 + t;
            const c = px(im, x, y); if (c) cs.push(c);
          }
          rows.push(cs.length ? med(cs) : null);
        }
        sides[side] = rows;       // rows[0] is 7px outside; rows[7] is the box's own outermost pixel
      }
      /* and, for a control drawn smaller than its own box (a dot inside a larger target): how much of the box
         stands 3:1 off the surface around it */
      const around = [];
      for (let x = b.x - 5; x < b.x + b.w + 5; x += 2) for (const y of [b.y - 5, b.y + b.h + 4]) { const c = px(im, x, y); if (c) around.push(c); }
      for (let y = b.y - 5; y < b.y + b.h + 5; y += 2) for (const x of [b.x - 5, b.x + b.w + 4]) { const c = px(im, x, y); if (c) around.push(c); }
      const surface = around.length ? med(around) : null; let mark = 0; const ink = [];
      if (surface) for (let y = Math.ceil(b.y); y < b.y + b.h; y++) for (let x = Math.ceil(b.x); x < b.x + b.w; x++) { const c = px(im, x, y); if (c && cr(c, surface) >= 3) { mark++; if (ink.length < 3000) ink.push(c); } }
      return { deep, sides, mark, surface, ink: ink.length ? med(ink) : null };
    });
  }, { shot, boxes });
}

function edge(profile) {
  /* the strongest of: inside against outside, and any pixel of the edge itself against either */
  const { deep, sides } = profile, out = {};
  for (const [side, rows] of Object.entries(sides)) {
    const at = o => rows[o + 7];
    const outside = [-7, -6, -5, -4].map(at).filter(Boolean), inside = [deep - 2, deep - 1, deep].map(at).filter(Boolean);
    if (outside.length < 2 || inside.length < 2) continue;
    const o = median(outside), i = median(inside);
    let best = { cr: ratio(i, o), a: i, b: o, what: 'fill against surface' };
    for (let z = -2; z <= Math.min(3, deep - 3); z++) {
      const c = at(z); if (!c) continue;
      if (ratio(c, o) > best.cr) best = { cr: ratio(c, o), a: c, b: o, what: 'edge against surface' };
      if (ratio(c, i) > best.cr) best = { cr: ratio(c, i), a: c, b: i, what: 'edge against fill' };
    }
    out[side] = best;
  }
  return out;
}

(async () => {
  SRV = await start({ dir: SITE });
  const browser = await chromium.launch();
  const ctx = await createContext(browser, { viewport: { width: 1280, height: 900 }, bypassCSP: true });
  const scratch = await ctx.newPage(); await scratch.goto('about:blank'); await scratch.addScriptTag({ content: PIXELS });
  const results = { view: VIEW, boundaries: [], states: [], focus: [] };
  const fails = [];

  /* ══ boundaries and keyboard focus, state by state ══ */
  for (const [name, file, act] of STATES) {
    const page = await open(ctx, file, act);

    /* -- boundaries -- */
    const boxes = await page.evaluate(CONTROLS => {
      const top = document.querySelector('dialog[open]');
      const seen = new Set(), out = [];
      for (const el of document.querySelectorAll(CONTROLS + ', .opt')) {
        if (top && !top.contains(el)) continue;
        if (el.closest('[hidden], .sr-only') || el.disabled) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .9) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.left < 8 || r.top < 8 || r.right > innerWidth - 8 || r.bottom > innerHeight - 8) continue;
        const sig = [el.tagName, el.type || '', el.className && el.className.baseVal === undefined ? el.className : '', ['aria-pressed', 'aria-current', 'aria-selected', 'aria-checked', 'aria-expanded', 'open'].map(a => el.getAttribute(a) || '').join('/'), !!el.checked, el.closest('dialog,.topbar,.hdr,.site-foot,.rail,.panel,.filters,.fab-wrap')?.className || ''].join('|');
        if (seen.has(sig)) continue;
        const mine = h => h && (h === el || el.contains(h) || (el.labels && [...el.labels].some(l => l.contains(h))));
        const inside = { top: [r.left + r.width / 2, r.top + 2], bottom: [r.left + r.width / 2, r.bottom - 2], left: [r.left + 2, r.top + r.height / 2], right: [r.right - 2, r.top + r.height / 2] };
        const outside = { top: [r.left + r.width / 2, r.top - 5], bottom: [r.left + r.width / 2, r.bottom + 5], left: [r.left - 5, r.top + r.height / 2], right: [r.right + 5, r.top + r.height / 2] };
        /* a side counts when the control itself is the top thing just inside it and nothing of the control's own lies just outside */
        const sides = Object.keys(inside).filter(s => mine(document.elementFromPoint(...inside[s])) && !mine(document.elementFromPoint(...outside[s])));
        if (sides.length < 3) continue;
        seen.add(sig);
        const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.name || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 42);
        out.push({ sig, tag: el.tagName.toLowerCase(), type: el.type || '', option: el.classList.contains('opt'), text: !!(el.innerText || '').trim() || el.tagName === 'SELECT',
          label, cls: String(el.className).slice(0, 60), x: r.left, y: r.top, w: r.width, h: r.height, rad: parseFloat(cs.borderTopLeftRadius) || 0, sides });
      }
      return out;
    }, CONTROLS);
    if (boxes.length) {
      const shot = (await page.screenshot()).toString('base64');
      const profs = await profiles(scratch, shot, boxes);
      boxes.forEach((b, i) => {
        const sides = edge(profs[i]), list = Object.values(sides).sort((x, y) => x.cr - y.cr);
        if (list.length < 3) return;
        const score = list[list.length === 4 ? 1 : 0];
        results.boundaries.push({ state: name, what: `${b.tag}${b.type && b.tag === 'input' ? '[' + b.type + ']' : ''}${b.option ? '.opt' : ''}`, label: b.label, cls: b.cls, field: FIELD(b), labelled: b.text,
          cr: +score.cr.toFixed(2), by: score.what, a: score.a, b: score.b, mark: profs[i].mark, ink: profs[i].ink, surface: profs[i].surface, sides: Object.fromEntries(Object.entries(sides).map(([k, v]) => [k, +v.cr.toFixed(2)])) });
      });
    }

    /* -- keyboard focus -- */
    const where = () => page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      return { sig: [el.tagName, el.type || '', String(el.className), el.id].join('|'), what: el.tagName.toLowerCase() + (el.type && el.tagName === 'INPUT' ? '[' + el.type + ']' : ''),
        label: (el.getAttribute('aria-label') || el.innerText || el.value || el.name || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 42), cls: String(el.className).slice(0, 60),
        x: r.left, y: r.top, w: r.width, h: r.height, sx: scrollX, sy: scrollY,
        inner: [...document.querySelectorAll('dialog[open] .dlg__body, dialog[open]')].map(d => d.scrollTop).join(',') };
    });
    /* Three photographs decide each stop: the one before it took focus, the one with focus, the one after focus moved
       on. A pixel belongs to the stop's indicator when the first and third agree and the second differs from them by
       3:1, wherever on the page the indicator is drawn (a card may light up around the link inside it). */
    await scratch.evaluate(() => { window.S = []; });
    const keep = async shot => scratch.evaluate(async b64 => { window.S.push(await load(b64)); if (window.S.length > 3) window.S.shift(); }, shot.toString('base64'));
    await page.mouse.move(2, 2);
    const trail = [await where()];
    await keep(await page.screenshot());
    const seen = new Set();
    for (let k = 0; k <= TABS; k++) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(60);
      trail.push(await where());
      await keep(await page.screenshot());
      const [a, e, n] = trail.slice(-3);
      if (trail.length < 3 || !e || seen.has(e.sig)) continue;
      const same = (p, q) => !p || !q || (p.sx === q.sx && p.sy === q.sy && p.inner === q.inner);
      if (!same(a, e) || !same(e, n) || (!a && !n)) continue;                         // the page scrolled between photographs
      if (!(e.x >= 0 && e.y >= 0 && e.x + e.w <= 1280 && e.y + e.h <= 900 && e.w >= 4 && e.h >= 4)) continue;
      seen.add(e.sig);
      const m = await scratch.evaluate(({ e, n }) => {
        const [before, on, after] = window.S;
        let changed = 0, strong = 0, near = 0; const lit = [], unlit = [];
        for (let y = 0; y < on.h; y++) for (let x = 0; x < on.w; x++) {
          const i = (y * on.w + x) * 4;
          if (on.d[i] === after.d[i] && on.d[i + 1] === after.d[i + 1] && on.d[i + 2] === after.d[i + 2]) continue;
          const steady = before.d[i] === after.d[i] && before.d[i + 1] === after.d[i + 1] && before.d[i + 2] === after.d[i + 2];
          /* where the neighbours' own indicators overlap this one (the first and third photographs differ), count only
             what lies right around this element and clear of the next */
          const close = x >= e.x - 14 && x <= e.x + e.w + 14 && y >= e.y - 14 && y <= e.y + e.h + 14 && !(n && x >= n.x - 5 && x <= n.x + n.w + 5 && y >= n.y - 5 && y <= n.y + n.h + 5);
          if (!steady && !close) continue;
          const p = [on.d[i], on.d[i + 1], on.d[i + 2]], q = [after.d[i], after.d[i + 1], after.d[i + 2]];
          const big = cr(p, q) >= 3;
          if (steady) { changed++; if (big) strong++; }
          if (close && big) near++;
          if (big && lit.length < 4000) { lit.push(p); unlit.push(q); }
        }
        return { changed, strong: Math.max(strong, near), lit: lit.length ? med(lit) : null, unlit: unlit.length ? med(unlit) : null };
      }, { e, n });
      const line = 4 * (e.w + e.h);            // the area of a 2px line around the element
      results.focus.push({ state: name, what: e.what, label: e.label, cls: e.cls, strong: m.strong, changed: m.changed, line: Math.round(line), share: +(m.strong / line).toFixed(2), a: m.lit, b: m.unlit });
    }
    await page.close();
  }

  /* ══ states ══ */
  for (const [name, file, setup, sel, act] of CHANGES) {
    const page = await open(ctx, file, setup);
    const loc = page.locator(sel).first();
    if (!(await loc.count())) { results.states.push({ what: name, missing: true }); await page.close(); continue; }
    await loc.scrollIntoViewIfNeeded(); await page.mouse.move(2, 2); await page.waitForTimeout(250);
    const before = (await page.screenshot()).toString('base64');
    const box = await loc.evaluate(el => { const r = (el.closest('label') || el).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, sy: scrollY }; });
    await act(page, sel);
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.mouse.move(2, 2); await page.waitForTimeout(350);
    const after = (await page.screenshot()).toString('base64');
    const still = await page.evaluate(() => scrollY) === box.sy;
    const m = await scratch.evaluate(async ({ a, b, e }) => {
      const off = await load(a), on = await load(b);
      let strong = 0; const lit = [], unlit = [];
      for (let y = Math.max(0, Math.floor(e.y - 4)); y < Math.min(on.h, e.y + e.h + 4); y++) for (let x = Math.max(0, Math.floor(e.x - 4)); x < Math.min(on.w, e.x + e.w + 4); x++) {
        const p = px(on, x, y), q = px(off, x, y);
        if (cr(p, q) >= 3) { strong++; if (lit.length < 4000) { lit.push(p); unlit.push(q); } }
      }
      return { strong, lit: lit.length ? med(lit) : null, unlit: unlit.length ? med(unlit) : null };
    }, { a: before, b: after, e: box });
    results.states.push({ what: name, still, strong: m.strong, a: m.lit, b: m.unlit });
    await page.close();
  }

  /* the question bar and the section tabs, sampled directly */
  {
    const page = await open(ctx, 'what-if-ai.html', async p => { await p.locator('.opt').first().click(); await p.click('#next'); });   // the second question: one segment finished, one current, three ahead
    const spots = await page.evaluate(() => {
      const bar = document.querySelector('.qbar'); if (!bar) return null;
      bar.scrollIntoView({ block: 'center' });
      const spans = [...bar.querySelectorAll('span')].map(s => { const r = s.getBoundingClientRect(); return { kind: s.className || 'ahead', x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, h: r.height, w: r.width }; });
      return spans;
    });
    await page.waitForTimeout(250);
    if (!spots || !spots.length) results.states.push({ what: 'question bar', missing: true });
    if (spots && spots.length) {
      const shot = (await page.screenshot()).toString('base64');
      const cols = await scratch.evaluate(async ({ shot, spots }) => { const im = await load(shot);
        const strip = (x, y, w) => { const cs = []; for (let t = -Math.min(12, w / 2 - 2); t <= Math.min(12, w / 2 - 2); t++) { const c = px(im, x + t, y); if (c) cs.push(c); } return med(cs); };
        return spots.map(s => ({ kind: s.kind, fill: strip(s.x, s.y, s.w), ground: strip(s.x, s.top - 5, s.w) })); }, { shot, spots });
      const pick = k => cols.find(c => c.kind.split(' ').includes(k));
      const on = pick('on'), done = pick('done'), ahead = cols.find(c => !/\b(on|done)\b/.test(c.kind));
      if (on) results.states.push({ what: 'question bar: the current segment against the plate', cr: +ratio(on.fill, on.ground).toFixed(2), a: on.fill, b: on.ground });
      if (done) results.states.push({ what: 'question bar: a finished segment against the plate', cr: +ratio(done.fill, done.ground).toFixed(2), a: done.fill, b: done.ground });
      if (on && ahead) results.states.push({ what: 'question bar: the current segment against one still ahead', cr: +ratio(on.fill, ahead.fill).toFixed(2), a: on.fill, b: ahead.fill });
      if (ahead) results.states.push({ what: 'question bar: a segment still ahead against the plate', cr: +ratio(ahead.fill, ahead.ground).toFixed(2), a: ahead.fill, b: ahead.ground, informative: true });
    }
    await page.close();
  }
  {
    const page = await open(ctx, 'register.html#activities', async p => {});
    const spots = await page.evaluate(() => [...document.querySelectorAll('.secnav a')].map(a => { const r = a.getBoundingClientRect(); return { on: a.getAttribute('aria-current') === 'page', x: r.left + r.width / 2, y: r.top + 5, w: r.width }; }));
    const shot = (await page.screenshot()).toString('base64');
    const cols = await scratch.evaluate(async ({ shot, spots }) => { const im = await load(shot);
      return spots.map(s => { const cs = []; for (let t = -20; t <= 20; t++) { const c = px(im, s.x + t, s.y); if (c) cs.push(c); } return { on: s.on, fill: med(cs) }; }); }, { shot, spots });
    const on = cols.find(c => c.on), off = cols.find(c => !c.on);
    if (on && off) results.states.push({ what: 'section tabs: the current tab against the others', cr: +ratio(on.fill, off.fill).toFixed(2), a: on.fill, b: off.fill });
    await page.close();
  }

  await browser.close(); await SRV.close();

  /* ══ verdicts ══ */
  for (const b of results.boundaries) {
    b.pass = b.cr >= 3 || (!b.field && b.mark >= PATCH);
    if (!b.pass) fails.push(`boundary  ${b.state}: ${b.what} "${b.label}" edge ${b.cr}:1` + (b.field ? ' (needs 3:1)' : `, and ${b.mark}px² inside it stands 3:1 off the surface (needs ${PATCH})`));
  }
  for (const s of results.states) {
    if (s.missing) { fails.push(`state     ${s.what}: the control was not found`); continue; }
    s.pass = s.informative ? true : s.cr !== undefined ? s.cr >= 3 : s.strong >= PATCH;
    if (!s.pass) fails.push(`state     ${s.what}: ` + (s.cr !== undefined ? `${s.cr}:1 (needs 3:1)` : `${s.strong}px² changes by 3:1 (needs ${PATCH})`));
  }
  for (const f of results.focus) {
    f.pass = f.strong >= Math.min(f.line / 2, REGION);
    if (!f.pass) fails.push(`focus     ${f.state}: ${f.what} "${f.label}" shows ${f.strong}px² at 3:1, ${f.share} of a 2px line around it`);
  }
  if (process.env.NONTEXT_OUT) fs.writeFileSync(process.env.NONTEXT_OUT, JSON.stringify(results));

  const fields = results.boundaries.filter(b => b.field), others = results.boundaries.filter(b => !b.field);
  const low = xs => xs.length ? Math.min(...xs.map(x => x.cr)).toFixed(2) : 'n/a';
  console.log(`${VIEW}`);
  console.log(`  boundaries: ${fields.length} fields and option cards, lowest edge ${low(fields)}:1; ${others.length} buttons, tabs and bars, ${others.filter(b => b.cr >= 3).length} with an edge at 3:1 or more, ${others.filter(b => b.cr < 3 && b.pass).length} identified by what is drawn in them`);
  console.log(`  states: ${results.states.filter(s => s.pass).length} of ${results.states.length} hold`);
  console.log(`  keyboard focus: ${results.focus.length} stops, ${results.focus.filter(f => f.share >= 1).length} show a full 2px line at 3:1, ${results.focus.filter(f => f.pass && f.share < 1).length} show less than that but pass, lowest ${results.focus.length ? Math.min(...results.focus.map(f => f.share)).toFixed(2) : 'n/a'}`);
  fails.forEach(f => console.log('FAIL ' + f));
  console.log(fails.length ? `\n${fails.length} failure(s)` : '\nPASS non-text contrast: boundaries, states and keyboard focus');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
