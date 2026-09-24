/* axe-core audit (WCAG 2.0/2.1/2.2 A and AA) of What If AI and The Register across the states a
 * reader actually reaches, at desktop and phone widths. Run after a build:
 *   npm run test:a11y   (or node tests/a11y.test.js [distDir])
 * Exits non-zero on any violation. Automated checks cover part of WCAG only; see docs for manual checks. */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const { start } = require('./serve');
let SRV = null;
const URL = f => SRV.url(f);
/* pages with data are ready once boot.js has loaded it; the landing and 404 pages have none */
async function ready(page) { await page.waitForFunction(() => document.documentElement.hasAttribute('data-ready') || !document.getElementById('site-manifest'), null, { timeout: 15000 }); }

const STATES = [
  ['What If AI · first question', 'what-if-ai.html', async p => {}],
  ['What If AI · field, with level and setting open', 'what-if-ai.html', async p => {
    await p.check('input[value="teaching"]'); await p.click('#next'); await p.click('#next');
    await p.$$eval('details.qmore', ds => ds.forEach(d => d.open = true)); }],
  ['What If AI · limits', 'what-if-ai.html', async p => {
    await p.check('input[value="teaching"]'); for (let i = 0; i < 4; i++) await p.click('#next'); }],
  ['What If AI · results', 'what-if-ai.html#a=focus:teaching;task:design;lim:nopaid', async p => {}],
  ['What If AI · activity details open', 'what-if-ai.html#a=focus:teaching;task:design', async p => { await p.click('#plan [data-open]'); }],
  ['What If AI · saved drawer with items', 'what-if-ai.html#a=focus:teaching;task:design', async p => {
    const s = await p.$$('#plan button[data-save]'); await s[0].click(); await s[1].click(); await p.click('.topbar [data-open-saved]'); }],
  ['What If AI · walkthrough, first step', 'what-if-ai.html', async p => { await p.click('.hdr [data-open-tour]'); }],
  ['What If AI · walkthrough, last step', 'what-if-ai.html#tour', async p => { await p.keyboard.press('End'); }],
  ['What If AI · question two (back navigation available)', 'what-if-ai.html#q=task&a=focus:teaching', async p => {}],
    ['What If AI · saved drawer empty', 'what-if-ai.html', async p => { await p.evaluate(() => SITE.Saved.clear()); await p.click('.topbar [data-open-saved]'); }],
  ['The Register · activities', 'register.html#activities', async p => {}],
  ['The Register · activities filtered', 'register.html#activities?cap=text_chat&pol=open', async p => {}],
  ['The Register · activity details open', 'register.html#activities', async p => { await p.click('#activities [data-open]'); }],
  ['The Register · types of AI systems', 'register.html#ai-types', async p => {}],
  ['The Register · AI-system details expanded', 'register.html#ai-types', async p => {
    await p.$$eval('#ai-types details.type__more', ds => ds.slice(0, 3).forEach(d => d.open = true)); }],
  ['The Register · course AI policies', 'register.html#policies', async p => {}],
  ['The Register · sources, one opened', 'register.html#sources', async p => { await p.$$eval('#sources details', ds => ds.slice(0, 3).forEach(d => d.open = true)); }],
  ['The Register · how to use', 'register.html#about', async p => {}],
  ['Landing page', '', async p => {}],
  ['Page not found (404)', 'no/such/page', async p => {}],
];

(async () => {
  SRV = await start({ dir: SITE });
  const browser = await chromium.launch();
  let total = 0;
  for (const [name, file, act] of STATES) {
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport: vp }); const page = await ctx.newPage();
      await page.goto(URL(file)); await page.waitForTimeout(150); await ready(page);
      if (vp.width < 800 && file.startsWith('register.html#activities')) await page.click('#filtersToggle');
      await act(page); await page.waitForTimeout(200);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      total += r.violations.length;
      console.log((r.violations.length ? 'FAIL ' : 'PASS ') + name + ' @' + vp.width + 'px — ' + r.violations.length + ' violation(s)');
      r.violations.forEach(v => console.log('   ', v.id, v.impact, v.nodes.length + ' node(s):', v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')));
      await ctx.close();
    }
  }
  await browser.close(); await SRV.close();
  console.log(`\n${total} violation(s) across ${STATES.length * 2} states`);
  process.exit(total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
