/* Checks for the November 2 changes on both tools:
 *  - the floating help menu's items are fully opaque in every state, so nothing behind them shows through,
 *    and their text keeps a high contrast ratio over busy page content;
 *  - lit lamps, the seam pulse, hover glows, and the CC symbols use the incandescent palette, and the CC
 *    symbols' glow no longer washes out the counters inside each mark;
 *  - the Library logo keeps its original geometry and matches the title's muted blush at rest;
 *    pointer hover alone adds a halo and one translucent reflection. Keyboard focus uses a visible outline. It stays high contrast against the
 *    plate, becomes flat white under "more contrast", uses the system link color in forced colors, and prints in black;
 *  - the footer links to Report an Issue beside Send feedback;
 *  - the header keeps two buttons with the walkthrough as its brass primary, the walkthrough also opens from the floating
 *    menu, the seam pulse rests behind open dialogs, and placeholder text keeps AA contrast.
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

/* Use real motion settings for the one-pass reflection; the contrast checks below
   deliberately freeze animation and cannot verify its lifecycle or opt-outs. */
async function checkLogoReflection(browser, server, file) {
  const ctx = await createContext(browser, { viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  try {
    const p = await ctx.newPage();
    await p.goto(server.url(file)); await p.waitForSelector('html[data-ready]', { state: 'attached' });
    const state = () => p.$eval('.hdr__logo', l => { const a = getComputedStyle(l, '::after'), s = getComputedStyle(l);
      return { animation: a.animationName, opacity: a.opacity, display: a.display, filter: s.filter, transition: s.transitionDuration }; });
    const rest = await state();
    assert.equal(rest.animation, 'none', file + ': no idle reflection');
    assert.equal(rest.filter, 'none', file + ': no resting glow or blur');
    assert.equal(rest.opacity, '0', file + ': no resting highlight');
    const bounds = await p.locator('.hdr__logo').boundingBox();
    const onePass = async label => {
      const timing = await p.$eval('.hdr__logo', l => {
        const a = l.getAnimations({ subtree: true }).find(a => a.animationName === 'logo-pearl-sweep');
        if (!a) return null;
        const t = a.effect.getTiming(); a.pause(); a.currentTime = Number(t.duration) / 2;
        return { duration: t.duration, iterations: t.iterations };
      });
      assert.ok(timing && timing.iterations === 1 && timing.duration >= 450 && timing.duration <= 700, file + ': ' + label + ' starts one brief sweep');
      assert.ok(Number((await state()).opacity) > 0, file + ': the highlight is visible during the pass');
      assert.deepEqual(await p.locator('.hdr__logo').boundingBox(), bounds, file + ': the reflection does not move the artwork');
      await p.$eval('.hdr__logo', l => l.getAnimations({ subtree: true }).find(a => a.animationName === 'logo-pearl-sweep').finish());
      assert.equal((await state()).opacity, '0', file + ': the reflection disappears after one pass');
      assert.notEqual((await state()).filter, rest.filter, file + ': the gentle interactive light remains');
    };
    await p.hover('.hdr__link'); await onePass('hover');
    await p.mouse.move(5, 600);
    await p.waitForFunction(() => getComputedStyle(document.querySelector('.hdr__logo')).filter === 'none');
    assert.equal((await state()).opacity, '0', file + ': leaving the logo clears the highlight as well as the halo');
    await p.hover('.hdr__link'); await onePass('re-entry');
    await p.mouse.move(5, 600);
    await p.focus('.skip');
    for (let k = 0; k < 40 && !(await p.evaluate(() => document.activeElement.classList.contains('hdr__link'))); k++) await p.keyboard.press('Tab');
    assert.ok(await p.evaluate(() => document.activeElement.matches('.hdr__link:focus-visible')), file + ': reflection is keyboard reachable');
    const focused = await state();
    assert.equal(focused.animation, 'none', file + ': keyboard focus does not trigger a reflection');
    assert.equal(focused.filter, 'none', file + ': keyboard focus does not light the logo');
    assert.ok(await p.$eval('.hdr__link', l => { const s = getComputedStyle(l); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }),
      file + ': keyboard focus retains a visible outline');
    await p.hover('.hdr__link');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await state();
    assert.equal(reduced.animation, 'none', file + ': reduced motion removes the sweep');
    assert.equal(reduced.display, 'none');
    assert.ok(parseFloat(reduced.transition) <= .001 && reduced.filter !== rest.filter, file + ': reduced motion retains instant, stationary light feedback');
    for (const media of [{ reducedMotion: 'no-preference', contrast: 'more' }, { contrast: 'no-preference', forcedColors: 'active' }, { forcedColors: 'none', media: 'print' }]) {
      await p.emulateMedia(media);
      const s = await state();
      assert.equal(s.animation, 'none', file + ': reflection is disabled for ' + JSON.stringify(media));
      assert.equal(s.display, 'none');
    }
    pass(file + ': reflection plays once on pointer hover and re-entry; keyboard focus uses only its outline; reduced motion, contrast, forced colors, and print are respected');
  } finally { await ctx.close(); }
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
        // links inside running text need more than color to stand out
        for (const sel of ['.site-foot__links a', '.site-foot .hcai a', '#aboutDialog .tour__text a'])
          for (const d of await p.$$eval(sel, as => as.map(a => getComputedStyle(a).textDecorationLine))) assert.equal(d, 'underline', (f || 'landing') + ': ' + sel + ' is underlined');
      }
      for (const [w, h] of [[1280, 900], [390, 844]]) {
        await p.setViewportSize({ width: w, height: h }); await p.goto(server.url('register.html')); await p.waitForSelector('html[data-ready]', { state: 'attached' });
        await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(150);
        const clear = await p.evaluate(() => { const f = document.getElementById('fabToggle').getBoundingClientRect(), d = document.querySelector('.hcai').getBoundingClientRect(); return f.top - d.bottom; });
        assert.ok(clear >= 8, 'at the end of the page the help button sits below the disclosure, not over it (' + w + 'px: ' + clear + ')');
      }
      await ctx.close();
      pass('footer: Report an Issue (new tab, labeled) follows Send feedback on every page; the help button never covers the disclosure');
    }

    for (const file of ['what-if-ai.html', 'register.html']) {
      await checkLogoReflection(browser, server, file);
      const ctx = await createContext(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', bypassCSP: true });
      const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(server.url(file)); await p.waitForSelector('html[data-ready]', { state: 'attached' });
      await p.addStyleTag({ content: '*{transition:none !important;animation-duration:0s !important}' });
      await p.evaluate(() => document.fonts.ready);

      /* ── the logo: title-colored artwork, hover-only light, and clear keyboard focus ── */
      const filt = () => p.$eval('.hdr__logo', i => getComputedStyle(i).filter);
      const lift = () => p.$eval('.hdr__logo', i => getComputedStyle(i).transform);
      for (const id of ['#f-cut', '#f-cut-sm', '#f-lit', '#f-press', '#f-glow']) assert.equal(await p.$(id), null, id + ' is gone');
      await p.mouse.move(5, 600);
      const restFilter = await filt();
      assert.equal(restFilter, 'none', file + ': the pearl logo rests without a glow or blur');
      assert.equal(await lift(), 'none', file + ': the resting logo stays in place');
      assert.equal(await p.$eval('.hdr__logo', l => getComputedStyle(l, '::before').backgroundColor),
        await p.$eval('.hdr__title', t => getComputedStyle(t).color), file + ': the resting logo matches the title color');
      // Contrast uses the rendered title-colored artwork against the actual plate.
      const box = await p.locator('.hdr__logo img').boundingBox();
      const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
      const withLogo = await pixels(ctx, await p.screenshot({ clip }));
      await p.$eval('.hdr__logo', i => { i.style.visibility = 'hidden'; });
      const plate = await pixels(ctx, await p.screenshot({ clip }));
      await p.$eval('.hdr__logo', i => { i.style.visibility = ''; });
      const face = [], ground = [];
      for (let y = 0; y < plate.h; y += 2) for (let x = 0; x < plate.w; x += 2) {
        const a = withLogo.px(x, y), b = plate.px(x, y); ground.push(lum(b));
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 240) face.push(lum(a));
      }
      const logoRatio = ratio(pct(face, 0.5), pct(ground, 0.9));
      assert.ok(face.length > 500 && logoRatio >= 7, file + ': logo vs. plate ' + logoRatio.toFixed(2) + ':1');
      await p.hover('.hdr__link'); await p.waitForTimeout(400);
      const hoverFilter = await filt();
      assert.ok(hoverFilter !== restFilter && (await lift()) === 'none', file + ': the logo light responds to hover without movement');
      assert.deepEqual(await p.locator('.hdr__logo img').boundingBox(), box, file + ': hover keeps the artwork in place');
      await p.mouse.move(5, 600);
      await p.focus('.skip'); for (let k = 0; k < 40 && !(await p.evaluate(() => document.activeElement.classList.contains('hdr__link'))); k++) await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(() => document.activeElement.matches('.hdr__link:focus-visible')), 'the logo link is reachable by keyboard');
      await p.waitForTimeout(400);
      assert.ok((await filt()) === restFilter && (await lift()) === 'none', file + ': keyboard focus keeps the logo at its resting brightness');
      await p.evaluate(() => document.activeElement.blur());
      await p.emulateMedia({ contrast: 'more' }); assert.equal(await filt(), 'none', 'more contrast: no halo or etched edge');
      assert.deepEqual(await p.$eval('.hdr__logo', i => { const s = getComputedStyle(i, '::before'); return [s.backgroundImage, s.backgroundColor]; }),
        ['none', 'rgb(255, 255, 255)'], 'more contrast: a flat white mark');
      await p.emulateMedia({ contrast: 'no-preference', forcedColors: 'active' }); assert.equal(await filt(), 'none', 'forced colors: plain logo');
      assert.deepEqual(await p.$eval('.hdr__logo', l => { const i = getComputedStyle(l.querySelector('img')), b = getComputedStyle(l, '::before');
        return [i.opacity, b.maskImage.includes('logo.') || b.webkitMaskImage.includes('logo.'), b.forcedColorAdjust]; }), ['0', true, 'none'],
        'forced colors: the logo is redrawn in the link color, so it never vanishes on a light Canvas');
      await p.emulateMedia({ forcedColors: 'none', media: 'print' });
      assert.deepEqual(await p.$eval('.hdr__logo', l => { const i = getComputedStyle(l.querySelector('img')), b = getComputedStyle(l, '::before');
        return [i.opacity, i.filter, b.display, getComputedStyle(l).filter]; }), ['1', 'brightness(0)', 'none', 'none'],
        'print: the original image is visible in black, with no pearl overlay or glow');
      await p.emulateMedia({ media: 'screen' });
      pass(file + ': the logo matches the title at rest and lights only on hover, ' + logoRatio.toFixed(1) + ':1 against the plate, with flat, forced-color, and print fallbacks');

      /* ── header hierarchy: two buttons, the walkthrough as the one brass primary ── */
      const ctas = await p.$$eval('.hdr .hdr-cta', as => as.map(a => ({ primary: a.classList.contains('hdr-cta--primary'), text: a.textContent.replace(/\s+/g, ' ').trim(), bg: getComputedStyle(a).backgroundImage })));
      assert.equal(ctas.length, 2, file + ': the header keeps two buttons (the rest live in the menu and footer): ' + JSON.stringify(ctas.map(c => c.text)));
      assert.ok(ctas[0].primary && /^How to use/.test(ctas[0].text) && ctas[0].bg.includes('rgb(243, 220, 158)'), file + ': the walkthrough is the brass primary: ' + JSON.stringify(ctas[0]));
      assert.ok(!ctas[1].primary && ctas[1].text === 'How this site works');
      const primary = p.locator('.hdr .hdr-cta--primary'), pc = (await primary.evaluate(e => getComputedStyle(e).color)).match(/[\d.]+/g).map(Number);
      const hideInk = await p.addStyleTag({ content: '.hdr-cta--primary,.hdr-cta--primary *{color:transparent !important}' });
      const pb = await primary.boundingBox(), ppx = await pixels(ctx, await p.screenshot({ clip: { x: pb.x + 4, y: pb.y + 4, width: pb.width - 8, height: pb.height - 8 } }));
      await hideInk.evaluate(e => e.remove());
      const pbg = []; for (let y = 0; y < ppx.h; y += 2) for (let x = 0; x < ppx.w; x += 2) pbg.push(lum(ppx.px(x, y)));
      assert.ok(ratio(lum(pc), pct(pbg, 0.1)) >= 4.5, file + ': dark ink on the brass primary reads at AA: ' + ratio(lum(pc), pct(pbg, 0.1)).toFixed(2));
      // the walkthrough also opens from the floating menu, and closing it returns focus to the menu button
      const tourSel = file === 'register.html' ? '[data-open-register-tour]' : '[data-open-tour]', dlgSel = file === 'register.html' ? '#rtour' : '#tourDialog';
      await p.click('#fabToggle'); await p.click('#fabMenu ' + tourSel); await p.waitForSelector(dlgSel + '[open]');
      assert.ok(!(await p.$eval('#fabWrap', w => w.classList.contains('open'))), 'the menu closes when the walkthrough opens');
      // the seam pulse rests behind an open dialog
      const resting = await p.$eval('.current', c => [getComputedStyle(c, '::before').animationPlayState, getComputedStyle(c, '::before').opacity]);
      assert.deepEqual(resting, ['paused', '0'], file + ': the pulse rests while a dialog is open');
      await p.keyboard.press('Escape'); await p.waitForFunction(s => !document.querySelector(s).open, dlgSel);
      assert.equal(await p.evaluate(() => document.activeElement.id), 'fabToggle', file + ': closing the walkthrough returns focus to the menu button');
      assert.equal(await p.$eval('.current', c => getComputedStyle(c, '::before').animationPlayState), 'running');
      // placeholder text on the dark inputs stays readable
      for (const inp of await p.$$('input[placeholder]')) {
        if (!(await inp.isVisible())) continue;
        const color = (await inp.evaluate(i => getComputedStyle(i, '::placeholder').color)).match(/[\d.]+/g).map(Number);
        const hide = await p.addStyleTag({ content: 'input::placeholder{color:transparent !important}' });
        const ib = await inp.boundingBox(), ipx = await pixels(ctx, await p.screenshot({ clip: { x: ib.x + 4, y: ib.y + 4, width: ib.width - 8, height: ib.height - 8 } }));
        await hide.evaluate(e => e.remove());
        const ibg = []; for (let y = 0; y < ipx.h; y += 2) for (let x = 0; x < ipx.w; x += 2) ibg.push(lum(ipx.px(x, y)));
        const cr = ratio(lum(color), pct(ibg, 0.9)), ph = await inp.getAttribute('placeholder');
        assert.ok(cr >= 4.5, file + ': placeholder “' + ph + '” ' + cr.toFixed(2) + ':1');
        console.log('      ' + file + ' placeholder “' + ph.slice(0, 30) + '”: ' + cr.toFixed(1) + ':1');
      }
      pass(file + ': two header buttons with the walkthrough as brass primary; the walkthrough opens from the menu; the pulse rests behind dialogs; placeholders at AA');

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
      // Edison bulbs: the What If AI bulb icon has a filament that lights on hover; small Edison bulbs mark the considerations
      // console (The Register) and the question rail's current step (What If AI). The help button is a glowing rivet.
      assert.ok(await p.$('#i-bulb .fil'), 'the bulb icon has a filament');
      const rest = await p.$eval('#fabToggle', t => [getComputedStyle(t).backgroundImage, getComputedStyle(t).boxShadow]);
      assert.ok(rest[0].includes('rgb(255, 199, 44)') && rest[1].includes('rgba(255, 199, 44'), 'the help rivet is yellow brass and glows softly at rest');
      const edison = await p.evaluate(() => { const ul = document.createElement('ul'); ul.className = 'protocols__list'; ul.innerHTML = '<li><span class="lamp lamp--on"></span></li>';
        document.body.appendChild(ul); const bg = getComputedStyle(ul.querySelector('.lamp')).backgroundImage; ul.remove(); return bg; });
      assert.ok(edison.startsWith('url("data:image/svg+xml') && edison.includes('radialGradient'), 'console bullets are Edison bulbs');
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
      // the help button is a glowing yellow rivet: brighter while the menu is open, when its ✦ turns into an ×
      const open = await p.$eval('#fabToggle', t => ({ glow: getComputedStyle(t).boxShadow, icon: getComputedStyle(t.querySelector('.fab-toggle__icon')).transform, text: t.textContent.trim() }));
      assert.equal(open.text, '✦');
      assert.ok(open.glow.includes('rgba(242, 169, 0') && open.icon !== 'none', 'open: the rivet glows and the ✦ turns ' + JSON.stringify(open));
      // the menu's housing is opaque, so page content never shows between the items
      assert.match(await p.$eval('#fabMenu', m => getComputedStyle(m).backgroundColor), /^rgb\(/, 'an opaque menu housing');
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
