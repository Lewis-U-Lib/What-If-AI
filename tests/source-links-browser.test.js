const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const { start } = require('./serve');
const { createContext } = require('./browser');
const data = require('../content/source-links.json');
const acts = require('../data/acts.json').acts;
const works = require('../data/register.json').works;
const api = require('../src/js/source-links');
const policy = api.create(data);

(async () => {
  const server = await start();
  const browser = await chromium.launch({headless:true});
  const context = await createContext(browser);
  const errors = [], external = [], downloads = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(server.origin)) return route.continue();
    if (url.includes('umami')) return route.fulfill({contentType:'application/javascript',body:'/* Analytics disabled. */'});
    external.push(url);
    return route.fulfill({contentType:'text/html',body:'<h1>External source stub</h1>'});
  });
  context.on('page', page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('download', d => downloads.push(d.url()));
  });
  try {
    const page = await context.newPage();
    for (const tool of ['what-if-ai.html','register.html']) {
      await page.goto(server.url(tool));
      await page.waitForSelector('html[data-ready]');
      const failures = await page.evaluate(({acts,works}) => {
        const failures = [];
        const policy = SourceLinks.create(SITE_DATA['source-links']);
        for (const x of acts.concat(works)) {
          const u = x.url || x.link;
          if (!u) continue;
          const entry = policy.lookup(u);
          const holder = document.createElement('div');
          holder.innerHTML = SITE.sourceLink(u,'Open the source');
          const anchors = [...holder.querySelectorAll('a')];
          if (entry && entry.kind !== 'page') {
            if (!anchors.some(a => a.hasAttribute('data-source-file'))) failures.push(x.id + ': no notice');
            if (anchors.some(a => a.href === u)) failures.push(x.id + ': direct file');
          }
          if (entry && entry.page && anchors[0].href !== entry.page) failures.push(x.id + ': wrong default');
          if (anchors.some(a => a.hasAttribute('download') || a.target !== '_blank' || !a.rel.includes('noopener'))) failures.push(x.id + ': unsafe attributes');
        }
        return failures;
      }, {acts, works});
      assert.deepEqual(failures, []);
      const a = acts.find(a => a.url && a.url.endsWith('#page=14'));
      await page.evaluate(id => SITE.openActivity(id), a.id);
      await page.locator('#actDialog summary').filter({hasText:'Source and license'}).click();
      await page.waitForSelector('dialog[open] [data-source-file]');
      assert.ok((await page.locator('dialog[open] [data-source-file]').first().getAttribute('href')).includes('source-file.html#'));
    }
    await page.goto(server.url('register.html')+'#sources');
    await page.waitForSelector('html[data-ready]');
    const work = works.find(w => w.link && w.link.includes('21-0862.pdf'));
    assert.equal(await page.locator('#src-'+work.id+' a').first().getAttribute('href'), 'https://www.jmlr.org/papers/v23/21-0862.html');
    const before = external.length;
    // Direct navigation also covers opening the notice through a context menu.
    const original = acts.find(a => a.url && a.url.endsWith('#page=14')).url;
    await page.goto(server.url(policy.noticeURL(original)));
    await page.waitForSelector('html[data-ready]');
    assert.equal(external.length, before);
    assert.equal(downloads.length, 0);
    const choice = page.getByRole('link', {name:'Open PDF — may download (new tab)', exact:true});
    assert.equal(await choice.getAttribute('href'), original);
    await choice.focus();
    const popupPromise = context.waitForEvent('page');
    await page.keyboard.press('Enter');
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(external.length, before + 1);
    await popup.close();
    assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations, []);
    await page.setViewportSize({width:375,height:812});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const bad of ['javascript:alert(1)','https://evil.example/file.pdf','%E0%A4%A','']) {
      await page.goto(server.url('source-file.html')+'#'+(bad.startsWith('%')?bad:encodeURIComponent(bad)));
      await page.waitForSelector('html[data-ready]');
      assert.equal(await page.locator('#file-details a').count(), 0);
      assert.match(await page.locator('#file-details').innerText(), /not recognized/);
    }
    assert.deepEqual(errors, []);
    assert.equal(downloads.length, 0);
    console.log('PASS browser source links: both tools, matching reference, no automatic file request, preserved page locator, keyboard choice, invalid links, accessibility and mobile width');
  } finally { await context.close(); await browser.close(); await server.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
