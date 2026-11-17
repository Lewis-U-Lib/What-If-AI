/* Comparing, moving, printing and exporting saved use-case ideas (src/js/saved-tools.js).
 * Everything here must run in the browser alone, quote records without shortening them, and keep
 * each idea's source, license and attribution attached.
 * Run after `python3 tools/build.py`:  node tests/saved-tools.test.js [site-dir] */
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createContext } = require('./browser');
const { start } = require('./serve');
const { analytics } = require('../site.json');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const ACTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'acts.json'), 'utf8')).acts;
const KEY = 'lul-whatifai-saved-v1';
const pass = message => console.log('PASS  ' + message);
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
const axe = async (page, what) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe: ' + what);
};
/* four records that between them exercise every row: one with the three reference sections, one with no
   "What is produced", one with a route without AI, one in which no one uses an AI tool */
const rich = ACTS.find(a => a.ad && a.srp && a.srp.length && a.rel && a.rel.length && a.attr && a.cit && a.gate);
const bare = ACTS.find(a => !a.dl && a.id !== rich.id);
const routed = ACTS.find(a => a.na && ![rich.id, bare.id].includes(a.id));
const noTool = ACTS.find(a => a.op === 'none' && !a.na && ![rich.id, bare.id, routed.id].includes(a.id));
const FOUR = [rich, bare, routed, noTool];
const seed = (context, ids) => context.addInitScript(([key, value]) => { try { if (!localStorage.getItem(key)) localStorage.setItem(key, value); } catch (_) { /* blocked in one test */ } }, [KEY, JSON.stringify(ids)]);
const tick = (page, id) => page.check(`input[data-compare="${id}"]`);

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saved-tools-'));
  try {
    /* anything but fetching this site's own files (a font, a page) would be data leaving the browser */
    const outbound = line => !line.startsWith('GET blob:') && !line.startsWith('GET ' + server.url('')) && line !== 'GET ' + analytics.script_url;   /* the page-visit script loads with each page */
    const context = await createContext(browser, { viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    await seed(context, FOUR.map(a => a.id));
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    /* ── compare ── */
    await page.goto(server.url('what-if-ai.html')); await ready(page);
    await page.click('.topbar [data-open-saved]');
    const compare = page.locator('#compareSaved');
    assert.equal(await compare.getAttribute('aria-disabled'), 'true', 'nothing is compared until two are ticked');
    await compare.dispatchEvent('click');   /* Playwright will not click an aria-disabled control; a reader still can */
    assert.equal(await page.locator('#compareDialog[open]').count(), 0, 'the button does nothing with fewer than two');
    await tick(page, rich.id);
    assert.equal(await compare.getAttribute('aria-disabled'), 'true');
    await tick(page, bare.id); await tick(page, routed.id);
    assert.equal(await compare.getAttribute('aria-disabled'), 'false');
    assert.equal(norm(await compare.innerText()), 'Compare selected (3)');
    await page.locator(`input[data-compare="${noTool.id}"]`).click();
    assert.equal(await page.locator(`input[data-compare="${noTool.id}"]`).isChecked(), false, 'a fourth cannot be ticked');
    assert.equal(await page.locator('input[data-compare]:checked').count(), 3);
    await axe(page, 'the saved drawer');
    await compare.click();
    await page.waitForSelector('#compareDialog[open]');
    const table = await page.evaluate(() => ({
      cols: [...document.querySelectorAll('#compareDialog thead th .cmp__t')].map(e => e.textContent),
      rows: [...document.querySelectorAll('#compareDialog tbody tr')].map(tr => ({ head: tr.querySelector('th').textContent, scope: tr.querySelector('th').getAttribute('scope'), cells: [...tr.querySelectorAll('td')].map(td => [...td.querySelectorAll('dt, dd, p')].map(e => e.textContent).join(' ').replace(/\s+/g, ' ').trim()) })),
      overflow: document.documentElement.scrollWidth - innerWidth,
      box: (() => { const r = document.getElementById('compareDialog').getBoundingClientRect(); return [r.left >= 0, r.right <= innerWidth + 1]; })(),
    }));
    assert.deepEqual(table.cols, [rich.t, bare.t, routed.t], 'one column per ticked idea, in the order ticked');
    assert.deepEqual(table.rows.map(r => r.head), ['Purpose', 'Participants', 'Preparation', 'Access requirements', 'Human judgment', 'A route without AI']);
    assert.ok(table.rows.every(r => r.scope === 'row' && r.cells.length === 3 && r.cells.every(c => c.length > 0)), 'every cell says something');
    assert.ok(table.rows[0].cells[1].includes('What is produced Not stated'), 'a missing field reads "Not stated": ' + table.rows[0].cells[1]);
    assert.ok(table.rows[4].cells[0].includes(norm(rich.gate)), 'human judgment quotes the record in full');
    assert.ok(table.rows[5].cells[2].includes(norm(routed.na)), 'the route without AI is quoted in full');
    assert.deepEqual(table.box, [true, true], 'the dialog fits the window'); assert.ok(table.overflow <= 0);
    await axe(page, 'the comparison');
    await page.locator('#compareDialog thead [data-open]').first().click();
    await page.waitForSelector('#actDialog[open]');
    assert.equal(await page.locator('#actDialogTitle').textContent(), rich.t, 'View details opens the idea over the comparison');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('actDialog').open);
    assert.ok(await page.$eval('#compareDialog', d => d.open), 'closing it returns to the comparison');
    await page.click('#printCompare'); await page.waitForFunction(() => window.__printed === 1);
    const printed = norm(await page.$eval('#printRoot', r => r.textContent));
    assert.ok(printed.startsWith('Use-case ideas compared'));
    for (const a of [rich, bare, routed]) { assert.ok(printed.includes(norm(a.cit.split('\n')[0])), a.id + ': citation printed with the comparison'); assert.ok(printed.includes(a.lic), a.id + ': license printed'); }
    assert.equal(await page.locator('#printRoot [data-open]').count(), 0, 'no buttons on paper');
    await page.keyboard.press('Escape');
    pass('compare: two or three saved ideas, six rows that quote the records, "Not stated" for gaps, printable with sources and licenses');

    /* ── the two printouts ── */
    await page.waitForFunction(() => !document.getElementById('compareDialog').open);
    assert.equal(await page.locator('input[name="print-mode"]:checked').getAttribute('value'), 'full', 'the full reference is the default');
    await page.click('#printSaved'); await page.waitForFunction(() => window.__printed === 2);
    const full = await page.$eval('#printRoot', r => ({ cls: r.className, text: r.textContent.replace(/\s+/g, ' ').trim(), heads: [...r.querySelectorAll('h3')].map(h => h.textContent) }));
    assert.equal(full.cls, '');
    for (const h of ['Adapting it', 'What the source reports', 'Works it draws on']) assert.ok(full.heads.includes(h), 'full reference keeps "' + h + '"');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.click('.topbar [data-open-saved]');
    await page.check('input[name="print-mode"][value="brief"]');
    await page.click('#printSaved'); await page.waitForFunction(() => window.__printed === 3);
    const brief = await page.$eval('#printRoot', r => ({ cls: r.className, text: r.textContent.replace(/\s+/g, ' ').trim(), heads: [...r.querySelectorAll('h3')].map(h => h.textContent), articles: r.querySelectorAll('article').length }));
    assert.equal(brief.cls, 'pr-brief'); assert.equal(brief.articles, 4);
    for (const h of ['Adapting it', 'What the source reports', 'Works it draws on']) assert.ok(!brief.heads.includes(h), 'planning summary leaves out "' + h + '"');
    for (const a of FOUR) {
      for (const mode of [full, brief]) {
        assert.ok(mode.text.includes(norm(a.sum)), a.id + ': the complete description is printed, not a shortened one');
        assert.ok(mode.text.includes(norm(a.cit.split('\n')[0])), a.id + ': citation'); assert.ok(mode.text.includes(a.lic), a.id + ': license');
        if (a.attr) assert.ok(mode.text.includes(norm(a.attr.split('\n')[0])), a.id + ': attribution');
        assert.ok(mode.text.includes(norm(a.chg)), a.id + ': change notes'); assert.ok(mode.text.includes(norm(a.gate)), a.id + ': the judgment that stays with people');
      }
    }
    assert.ok(brief.text.length < full.text.length * 0.9, 'the planning summary is shorter');
    assert.ok(brief.text.includes('It leaves out adaptation notes'), 'and says what it leaves out');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    pass('printing: full reference by default; the planning summary drops three reference sections and keeps every description, source, license and attribution whole');

    /* ── download, then restore in another browser ── */
    await page.click('.topbar [data-open-saved]');
    page.on('request', r => requests.push(r.method() + ' ' + r.url()));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#downloadSaved')]);
    assert.match(download.suggestedFilename(), /^saved-use-case-ideas-\d{4}-\d{2}-\d{2}\.json$/);
    const listPath = path.join(tmp, 'list.json'); await download.saveAs(listPath);
    const list = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    assert.equal(list.format, 'what-if-ai-saved-list'); assert.equal(list.version, 1);
    assert.deepEqual(list.ideas, FOUR.map(a => ({ id: a.id, title: a.t })));
    assert.ok((await page.locator('#transferStatus').textContent()).startsWith('Downloaded a list of 4'));

    const other = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await seed(other, [bare.id]);
    const phone = await other.newPage();
    const phoneRequests = [];
    await phone.goto(server.url('register.html')); await ready(phone);
    await phone.click('.topbar [data-open-saved]');
    phone.on('request', r => phoneRequests.push(r.method() + ' ' + r.url()));
    await phone.setInputFiles('#restoreFile', listPath);
    await phone.waitForFunction(() => /^Added 3 /.test(document.getElementById('transferStatus').textContent));
    assert.equal(norm(await phone.locator('#transferStatus').textContent()), 'Added 3 use-case ideas from the file. 1 was already saved.');
    assert.deepEqual(await phone.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY), [bare.id, rich.id, routed.id, noTool.id], 'the list is added to what was saved');
    assert.equal(norm(await phone.locator('.topbar [data-saved-count]').textContent()), '4');
    const stale = path.join(tmp, 'stale.json'); fs.writeFileSync(stale, JSON.stringify({ format: 'what-if-ai-saved-list', version: 1, ideas: [{ id: 'NO-SUCH-IDEA' }, rich.id] }));
    await phone.setInputFiles('#restoreFile', stale);
    await phone.waitForFunction(() => /^Added 0 /.test(document.getElementById('transferStatus').textContent));
    assert.equal(norm(await phone.locator('#transferStatus').textContent()), 'Added 0 use-case ideas from the file. 1 was already saved. 1 is no longer in the collection and was left out.');
    for (const [name, body] of [['wrong.json', '{"format":"something else","ideas":[]}'], ['broken.json', '{not json']]) {
      const f = path.join(tmp, name); fs.writeFileSync(f, body); await phone.setInputFiles('#restoreFile', f);
      await phone.waitForFunction(() => /^That file /.test(document.getElementById('transferStatus').textContent));
    }
    assert.equal((await phone.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY)).length, 4, 'a file that is not a list changes nothing');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll on a phone');
    await axe(phone, 'the saved drawer on a phone');
    /* an empty list can still be restored into */
    const empty = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    const fresh = await empty.newPage();
    await fresh.goto(server.url('what-if-ai.html')); await ready(fresh); await fresh.click('.topbar [data-open-saved]');
    assert.equal(await fresh.locator('#downloadSaved').count(), 0, 'nothing to download from an empty list');
    assert.ok(await fresh.locator('#restoreSaved').isVisible());
    await fresh.setInputFiles('#restoreFile', listPath);
    await fresh.waitForFunction(() => /^Added 4 /.test(document.getElementById('transferStatus').textContent));
    assert.equal(await fresh.locator('#savedBody .saved-item').count(), 4);
    await empty.close();
    assert.deepEqual(phoneRequests.filter(outbound), [], 'restoring sends nothing anywhere');
    await other.close();
    pass('moving a list: download, restore into another browser (added to what is there), stale and wrong files handled, nothing uploaded');

    /* ── copy as text, download as Word ── */
    await page.keyboard.press('Escape');
    for (const [file, a] of [['what-if-ai.html', rich], ['register.html', routed]]) {
      await page.goto(server.url(file + '#act=' + a.id)); await ready(page); await page.waitForSelector('#actDialog[open]');
      await page.click('#actDialog [data-export-jump]');
      assert.ok(await page.evaluate(() => document.activeElement.matches('[data-copy-text]')), 'Copy or export moves to the block');
      assert.equal(norm(await page.locator('[data-copy-text]').innerText()), a.focus === 'teaching' ? 'Copy as assignment text' : 'Copy as text');
      await page.click('[data-copy-text]');
      await page.waitForFunction(() => /^Copied /.test(document.querySelector('.takeaway__status').textContent));
      const text = await page.evaluate(() => navigator.clipboard.readText());
      const flat = norm(text);
      assert.ok(text.startsWith(a.t + '\n'));
      for (const [what, value] of [['description', a.sum], ['judgment', a.gate], ['citation', a.cit.split('\n')[0]], ['license', a.lic], ['attribution', (a.attr || '').split('\n')[0]], ['change notes', a.chg], ['route without AI', a.na || '']])
        assert.ok(flat.includes(norm(value)), `${a.id}: the copied text carries the ${what} as written`);
      assert.ok(flat.includes('register.html#act=' + encodeURIComponent(a.id)), 'and a link to the complete record');
      assert.ok(!/^(WORKS IT DRAWS ON|WHAT THE SOURCE REPORTS|ADAPTING IT)$/m.test(text) && /^SOURCE AND LICENSE$/m.test(text), 'reference sections stay in the full details');
      const [docx] = await Promise.all([page.waitForEvent('download'), page.click('[data-export-docx]')]);
      assert.match(docx.suggestedFilename(), /^[a-z0-9-]{1,60}\.docx$/);
      const docxPath = path.join(tmp, a.id + '.docx'); await docx.saveAs(docxPath);
      /* a valid ZIP whose parts are well-formed XML, with the same paragraphs as the copied text */
      const paragraphs = JSON.parse(execFileSync('python3', ['-c', [
        'import sys, json, zipfile, xml.etree.ElementTree as ET',
        'z = zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None',
        'names = z.namelist(); assert names[0] == "[Content_Types].xml" and "word/document.xml" in names and "word/styles.xml" in names, names',
        '[ET.fromstring(z.read(n)) for n in names]',
        'W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"',
        'doc = ET.fromstring(z.read("word/document.xml"))',
        'out = []',
        'for p in doc.iter(W + "p"):',
        '    s = p.find(W + "pPr/" + W + "pStyle")',
        '    out.append([s.get(W + "val") if s is not None else "", "".join(t.text or "" for t in p.iter(W + "t"))])',
        'styles = {s.get(W + "styleId") for s in ET.fromstring(z.read("word/styles.xml")).iter(W + "style")}',
        'assert all(s in styles for s, _ in out if s), (styles, out[:3])',
        'print(json.dumps(out))',
      ].join('\n'), docxPath], { encoding: 'utf8' }));
      assert.deepEqual(paragraphs[0], ['Title', a.t]);
      const words = norm(paragraphs.map(p => p[1]).join(' '));
      for (const value of [a.sum, a.gate, a.cit.split('\n')[0], a.lic, (a.attr || '').split('\n')[0], a.chg]) assert.ok(words.includes(norm(value)), a.id + ': the Word document carries ' + norm(value).slice(0, 40));
      assert.equal(norm(paragraphs.map(p => p[1].replace(/^• /, '- ')).join(' ')).toLowerCase(), flat.toLowerCase(), 'the Word document and the copied text say the same thing');
      await axe(page, 'details with the copy-or-export block, ' + file);
      const heads = await page.$$eval('#actDialog .use-case-accordion h3', hs => hs.map(h => h.textContent));
      assert.ok((!a.ad || heads.includes('Adapting it')) && (!(a.rel && a.rel.length) || heads.includes('Works it draws on')) && heads.includes('Source and license'), 'the details themselves are unchanged');
    }
    assert.deepEqual(requests.filter(outbound), [], 'downloading and exporting send nothing anywhere');
    pass('copy and export: the record as written, with source, license, attribution and change notes, as text and as a valid Word document, in both tools');

    /* ── with the clipboard unavailable, the text is offered for manual copying ── */
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); });
    await page.click('[data-copy-text]');
    await page.waitForSelector('.takeaway__text');
    assert.ok((await page.$eval('.takeaway__text', t => t.value)).startsWith(routed.t));
    assert.ok(await page.evaluate(() => document.activeElement.matches('.takeaway__text')));
    pass('without clipboard access the text is selected in place for copying');
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('\nSaved-tools checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
