/* Checks for the November 2 changes on both tools:
 *  - the floating help menu's items are fully opaque in every state, so nothing behind them shows through,
 *    and their text keeps a high contrast ratio over busy page content;
 *  - lit lamps, the seam pulse, hover glows, and the CC symbols use the incandescent palette, and the CC
 *    symbols' glow no longer washes out the counters inside each mark;
 *  - the Library logo is pressed into the plate (SVG filter f-press), its outline lights on hover and on
 *    keyboard focus (f-glow, chained after f-press), and it keeps a high contrast against the plate; it falls back to plain
 *    white under "more contrast" and forced colors, and prints in black;
 *  - the footer links to Report an Issue beside Send feedback.
 * The disclosure wording and the citation-only references are checked in how-this-site-works and types. */
const assert = require('assert/strict'), path = require('path');
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
let count = 0; const pass = m => { count++; console.log('PASS ' + m); };
const REPORT = 'https://lewisu.libwizard.com/f/report-issue';

function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * q))]; };

/* decode a PNG screenshot into [r,g,b] rows in a scratch page (no image library needed) */
async function pixels(ctx, buf) {
  const scratch = await ctx.newPage();
  const data = await scratch.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: Array.from(g.getImageData(0, 0, img.width, img.height).data) };
  }, buf.toString('base64'));
  await scratch.close();
  const px = (x, y) => { const i = (y * data.w + x) * 4; return [data.d[i], data.d[i + 1], data.d[i + 2]]; };
  return { ...data, px };
}

(async () => {
  const server = await start({ dir: SITE }), browser = await chromium.launch();
  try {
    /* ── footer: Report an Issue sits right after Send feedback, on every page that has the footer ── */
    {
      const ctx = await createContext(browser, { viewport: { width: 1280, height: 900 } }), p = await ctx.newPage();
      for (const f of ['', 'what-if-ai.html', 'register.html', '404.html']) {
        await p.goto(server.url(f));
        const links = await p.$$eval('.site-foot__links a', as => as.map(a => ({
          text: [...a.childNodes].filter(n => !(n.classList && n.classList.contains('sr-only'))).map(n => n.textContent).join('').trim(),
          href: a.getAttribute('href'), target: a.target, rel: a.rel, sr: a.querySelector('.sr-only')?.textContent.trim() || '',
          icon: a.querySelector('svg use')?.getAttribute('href') })));
        const i = links.findIndex(l => l.text === 'Report an Issue');
        assert.ok(i > 0 && links[i - 1].text === 'Send feedback', (f || 'landing') + ': Report an Issue follows Send feedback ' + JSON.stringify(links.map(l => l.text)));
        assert.deepEqual({ ...links[i], rel: links[i].rel.split(' ').sort().join(' ') },
          { text: 'Report an Issue', href: REPORT, target: '_blank', rel: 'noopener noreferrer', sr: '(opens in a new tab)', icon: '#i-alert' });
        assert.ok(await p.$('#i-alert'), 'the alert icon is defined on the page');
        assert.ok((await p.textContent('#privacy')).includes('Report an Issue'), 'the privacy note names every Springshare form the footer links to');
      }
      await ctx.close();
      pass('footer: Report an Issue (new tab, labeled) follows Send feedback on the landing page, both tools, and the 404 page');
    }

    for (const file of ['what-if-ai.html', 'register.html']) {
      const ctx = await createContext(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', bypassCSP: true });
      const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(server.url(file)); await p.waitForSelector('html[data-ready]', { state: 'attached' });
      await p.addStyleTag({ content: '*{transition:none !important;animation-duration:0s !important}' });
      await p.evaluate(() => document.fonts.ready);

      /* ── the pressed logo ── */
      const filt = () => p.$eval('.hdr__logo img', i => getComputedStyle(i).filter);
      assert.equal(await p.$eval('#f-press', n => n.tagName.toLowerCase()), 'filter');
      assert.equal(await p.$eval('#f-glow', n => n.tagName.toLowerCase()), 'filter');
      await p.mouse.move(5, 600);
      assert.match(await filt(), /url\("#f-press"\)/, file + ': the logo rests pressed into the plate');
      assert.equal(await p.$eval('.hdr__logo img', i => getComputedStyle(i).transform), 'none', 'a pressing does not lift');
      // contrast: the logo's face against the plate around it, read from rendered pixels
      const box = await p.locator('.hdr__logo img').boundingBox();
      const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
      const withLogo = await pixels(ctx, await p.screenshot({ clip }));
      await p.$eval('.hdr__logo img', i => { i.style.visibility = 'hidden'; });
      const plate = await pixels(ctx, await p.screenshot({ clip }));
      await p.$eval('.hdr__logo img', i => { i.style.visibility = ''; });
      const face = [], ground = [];
      for (let y = 0; y < plate.h; y += 2) for (let x = 0; x < plate.w; x += 2) {
        const a = withLogo.px(x, y), b = plate.px(x, y); ground.push(lum(b));
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 240) face.push(lum(a));
      }
      const logoRatio = ratio(pct(face, 0.5), pct(ground, 0.9));
      assert.ok(face.length > 500 && logoRatio >= 7, file + ': logo face vs. plate ' + logoRatio.toFixed(2) + ':1');
      await p.hover('.hdr__link');
      assert.match(await filt(), /url\("#f-press"\) url\("#f-glow"\)/, file + ': the outline lights on hover');
      await p.mouse.move(5, 600);
      await p.focus('.skip'); for (let k = 0; k < 40 && !(await p.evaluate(() => document.activeElement.classList.contains('hdr__link'))); k++) await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(() => document.activeElement.matches('.hdr__link:focus-visible')), 'the logo link is reachable by keyboard');
      assert.match(await filt(), /url\("#f-press"\) url\("#f-glow"\)/, file + ': the outline lights on keyboard focus');
      await p.evaluate(() => document.activeElement.blur());
      await p.emulateMedia({ contrast: 'more' }); assert.equal(await filt(), 'none', 'more contrast: plain logo');
      await p.emulateMedia({ contrast: 'no-preference', forcedColors: 'active' }); assert.equal(await filt(), 'none', 'forced colors: plain logo');
      await p.emulateMedia({ forcedColors: 'none', media: 'print' }); assert.equal(await filt(), 'brightness(0)', 'print: a black logo, visible on paper');
      await p.emulateMedia({ media: 'screen' });
      pass(file + ': logo pressed at rest, lit on hover and focus, ' + logoRatio.toFixed(1) + ':1 against the plate, with plain, forced-color, and print fallbacks');

      /* ── incandescent light ── */
      const lit = await p.evaluate(() => {
        const probe = (cls, pseudo) => { const e = document.createElement('span'); e.className = cls; document.body.appendChild(e); const cs = getComputedStyle(e, pseudo); const r = { bg: cs.backgroundImage, sh: cs.boxShadow }; e.remove(); return r; };
        return { on: probe('lamp lamp--on'), pilot: probe('lamp lamp--green'), cc: getComputedStyle(document.querySelector('.site-foot .cc-license-symbols')).filter };
      });
      for (const [name, l] of [['lit lamp', lit.on], ['pilot lamp', lit.pilot]]) {
        assert.ok(l.bg.includes('rgb(255, 199, 44)') && l.bg.includes('rgb(242, 169, 0)'), name + ' glass runs through the house golds: ' + l.bg);
        assert.ok(/rgba\(242, 169, 0/.test(l.sh), name + ' has an amber bloom: ' + l.sh);
        assert.ok(!/143, 224, 154|255, 201, 92/.test(l.bg + l.sh), name + ' no longer uses the pale yellow or green');
      }
      assert.ok(lit.on.bg.includes('rgb(255, 253, 247)'), 'a lit lamp has a white-hot filament');
      const pulse = await p.$eval('.current', e => getComputedStyle(e, '::before').backgroundImage);
      assert.ok(pulse.includes('rgb(255, 250, 240)') && pulse.includes('rgba(242, 169, 0'), 'the seam pulse has a white-hot head and an amber tail');
      assert.ok(/^drop-shadow\(rgba\(22, 2, 7/.test(lit.cc) && lit.cc.includes('rgba(255, 199, 44') && lit.cc.includes('rgba(242, 169, 0'), 'CC symbols: dark socket rim, then gold and amber glow: ' + lit.cc);
      // the CC glow keeps each mark's counters dark: compare stroke and counter brightness inside each ring
      const cc = p.locator('.site-foot .cc-license-symbols'); await cc.scrollIntoViewIfNeeded();
      const ccBox = await cc.boundingBox(), ccPx = await pixels(ctx, await p.screenshot({ clip: ccBox }));
      const ccRatios = [0, 1, 2, 3].map(i => {
        const cx = (i + 0.5) * ccPx.w / 4, cy = ccPx.h / 2, r = ccPx.h * 0.3, v = [];
        for (let y = 0; y < ccPx.h; y++) for (let x = 0; x < ccPx.w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) v.push(lum(ccPx.px(x, y)));
        return ratio(pct(v, 0.92), pct(v, 0.2));
      });
      assert.ok(ccRatios.every(r => r >= 4.8), 'CC counters stay distinct from their strokes: ' + ccRatios.map(r => r.toFixed(2)).join(', '));
      pass(file + ': lamps, pulse, and CC symbols are incandescent; CC stroke/counter contrast ' + ccRatios.map(r => r.toFixed(1)).join(', '));

      /* ── the floating help menu ── */
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.focus('#fabToggle'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.getElementById('fabWrap').classList.contains('open'));
      const items = p.locator('.fab-item'), n = await items.count();
      assert.ok(n >= 4, 'menu items');
      const toggleGlow = await p.$eval('#fabToggle', t => getComputedStyle(t).boxShadow);
      assert.ok(toggleGlow.includes('rgba(242, 169, 0'), 'the toggle lights while its menu is open');
      const states = [['rest', async () => { await p.mouse.move(5, 300); await p.evaluate(() => document.activeElement.blur()); }],
        ['hover', async () => { await p.evaluate(() => document.activeElement.blur()); await items.nth(1).hover(); }],
        // Escape closes the menu and returns focus to the toggle; Enter reopens it on the first item; Tab moves on
        ['keyboard focus', async () => { await p.mouse.move(5, 300); await p.focus('#fabToggle'); await p.keyboard.press('Escape');
          await p.keyboard.press('Enter'); await p.waitForFunction(() => document.getElementById('fabWrap').classList.contains('open')); await p.keyboard.press('Tab'); }]];
      for (const [state, enter] of states) {
        await enter();
        const target = state === 'rest' ? items.nth(1) : p.locator(state === 'hover' ? '.fab-item:hover' : '.fab-item:focus-visible');
        assert.equal(await target.count(), 1, state + ': one item in that state');
        const b = await target.boundingBox(), inner = { x: b.x + 6, y: b.y + 6, width: b.width - 12, height: b.height - 12 };
        // opacity: the same pixels whatever page content lies under the menu
        const hideText = await p.addStyleTag({ content: '.fab-item,.fab-item *{color:transparent !important}' });
        const one = await p.screenshot({ clip: inner });
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2)); await p.waitForTimeout(50);
        const two = await p.screenshot({ clip: inner });
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(50);
        const A = await pixels(ctx, one), B = await pixels(ctx, two); let worst = 0;
        for (let i = 0; i < A.d.length; i += 4) worst = Math.max(worst, Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
        assert.ok(worst <= 3, file + ' ' + state + ': nothing behind a menu item shows through it (max channel change ' + worst + ')');
        await hideText.evaluate(s => s.remove());
        // contrast of the item's text against its own surface
        const color = (await target.evaluate(e => getComputedStyle(e).color)).match(/[\d.]+/g).map(Number);
        const bg = []; for (let y = 0; y < A.h; y += 2) for (let x = 0; x < A.w; x += 2) bg.push(lum(A.px(x, y)));
        const cr = ratio(lum(color), pct(bg, 0.9));
        assert.ok(cr >= 7, file + ' ' + state + ': menu text contrast ' + cr.toFixed(2) + ':1');
        console.log('      ' + file + ' menu item, ' + state + ': opaque; text ' + cr.toFixed(1) + ':1');
      }
      const scrim = await p.$eval('#fabScrim', s => getComputedStyle(s).backgroundColor);
      assert.ok(Number(scrim.match(/[\d.]+/g)[3]) >= 0.65, 'the scrim dims the page firmly: ' + scrim);
      await p.evaluate(() => document.activeElement.blur()); await p.mouse.move(5, 300);
      await p.emulateMedia({ contrast: 'more' });
      // (the desktop page zoom reports a 2px border as 1.6px)
      const hc = await items.nth(1).evaluate(e => { const c = getComputedStyle(e); return [c.backgroundColor, c.backgroundImage, parseFloat(c.borderTopWidth) >= 1.5, c.borderTopColor]; });
      assert.deepEqual(hc, ['rgb(34, 4, 11)', 'none', true, 'rgb(222, 187, 112)'], 'more contrast: solid items with a full-strength gold border');
      await p.emulateMedia({ contrast: 'no-preference' });
      assert.deepEqual(errors, []);
      await ctx.close();
      pass(file + ': help-menu items are opaque at rest, on hover, and on keyboard focus, with text at 7:1 or better; solid under more contrast');
    }
    console.log('\n' + count + ' checks passed.');
  } finally { await browser.close(); await server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
