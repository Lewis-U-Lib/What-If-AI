/* Three things a reader with low vision relies on, each of which once failed in every palette:
 *
 *  - The help menu closes when keyboard focus leaves it, whether it was opened from the keyboard or with the
 *    mouse, so focus is never on the page beneath the open menu and its backdrop (SC 2.4.7, 2.4.11).
 *  - The lines under "Your answers" wrap. With the text spacing a reader may impose, none is cut off (SC 1.4.12).
 *  - In the plain reading view, a walkthrough dot for a step other than the current one has an outline that
 *    stands 3:1 off the dialog (SC 1.4.11).
 *
 *   node tests/reader.test.js [siteDir]
 * Honors SITE_THEME, as every browser test does. Exits non-zero on any failure. */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const assert = require('assert');
const path = require('path');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const { start } = require('./serve');
const pass = m => console.log('PASS ' + m);
const ready = page => page.waitForFunction(() => document.documentElement.hasAttribute('data-ready'), null, { timeout: 15000 });
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

(async () => {
  const server = await start({ dir: SITE });
  const browser = await chromium.launch();
  try {
    const ctx = await createContext(browser, { viewport: { width: 1280, height: 900 }, bypassCSP: true });
    const page = await ctx.newPage();
    const open = () => page.evaluate(() => document.getElementById('fabWrap').classList.contains('open'));
    const inMenu = () => page.evaluate(() => document.getElementById('fabWrap').contains(document.activeElement));

    /* ── the help menu, opened from the keyboard ── */
    for (const file of ['what-if-ai.html', 'register.html']) {
      await page.goto(server.url(file)); await ready(page);
      await page.focus('#fabToggle'); await page.keyboard.press('Enter');
      assert.ok(await open() && await inMenu(), file + ': Enter opens the menu and moves focus into it');
      let presses = 0;
      while (await inMenu() && presses < 20) { assert.ok(await open(), file + ': the menu stays open while focus is inside it'); await page.keyboard.press('Tab'); presses++; }
      assert.ok(presses > 3 && presses < 20, file + ': Tab walks through the menu and out of it');
      /* the menu button is the last thing on the page, so the first Tab past it leaves the page for the browser's own
         controls; the menu closes as soon as focus lands on anything in the page again */
      if (await page.evaluate(() => document.activeElement === document.body)) await page.keyboard.press('Tab');
      assert.equal(await open(), false, file + ': the menu closed when focus left it');
      assert.equal(await page.getAttribute('#fabToggle', 'aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.getElementById('fabScrim').classList.contains('show')), false, file + ': and so did its backdrop');
      assert.ok(await page.evaluate(() => document.activeElement && document.activeElement !== document.body), file + ': focus stayed where Tab put it');

      /* backwards out of the menu too */
      await page.focus('#fabToggle'); await page.keyboard.press('Enter');
      for (let k = 0; k < 12 && await inMenu(); k++) await page.keyboard.press('Shift+Tab');
      assert.equal(await open(), false, file + ': Shift+Tab out of the menu closes it');

      /* opened with the mouse, then Tab */
      await page.click('#fabToggle');
      assert.ok(await open());
      for (let k = 0; k < 3 && await open(); k++) await page.keyboard.press('Tab');
      assert.equal(await open(), false, file + ': opened with the mouse, it closes once Tab reaches the page');

      /* and what it already did still works: a palette control leaves the menu open (one switch, or one tile for each palette) */
      await page.click('#fabToggle');
      const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const tiles = await page.locator('#fabMenu [data-theme-choice]').count();
      await page.click(tiles ? '#fabMenu [data-theme-choice][aria-pressed="false"]' : '#fabMenu [data-theme-toggle]');
      assert.ok(await open(), file + ': choosing a palette leaves the menu open');
      assert.notEqual(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), before);
      if (tiles) await page.click(`#fabMenu [data-theme-choice="${before || 'crimson'}"]`); else await page.click('#fabMenu [data-theme-toggle]');
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), before, file + ': and the palette is back as it was');
      await page.keyboard.press('Escape');
      assert.equal(await open(), false, file + ': Escape closes it');
    }
    pass('the help menu closes when focus leaves it (Tab, Shift+Tab, mouse then Tab), and stays open while focus is inside');

    /* ── "Your answers" wraps ── */
    const SPACING = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}p{margin-bottom:2em !important}';
    for (const plain of [false, true]) {
      await page.goto(server.url('what-if-ai.html')); await ready(page);
      await page.evaluate(p => { try { if (p) localStorage.setItem('lul-whatifai-plain-v1', '1'); else localStorage.removeItem('lul-whatifai-plain-v1'); } catch (_) {} }, plain);
      await page.goto(server.url('what-if-ai.html#a=focus:teaching;task:feedback')); await ready(page);
      await page.addStyleTag({ content: SPACING });
      const cut = await page.evaluate(() => [...document.querySelectorAll('.rail .railitem__ans')].filter(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 || getComputedStyle(el).textOverflow === 'ellipsis').map(el => el.textContent.trim()));
      assert.deepEqual(cut, [], 'no line under "Your answers" is cut off' + (plain ? ' in the plain reading view' : ''));
      assert.ok(await page.evaluate(() => document.querySelectorAll('.rail .railitem__ans').length >= 3));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'and the page does not scroll sideways');
    }
    await page.evaluate(() => { try { localStorage.removeItem('lul-whatifai-plain-v1'); } catch (_) {} });
    pass('the lines under "Your answers" wrap and are whole under a reader\'s text spacing, textured and plain');

    /* ── the plain view's walkthrough dots ── */
    const plainCtx = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    await plainCtx.addInitScript(() => { try { localStorage.setItem('lul-whatifai-plain-v1', '1'); } catch (_) {} });
    const pp = await plainCtx.newPage();
    for (const [file, sel] of [['what-if-ai.html#tour', '#tourDialog'], ['register.html#about', 'dialog[open]']]) {
      await pp.goto('about:blank'); await pp.goto(server.url(file)); await ready(pp);
      await pp.waitForSelector(sel + ' .tour__dot', { state: 'visible' });
      const dots = await pp.evaluate(sel => {
        const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
        const dlg = document.querySelector(sel);
        let ground = dlg; while (ground && /rgba?\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(ground).backgroundColor)) ground = ground.parentElement;
        return [...dlg.querySelectorAll('.tour__dot')].map(d => { const lamp = d.querySelector('.lamp'), cs = getComputedStyle(lamp);
          return { current: d.getAttribute('aria-current') === 'step', shadow: cs.boxShadow, ring: rgb(cs.boxShadow), fill: rgb(cs.backgroundColor), ground: rgb(getComputedStyle(ground || document.body).backgroundColor) }; });
      }, sel);
      assert.ok(dots.length > 2 && dots.filter(d => d.current).length === 1, file + ': one current dot among several');
      for (const d of dots.filter(d => !d.current)) {
        assert.match(d.shadow, /0px 0px 0px 2px/, file + ': a step that is not current has a 2px outline (' + d.shadow + ')');
        assert.ok(ratio(d.ring, d.ground) >= 3, `${file}: and it stands 3:1 off the dialog (${ratio(d.ring, d.ground).toFixed(2)}:1)`);
      }
    }
    pass('plain reading view: every walkthrough dot that is not the current step has an outline at 3:1 or more');
  } finally { await browser.close(); await server.close(); }
  console.log('\nreader checks passed');
})().catch(e => { console.error(e); process.exit(1); });
