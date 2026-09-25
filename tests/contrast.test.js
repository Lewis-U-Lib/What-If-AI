/* Pixel contrast check for the textured ("plate") surfaces.
 * axe-core cannot judge text over background images (it reports those as "incomplete"), so this
 * measures what is actually rendered: it records every text run inside a textured surface, then
 * re-renders the page with all text made transparent and reads the background pixels behind each
 * run. The comparison uses a bright percentile of those pixels (the worst case for light text),
 * against WCAG 2.2 AA: 4.5:1, or 3:1 for large text (24px, or 18.66px bold, as rendered).
 *   node tests/contrast-plate.test.js [distDir]      (default dist)
 * Exits non-zero on any failure. */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const path = require('path');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const { start } = require('./serve');
let SRV = null;
const URL = f => SRV.url(f);
/* pages with data are ready once boot.js has loaded it; the landing and 404 pages have none */
async function ready(page) { await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready') || !document.getElementById('site-manifest'), null, { timeout: 15000 }); }
const SURFACES = '.topbar, .hdr, .panel__head, .dlg__head, .site-foot, .polpanel, .sec-eyebrow, .btn--primary, .secnav a, .save, .rail .railitem, .protocols, .countline, .readout, .ftag, .type--compact, .type-dialog, .type-example-disclosure > summary, .tour__text, .activity-feedback';
const PCT = 0.9;   // background percentile compared (0.9 = brighter than 90% of the pixels behind the text)

const STATES = [
  ['finder, first question', 'what-if-ai.html', async p => {}],
  ['finder, results', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {}],
  ['finder, details open', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => { await p.click('#plan [data-open]'); }],
  ['finder, activity feedback', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {
    await p.click('#plan [data-open]'); await p.click('[data-give-feedback]');
    await p.check('[name="activity-response"][value="used"]'); await p.check('[value="worked_well"]'); }],
  ['register, feedback reason', 'register.html#activities', async p => {
    await p.click('#activities [data-open]'); await p.click('[data-give-feedback]');
    await p.check('[name="activity-response"][value="not_fit"]'); await p.check('[value="time"]'); }],
  ['finder, saved drawer', 'what-if-ai.html#a=focus:teaching;task:feedback', async p => {
    const s = await p.$$('#plan button[data-save]'); await s[0].click(); await p.click('.topbar [data-open-saved]'); }],
  ['register, activities', 'register.html#activities', async p => {}],
  ['register, policies', 'register.html#policies', async p => {}],
  ['register, AI types + console', 'register.html#ai-types', async p => { await p.$eval('.protocols', e => e.scrollIntoView({block:'center'})); }],
  ['register, type cards', 'register.html#ai-types', async p => { await p.$eval('.types--compact', e => e.scrollIntoView({block:'start'})); }],
  ['register, type details', 'register.html#ai-types', async p => { await p.click('[data-open-type="conversational"]'); }],
  ['register, type examples', 'register.html#ai-types', async p => {
    await p.click('[data-open-type="conversational"]'); await p.click('.type-example-disclosure > summary');
    await p.$eval('#aiTypeDialog .dlg__body', e => e.scrollTop = e.scrollHeight); }],
  ['finder, walkthrough', 'what-if-ai.html#tour', async p => {}],
  ['register, how to use + footer', 'register.html#about', async p => {}],
];

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };

(async () => {
  SRV = await start({ dir: SITE });
  const browser = await chromium.launch();
  let fails = 0, checked = 0, worst = null;
  for (const [name, file, act] of STATES) {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      // bypassCSP: the test injects a style tag to freeze motion; the site's own policy forbids inline styles
      const ctx = await createContext(browser, { viewport: vp, bypassCSP: true }); const page = await ctx.newPage();
      await page.goto('about:blank'); await page.goto(URL(file)); await ready(page);
      await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}*{transition:none !important;animation:none !important}' });
      await page.waitForTimeout(200); await act(page); await page.waitForTimeout(900);   // let the page's own smooth scrolling settle
      const pages = [0];
      if (file.startsWith('register.html#about')) pages.push(1);
      for (const pg of pages) {
        if (pg) await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        await page.waitForTimeout(150);
        // text runs inside textured surfaces, in viewport pixels
        const runs = await page.evaluate((SURFACES) => {
          const out = [], vw = innerWidth, vh = innerHeight;
          const top = document.querySelector('dialog[open]');
          const roots = [...document.querySelectorAll(SURFACES)].filter(r => !top || top.contains(r));
          const z = parseFloat(getComputedStyle(document.body).zoom) || 1;
          for (const root of roots) {
            const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = w.nextNode())) {
              const t = n.nodeValue.replace(/\s+/g, ' ').trim();
              if (!/[A-Za-z0-9]/.test(t)) continue;
              const el = n.parentElement, cs = getComputedStyle(el);
              if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.sr-only,[hidden]')) continue;
              const rg = document.createRange(); rg.selectNodeContents(n);
              for (const r of rg.getClientRects()) {
                const x = r.left, y = r.top, W = r.width, H = r.height;
                if (W < 4 || H < 6 || x < 0 || y < 0 || x + W > vw || y + H > vh) continue;
                // skip text covered by something else (e.g. content scrolled under the sticky bar)
                const mine = h => h && (h === el || el.contains(h) || h.contains(el));
                if (![[W / 2, H / 2], [2, 2], [W - 2, 2], [2, H - 2], [W - 2, H - 2]].every(([dx, dy]) => mine(document.elementFromPoint(x + dx, y + dy)))) continue;
                const m = cs.color.match(/[\d.]+/g).map(Number);
                const px = parseFloat(cs.fontSize) * z, bold = parseInt(cs.fontWeight, 10) >= 700;
                out.push({ t: t.slice(0, 40), x, y, w: W, h: H, c: m.slice(0, 3), a: m[3] ?? 1, large: px >= 24 || (bold && px >= 18.66) });
              }
            }
          }
          out.y0 = scrollY; return { out, y0: scrollY };
        }, SURFACES).then(r => Object.assign(r.out, { y0: r.y0 }));
        await page.addStyleTag({ content: '*,*::before,*::after{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important;caret-color:transparent !important}.fab-wrap,.fab-scrim{visibility:hidden !important}' });
        await page.waitForTimeout(80);
        const y0 = runs.y0, buf = await page.screenshot();
        if (await page.evaluate(() => scrollY) !== y0) throw new Error(name + ': page scrolled between measuring text and reading pixels'); const shot = buf.toString('base64');
        if (process.env.DEBUG_SHOTS) require('fs').writeFileSync(path.join(process.env.DEBUG_SHOTS, (name + '-' + vp.width + '-' + pg).replace(/[^\w-]+/g, '_') + '.png'), buf);
        await page.addStyleTag({ content: '*{color:revert-layer}' });
        // read background pixels in a scratch page
        const scratch = await ctx.newPage();
        const stats = await scratch.evaluate(async ({ shot, runs }) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
          const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
          const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
          return runs.map(r => {
            const x = Math.max(0, Math.round(r.x + 1)), y = Math.max(0, Math.round(r.y + 1));
            const w = Math.min(img.width - x, Math.round(r.w - 2)), h = Math.min(img.height - y, Math.round(r.h - 2));
            if (w < 1 || h < 1) return null;
            const d = g.getImageData(x, y, w, h).data, px = [];
            for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
            return px;
          });
        }, { shot, runs });
        await scratch.close();
        runs.forEach((r, i) => {
          const px = stats[i]; if (!px || !px.length) return;
          const ls = px.map(lum).sort((a, b) => a - b);
          const text = r.a < 1 ? null : lum(r.c);
          if (text === null) return;
          // light text: the brighter background pixels are the risk; dark text: the darker ones
          const bg = text > ls[Math.floor(ls.length / 2)] ? ls[Math.floor((ls.length - 1) * PCT)] : ls[Math.floor((ls.length - 1) * (1 - PCT))];
          const cr = ratio(text, bg), need = r.large ? 3 : 4.5;
          checked++;
          if (!worst || cr / need < worst.cr / worst.need) worst = { cr, need, t: r.t, where: name + ' @' + vp.width };
          if (cr < need) { fails++; console.log(`FAIL ${name} @${vp.width}px  "${r.t}"  ${cr.toFixed(2)}:1 (needs ${need}:1)` + (process.env.DEBUG_SHOTS ? ` pass ${pg} rect ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)} color ${r.c}` : "")); }
        });
      }
      await ctx.close();
    }
  }
  await browser.close(); await SRV.close();
  console.log(`\n${checked} text runs on textured surfaces checked; ${fails} below AA.`);
  if (worst) console.log(`Tightest: "${worst.t}" (${worst.where}) ${worst.cr.toFixed(2)}:1 against ${worst.need}:1`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
