/* Verify every entry in both renderers, all source/quote rights, and each tool notice. */
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const {chromium} = require('playwright');
const {AxeBuilder} = require('@axe-core/playwright');
const {createContext} = require('./browser');
const {start} = require('./serve');
const ROOT = path.resolve(__dirname, '..'), cfg = require('../content/tool-license.json');
const SITE = path.join(ROOT, '_site'), license = cfg.tool_license;
(async () => {
  const server = await start({dir:SITE}), browser = await chromium.launch();
  const context = await createContext(browser, {viewport:{width:1280,height:900}, reducedMotion:'reduce'});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let footerStates = 0, entryViews = 0;
  try {
    for (const file of ['index.html','what-if-ai.html','register.html','404.html']) {
      await page.goto(server.url(file));
      if (['what-if-ai.html','register.html'].includes(file)) await page.waitForSelector('html[data-ready]');
      assert.equal(await page.locator('head link[rel="license"]').getAttribute('href'), license.url);
      assert.ok((await page.locator('meta[name="dcterms.rights"]').getAttribute('content')).includes(license.exceptions));
      assert.equal(await page.locator('.site-foot__license a[rel~="license"]').count(), 2);
      for (const anchor of await page.locator('.site-foot__license a').all()) assert.equal(await anchor.getAttribute('href'), license.url);
      assert.ok((await page.locator('.site-foot__text').textContent()).includes(license.name));
      assert.equal((await page.locator('[data-license-exceptions]').textContent()).trim(), license.exceptions);
      await page.locator('#license-details summary').click();
      assert.equal((await page.locator('[data-license-history]').textContent()).trim(), license.history_notice);
      assert.deepEqual(await page.locator('.cc-icons svg').evaluateAll(icons => icons.map(icon => icon.dataset.ccSymbol)), ['cc','by','nc','nd']);
      assert.ok(await page.locator('.cc-icons').evaluate(link => link.getAttribute('aria-label').includes('Attribution-NonCommercial-NoDerivatives')));
      for (const width of [320,1280]) {
        await page.setViewportSize({width,height:900});
        assert.ok(await page.locator('.site-foot').evaluate(el => el.scrollWidth <= el.clientWidth + 1), file + ' footer at ' + width);
        const result = await new AxeBuilder({page}).include('.site-foot').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        assert.equal(result.violations.length, 0, JSON.stringify(result.violations));
        footerStates++;
      }
    }
    console.log('PASS: all four page footers, metadata, badge, exceptions, and prior-grant notice; eight expanded-footer accessibility/layout states.');

    for (const file of ['what-if-ai.html','register.html']) {
      await page.goto(server.url(file)); await page.waitForSelector('html[data-ready]');
      const result = await page.evaluate(() => {
        const bad = [], parser = new DOMParser(); let count = 0;
        for (const entry of window.SITE.A) for (const print of [false,true]) {
          const doc = parser.parseFromString(window.SITE.detailHTML(entry,{print,inRegister:location.pathname.includes('register')}), 'text/html');
          const node = doc.querySelector('[data-entry-license]');
          if (!node || !node.textContent.includes(entry.lic)) bad.push(entry.id + ': license');
          if (entry.lics && !node.textContent.includes(entry.lics)) bad.push(entry.id + ': source license statement');
          if (!print && entry.licu && node.querySelector('a')?.getAttribute('href') !== entry.licu) bad.push(entry.id + ': deed URL');
          if (doc.querySelector('[data-entry-license-scope]')?.textContent !== window.TOOL_LICENSE.entry_notice) bad.push(entry.id + ': scope');
          if (entry.licn && !doc.body.textContent.includes(entry.licn)) bad.push(entry.id + ': license note');
          if (entry.attr && !entry.attr.split('\n').filter(Boolean).every(line => doc.body.textContent.includes(line))) bad.push(entry.id + ': attribution');
          if (doc.body.textContent.includes('carries the collection’s license') || doc.body.textContent.includes('collection’s CC BY-NC-SA')) bad.push(entry.id + ': inherited tool license');
          count++;
        }
        return {bad,count};
      });
      assert.deepEqual(result.bad, []); assert.equal(result.count, 2066); entryViews += result.count;
      // A real saved-selection print contains one example of every existing license.
      const printed = await page.evaluate(() => {
        window.print = function(){}; window.SITE.Saved.clear();
        const representatives = [...new Map(window.SITE.A.map(a=>[a.lic,a])).values()];
        representatives.forEach(a=>window.SITE.Saved.add(a.id)); window.SITE.printSaved();
        return {licenses:representatives.map(a=>a.lic), rendered:[...document.querySelectorAll('#printRoot [data-entry-license]')].map(e=>e.textContent),
          footer:document.querySelector('#printRoot .pr-foot').textContent, scopes:document.querySelectorAll('#printRoot [data-entry-license-scope]').length};
      });
      assert.equal(printed.licenses.length,18); assert.equal(printed.scopes,18);
      printed.licenses.forEach((value,i)=>assert.ok(printed.rendered[i].includes(value), value));
      assert.ok(printed.footer.includes(license.label) && printed.footer.includes(license.exceptions));
      assert.ok(!printed.footer.includes('collection is licensed CC BY-NC-SA'));
      console.log('PASS: '+file+' preserves each license, source statement, deed, attribution, and scope across 2,066 entry views and an 18-license saved printout.');
    }
    await page.goto(server.url('register.html#sources')); await page.waitForSelector('html[data-ready]');
    const sources = await page.evaluate(() => window.SITE_DATA.register.works.map(w=>({id:w.id,ok:!w.lic || document.getElementById('src-'+w.id)?.textContent.includes('License: '+w.lic)})));
    assert.equal(sources.length,618); assert.deepEqual(sources.filter(s=>!s.ok),[]);
    await page.goto(server.url('register.html#policies')); await page.waitForSelector('html[data-ready]');
    const tiers = await page.evaluate(()=>window.SITE_DATA.register.policy.tiers);
    let quoteCount = 0;
    for (const tier of tiers) {
      await page.locator('#pt-'+tier.key).click();
      const quotes = await page.locator('#pp .quotes li').allTextContents();
      assert.equal(quotes.length,tier.items.length);
      tier.items.forEach((item,i)=>{assert.ok(quotes[i].includes(item.quote));assert.ok(quotes[i].includes(item.lic));quoteCount++;});
    }
    assert.ok((await page.locator('[data-policy-license]').textContent()).includes('remain CC BY-NC-SA 4.0'));
    await page.goto(server.url('register.html#ai-types')); await page.waitForSelector('html[data-ready]');
    assert.ok((await page.locator('#ai-types [data-guide-license]').textContent()).includes('remain CC BY-NC-SA 4.0'));
    await page.locator('[data-open-type]').first().click();
    assert.equal((await page.locator('#aiTypeDialog [data-guide-license]').textContent()).trim(),license.guide_notice);
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${entryViews} entry views, 618 source notices, ${quoteCount} unchanged policy quotations/licenses, guide section/dialog notices, and ${footerStates} expanded-footer states. No browser errors.`);
  } finally {await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
