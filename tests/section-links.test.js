/* Section links in The Register: choosing a section, from the menu or from the walkthrough, puts the section menu
 * just below the sticky top bar and moves keyboard focus to the section's heading, in the textured and the plain view.
 * Run after `python3 tools/build.py`:  node tests/section-links.test.js [site-dir] */
const assert = require('assert/strict');
const path = require('path');
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const pass = message => console.log('PASS  ' + message);
const SECTIONS = ['ai-types', 'policies', 'sources', 'activities'];
const state = page => page.evaluate(() => ({
  gap: Math.round(document.getElementById('secnav').getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom),
  focus: document.activeElement.id, hash: location.hash }));

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  try {
    for (const plain of [false, true]) for (const width of [1440, 390]) {
      const context = await createContext(browser, { viewport: { width, height: 900 } });
      if (plain) await context.addInitScript(() => { try { localStorage.setItem('lul-whatifai-plain-v1', '1'); } catch (_) { /* ignore */ } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.url('register.html#activities')); await page.waitForSelector('html[data-ready]', { state: 'attached' });
      for (const section of SECTIONS) {
        await page.locator(`#secnav [data-sec="${section}"]`).click();
        await page.waitForFunction(id => document.activeElement.id === id, 'h-' + section);
        /* the menu settles a fixed distance below the bar once fonts and the browser's own jump are done */
        await page.waitForFunction(() => { const gap = document.getElementById('secnav').getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom; return gap >= 8 && gap <= 16; })
          .catch(async error => { throw new Error(`${plain ? 'plain' : 'textured'} @${width} ${section}: ` + JSON.stringify(await state(page)), { cause: error }); });
        assert.equal((await state(page)).focus, 'h-' + section, 'focus stays on the heading after the page settles');
      }
      /* a section link inside the walkthrough: the dialog closes and focus goes to that section, not back to the button that opened the walkthrough */
      await page.click('.hdr [data-open-register-tour]'); await page.waitForSelector('#rtour[open]');
      const link = page.locator('#rtour a[href="#ai-types"]').first();
      for (let i = 0; i < 9 && !(await link.isVisible()); i++) await page.click('#rtourNext');
      await link.click();
      await page.waitForFunction(() => !document.getElementById('rtour').open && document.activeElement.id === 'h-ai-types');
      await page.waitForTimeout(400);
      assert.deepEqual(await page.evaluate(() => [document.activeElement.id, location.hash]), ['h-ai-types', '#ai-types'], 'focus is not handed back to the walkthrough button');
      assert.deepEqual(errors, []);
      await context.close();
      pass(`${plain ? 'plain reading view' : 'textured view'} @${width}: each section link clears the top bar and focuses its heading, from the menu and from the walkthrough`);
    }
  } finally { await browser.close(); await server.close(); }
  console.log('\nSection-link checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
