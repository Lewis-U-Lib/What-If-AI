/* Quidsima's questions and walkthrough.
 *  · Selecting the answer that is already selected clears it, by pointer or with Space; a double-click does not.
 *  · The walkthrough gives saving, comparing, planning and printing, The Register, and feedback a step each.
 * Run after `python3 tools/build.py`:  node tests/answers.test.js [site-dir] */
const assert = require('assert/strict');
const path = require('path');
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const pass = message => console.log('PASS  ' + message);
const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
const norm = value => String(value).replace(/\s+/g, ' ').trim();

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  try {
    for (const width of [1280, 390]) {
      const context = await createContext(browser, { viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.url('what-if-ai.html')); await ready(page);
      const checked = () => page.$$eval('input[name="q-focus"]', list => list.filter(i => i.checked).map(i => i.value));
      const option = value => page.locator(`label.opt:has(input[name="q-focus"][value="${value}"])`);
      const other = (await page.$$eval('input[name="q-focus"]', list => list.map(i => i.value))).find(v => v !== 'teaching');
      const settle = () => page.waitForTimeout(450);   /* longer than the double-click guard */

      /* pointer: select, select again to clear, select another, and the first is no longer selected */
      await option('teaching').click(); await settle();
      assert.deepEqual(await checked(), ['teaching']);
      assert.ok((await page.evaluate(() => location.hash)).includes('teaching'), 'the answer is in the address');
      await option('teaching').click(); await settle();
      assert.deepEqual(await checked(), [], 'a second click clears the answer');
      assert.equal(await page.evaluate(() => location.hash), '', 'and removes it from the address');
      assert.equal(await page.evaluate(() => document.activeElement.value), 'teaching', 'focus stays on the option');
      await option(other).click(); await settle();
      await option('teaching').click(); await settle();
      assert.deepEqual(await checked(), ['teaching'], 'choosing another option still moves the selection');

      /* a double-click selects once: it does not select and then clear */
      await option('teaching').click(); await settle();
      assert.deepEqual(await checked(), []);
      await option(other).dblclick(); await settle();
      assert.deepEqual(await checked(), [other], 'a double-click leaves the answer selected');

      /* keyboard: Space on the selected option clears it; arrow keys still move the selection */
      await page.focus('input[name="q-focus"][value="' + other + '"]');
      await page.keyboard.press('Space'); await settle();
      assert.deepEqual(await checked(), [], 'Space on the selected option clears it');
      await page.keyboard.press('Space'); await settle();
      assert.deepEqual(await checked(), [other], 'Space selects it again');
      await page.keyboard.press('ArrowDown'); await settle();
      assert.equal((await checked()).length, 1, 'an arrow key moves the selection and leaves one answer selected');
      assert.notDeepEqual(await checked(), [other]);

      /* clearing the first answer also clears later answers that depended on it, as changing it does */
      await option('teaching').click(); await settle();
      await page.click('#next'); await page.waitForSelector('input[name="q-task"]');
      await page.locator('label.opt:has(input[name="q-task"])').first().click(); await settle();
      const task = await page.$eval('input[name="q-task"]:checked', i => i.value);
      await page.locator(`label.opt:has(input[name="q-task"][value="${task}"])`).click(); await settle();
      assert.equal(await page.$$eval('input[name="q-task"]:checked', l => l.length), 0, 'the second question clears the same way');
      const after = await page.evaluate(() => location.hash);
      assert.ok(after.includes('teaching') && !after.includes(task), 'only the cleared answer leaves the address: ' + after);
      assert.deepEqual(errors, []);
      pass(`@${width}: a selected answer clears on a second click or Space, not on a double-click, and other choices behave as before`);

      /* ── the walkthrough ── */
      await page.goto(server.url('what-if-ai.html')); await ready(page);
      await page.click('.hdr [data-open-tour]'); await page.waitForSelector('#tourDialog[open]');
      const titles = await page.$$eval('#tourDialog [data-slide] h3', list => list.map(h => h.textContent.trim()));
      assert.deepEqual(titles, ['What the tool does', 'Describe your work', 'Review the use-case ideas that fit', 'Look inside a use-case idea',
        'Save a shortlist', 'Compare two or three', 'Plan, print, and export', 'Go deeper in The Register', 'Feedback and corrections']);
      const slideText = n => page.$eval(`#tourDialog [data-slide]:nth-child(${n})`, s => s.textContent.replace(/\s+/g, ' '));
      assert.match(await slideText(2), /selecting an answer a second time clears it/);
      const compare = await slideText(6);
      for (const word of ['Compare selected', 'purpose, participants, preparation, access requirements, human judgment, and the route without AI', 'Not stated', 'Nothing is ranked or scored'])
        assert.ok(compare.includes(word), 'the comparison step says: ' + word);
      const feedback = await slideText(9);
      for (const word of ['Give feedback', 'no name or email is collected', 'a license or attribution looks wrong', 'Ask Us'])
        assert.ok(feedback.includes(word), 'the feedback step says: ' + word);
      assert.equal(await page.$eval('#tourDialog [data-slide]:nth-child(9) a', a => a.href), 'https://lewisu.libwizard.com/f/What-If-AI');
      /* every step has its own drawing, and every step fits the dialog's width */
      const arts = await page.$$eval('#tourDialog [data-slide] .tour__art svg', list => list.map(s => s.innerHTML.replace(/\s+/g, '')));
      assert.equal(new Set(arts).size, 9, 'nine different illustrations');
      for (let i = 1; i <= 9; i++) {
        assert.equal(await page.textContent('#tourPos'), i + ' of 9');
        const fit = await page.evaluate(() => { const d = document.getElementById('tourDialog').getBoundingClientRect(); return d.left >= 0 && d.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth; });
        assert.ok(fit, `step ${i} fits at ${width}`);
        await page.click('#tourNext');
      }
      assert.equal(await page.$eval('#tourDialog', d => d.open), false, 'Finish closes the walkthrough');

      /* The Register's walkthrough has a comparison step of its own, with the same wording */
      await page.goto(server.url('register.html')); await ready(page);
      await page.click('.hdr [data-open-register-tour]'); await page.waitForSelector('#rtour[open]');
      const rTitles = await page.$$eval('#rtour [data-slide] h3', list => list.map(h => h.textContent.trim()));
      assert.equal(rTitles.length, 9);
      assert.deepEqual(rTitles.slice(6), ['Saving and printing', 'Comparing saved use-case ideas', 'Feedback and corrections']);
      assert.ok((await page.$eval('#rtour [data-slide]:nth-child(8)', s => s.textContent.replace(/\s+/g, ' '))).includes('Nothing is ranked or scored'));
      assert.deepEqual(errors, []);
      await context.close();
      pass(`@${width}: the walkthrough has a step each for saving, comparing, planning and printing, The Register, and feedback; The Register's has a comparison step`);
    }
  } finally { await browser.close(); await server.close(); }
  console.log('\nAnswer and walkthrough checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
