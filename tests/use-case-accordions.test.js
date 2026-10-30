/* Native disclosure behavior and complete-record printing on both live tools. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');
const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const LABELS = ['At a glance', 'How people and the AI tool divide the work',
  'Before you use it', 'A route without AI', 'Adapting it', 'What the source reports',
  'Source and license', 'Works it draws on'];
const EXAMPLE = 'CAN-G-GAP-004';

(async () => {
  const server = await start({dir:SITE_DIR});
  const browser = await chromium.launch();
  try {
    for (const file of ['what-if-ai.html', 'register.html']) {
      for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
        const context = await createContext(browser, {viewport});
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(server.url(file + '#act=' + EXAMPLE));
        await page.waitForSelector('html[data-ready]', {state:'attached'});
        await page.waitForSelector('#actDialog[open]');
        const details = page.locator('#actDialog .use-case-accordion');
        assert.deepEqual(await details.locator('summary').allTextContents(), LABELS);
        assert.equal(await page.locator('#actDialog details[open]').count(), 0);
        assert.ok(await page.getByRole('heading', {name:'The use-case idea',exact:true}).isVisible());
        assert.ok(await page.getByRole('heading', {name:'Share your experience',exact:true}).isVisible());
        assert.equal(await page.locator('#activity-feedback-privacy').textContent(),
          'Help us improve the collection. No name or email is collected and only the library team sees the answers.');

        await details.first().locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await details.first().evaluate(d => d.open), true);
        await details.last().locator('summary').click();
        assert.equal(await details.first().evaluate(d => d.open), true, 'sections open independently');
        assert.equal(await details.last().evaluate(d => d.open), true);
        await details.first().locator('summary').focus();
        await page.keyboard.press('Space');
        assert.equal(await details.first().evaluate(d => d.open), false);
        await details.last().locator('summary').click();
        await page.locator('[data-give-feedback]').click();
        assert.ok(await page.locator('.activity-feedback').evaluate(f =>
          f.querySelector('details').open && f.contains(document.activeElement) && document.activeElement.type === 'radio'));
        await page.locator('[name="activity-response"][value="used"]').check();
        assert.ok(await page.locator('[data-followup="used"]').isVisible());
        await page.locator('.feedback-accordion summary').click();
        assert.ok(await page.locator('#actDialog').evaluate(d =>
          d.scrollWidth <= d.clientWidth + 1 && d.querySelector('.dlg__body').scrollWidth <= d.querySelector('.dlg__body').clientWidth + 1));

        if (viewport.width === 1440) {
          const failures = await page.evaluate(() => SITE.A.flatMap(a => {
            const screen = document.createElement('div'), print = document.createElement('div');
            screen.innerHTML = SITE.detailHTML(a, {}); print.innerHTML = SITE.detailHTML(a, {print:true});
            const printed = [...print.querySelectorAll('h3')].map(h => h.textContent);
            const missing = [...screen.querySelectorAll('.use-case-accordion summary h3')].some(h => !printed.includes(h.textContent));
            return missing || print.querySelector('details,[hidden]') || screen.querySelector('details[open]') ? [a.id] : [];
          }));
          assert.deepEqual(failures, [], 'every populated section of every use case is fully present in print');
          await page.evaluate(() => { window.print = () => {
            const root = document.querySelector('#printRoot');
            window.__accordionPrint = {headings:[...root.querySelectorAll('h3')].map(h => h.textContent),
              articles:root.querySelectorAll('article').length, hidden:root.querySelectorAll('details,[hidden]').length,
              visible:document.body.classList.contains('print-saved')};
          }; });
          await page.locator('[data-print-act]').click();
          await page.waitForFunction(() => !!window.__accordionPrint);
          const single = await page.evaluate(() => window.__accordionPrint);
          assert.ok(LABELS.every(label => single.headings.includes(label)));
          assert.equal(single.articles, 1); assert.equal(single.hidden, 0); assert.ok(single.visible);
          await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
          assert.equal(await page.locator('#actDialog details[open]').count(), 0);

          await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
          assert.equal(await page.locator('#printRoot article').count(), 1);
          assert.ok(await page.locator('#printRoot').textContent().then(text => text.includes('Works it draws on')));
          await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
          await page.evaluate(id => {
            SITE.Saved.clear(); SITE.Saved.add(id); SITE.Saved.add('CAN-W-oer-020');
            window.__accordionPrint = null;
            SITE.closeDialog(document.querySelector('#actDialog'));
          }, EXAMPLE);
          await page.locator('.topbar [data-open-saved]').click();
          await page.locator('#printSaved').click();
          await page.waitForFunction(() => !!window.__accordionPrint);
          const saved = await page.evaluate(() => window.__accordionPrint);
          assert.equal(saved.articles, 2); assert.equal(saved.hidden, 0); assert.ok(saved.visible);
          await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
        }
        assert.deepEqual(errors, []);
        console.log('PASS ' + file + ' @' + viewport.width + ': disclosures, feedback, overflow, and printing');
        await context.close();
      }
    }
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
