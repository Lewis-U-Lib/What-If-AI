/* "Plan a small trial": the optional worksheet kept with a saved use-case idea (src/js/trial-plan.js).
 * The Library supplies five questions and quotes the record beside them; what a reader writes stays in the
 * browser, goes where the saved list goes (printouts, exports, a downloaded list), and leaves with its idea.
 * Run after `python3 tools/build.py`:  node tests/trial-plan.test.js [site-dir] */
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createContext } = require('./browser');
const { start } = require('./serve');
const { analytics } = require('../site.json');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const ACTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'acts.json'), 'utf8')).acts;
const SAVED = 'lul-whatifai-saved-v1', PLANS = 'lul-whatifai-plans-v1';
const QUESTIONS = ['What am I trying to improve?', 'What will I try, and what remains my responsibility?', 'What preparation and checking will this require?',
  'What would indicate that it helped?', 'When would I revise or abandon the approach?'];
const pass = message => console.log('PASS  ' + message);
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
const axe = async (page, what) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe: ' + what);
};
const routed = ACTS.find(a => a.na && a.gate && a.dl && a.attr);       /* has a route without AI to compare with */
const second = ACTS.find(a => a.id !== routed.id && a.focus === 'teaching' && a.attr);
const third = ACTS.find(a => ![routed.id, second.id].includes(a.id));
const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const settle = page => page.waitForTimeout(650);                         /* answers are written 400ms after typing stops */
const ANSWER_1 = 'Students accept the first interpretation they meet.', ANSWER_2 = 'One section, one week.\nI choose the passage and read every account myself.';

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-plan-'));
  try {
    const outbound = line => !line.startsWith('GET blob:') && !line.startsWith('GET ' + server.url('')) && line !== 'GET ' + analytics.script_url;
    const context = await createContext(browser, { viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await context.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
    await context.addInitScript(([key, value]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } } catch (_) {} }, [SAVED, JSON.stringify([routed.id, second.id])]);
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', r => requests.push(r.method() + ' ' + r.url()));

    /* ── the worksheet ── */
    await page.goto(server.url('quidsima.html')); await ready(page);
    await page.click('.topbar [data-open-saved]');
    const opener = page.locator(`#savedBody [data-plan="${routed.id}"]`);
    assert.equal(norm(await opener.innerText()), 'Plan a small trial for ' + routed.t);
    await opener.click(); await page.waitForSelector('#planDialog[open]');
    assert.equal(norm(await page.locator('#planTitle').textContent()), 'Plan a small trial');
    assert.ok(norm(await page.locator('.plan__for').textContent()).endsWith(routed.t));
    assert.deepEqual(await page.$$eval('#planForm label', ls => ls.map(l => l.textContent.replace(/^\s*\d\s*/, '').trim())), QUESTIONS, 'the five questions, as written');
    assert.ok(await page.$$eval('#planForm textarea', ts => ts.length === 5 && ts.every(t => t.labels.length === 1 && t.value === '')), 'each question has its own labeled, empty field');
    assert.equal(await page.locator('.plan__record').getAttribute('open'), null, 'the record is folded until asked for');
    await page.click('.plan__record > summary');
    const record = norm(await page.locator('.plan__record').innerText());
    assert.ok(record.includes('A route without AI, for comparison') && record.includes(norm(routed.na)), 'the record’s route without AI is quoted for comparison');
    assert.ok(record.includes(norm(routed.gate)) && record.includes(norm(routed.dl)), 'with the judgment that stays with people and what is produced');
    assert.equal(await stored(page, PLANS), null, 'opening a plan stores nothing');
    await axe(page, 'the trial plan');
    await page.fill('#plan-q0', ANSWER_1); await page.fill('#plan-q1', ANSWER_2); await settle(page);
    const kept = await stored(page, PLANS);
    assert.deepEqual(kept[routed.id].answers, [ANSWER_1, ANSWER_2, '', '', '']);
    assert.ok(norm(await page.locator('#planStatus').textContent()).startsWith('Kept in this browser only'));
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('planDialog').open);
    assert.equal(norm(await opener.innerText()), 'Edit trial plan for ' + routed.t, 'the saved list shows that a plan exists');
    await page.goto(server.url('register.html')); await ready(page);
    await page.click('.topbar [data-open-saved]'); await page.click(`#savedBody [data-plan="${routed.id}"]`);
    assert.equal(await page.inputValue('#plan-q1'), ANSWER_2, 'the plan is there after leaving the page, in the other tool');
    await page.keyboard.press('Escape');
    pass('the worksheet: five questions, the record (and its route without AI) alongside, answers kept in this browser across pages');

    /* ── on paper, in an export, in a downloaded list ── */
    await page.click(`#savedBody [data-plan="${routed.id}"]`); await page.click('#printPlan'); await page.waitForFunction(() => window.__printed === 1);
    let paper = norm(await page.$eval('#printRoot', r => r.textContent));
    assert.ok(paper.startsWith('Plan for a small trial'));
    for (const t of [QUESTIONS[0], ANSWER_1, 'I choose the passage and read every account myself.', routed.sum, routed.cit.split('\n')[0], routed.lic, routed.attr.split('\n')[0]]) assert.ok(paper.includes(norm(t)), 'the printed plan carries: ' + norm(t).slice(0, 50));
    assert.ok(!paper.includes(QUESTIONS[4]), 'unanswered questions are not printed with a written plan');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('planDialog').open);
    for (const mode of ['full', 'brief']) {
      await page.check(`input[name="print-mode"][value="${mode}"]`); await page.click('#printSaved');
      await page.waitForFunction(n => window.__printed === n, mode === 'full' ? 2 : 3);
      const articles = await page.$$eval('#printRoot article', as => as.map(a => a.textContent.replace(/\s+/g, ' ').trim()));
      assert.ok(articles[0].includes('Your plan for a small trial') && articles[0].includes(ANSWER_1) && articles[0].includes(norm(routed.sum)), mode + ': the plan prints after its idea');
      assert.ok(!articles[1].includes('Your plan for a small trial'), mode + ': an idea without a plan prints as before');
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await page.click('.topbar [data-open-saved]');
    }
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#downloadSaved')]);
    const listPath = path.join(tmp, 'list.json'); await download.saveAs(listPath);
    const list = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    assert.deepEqual(list.plans[routed.id].answers, [ANSWER_1, ANSWER_2, '', '', '']);
    assert.deepEqual(Object.keys(list.plans), [routed.id]);
    await page.click(`#savedBody [data-open="${routed.id}"]`); await page.waitForSelector('#actDialog[open]');
    assert.equal(norm(await page.locator('#actDialog .trialcta [data-plan]').innerText()), 'Edit trial plan');
    /* the reader's own notes go with a copy or an export only when asked for */
    const include = page.locator('#actDialog [data-plan-opt] input');
    assert.ok(await include.isVisible() && !(await include.isChecked()), 'the choice appears once there is a plan, and starts off');
    await page.click('#actDialog [data-copy-text]');
    await page.waitForFunction(() => /^Copied /.test(document.querySelector('.takeaway__status').textContent));
    const without = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(!without.includes('YOUR PLAN FOR A SMALL TRIAL') && !without.includes(ANSWER_1) && without.includes(routed.t), 'left off, the copied text is the record alone');
    await include.check();
    await page.click('#actDialog [data-copy-text]');
    await page.waitForFunction(() => /and your trial plan\.$/.test(document.querySelector('.takeaway__status').textContent));
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(text.includes('YOUR PLAN FOR A SMALL TRIAL') && text.includes(QUESTIONS[0] + '\n' + ANSWER_1) && text.includes('One section, one week.\nI choose the passage'), 'the copied text ends with the plan');
    assert.ok(text.indexOf('YOUR PLAN FOR A SMALL TRIAL') > text.indexOf('SOURCE AND LICENSE') && text.includes('Not part of the use-case idea’s record.'), 'after the record, and marked as the reader’s own notes');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('actDialog').open);
    pass('a plan prints by itself and after its idea in both printouts, travels in the downloaded list, and joins the exported text only when the reader chooses');

    /* ── restore into another browser: its own answers are never overwritten ── */
    const other = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await other.addInitScript(([s, p, sv, pv]) => { try { if (!localStorage.getItem(s)) { localStorage.setItem(s, sv); localStorage.setItem(p, pv); } } catch (_) {} },
      [SAVED, PLANS, JSON.stringify([routed.id]), JSON.stringify({ [routed.id]: { answers: ['Mine, written here.', '', '', '', 'After two weeks.'], updated: '2026-11-01T12:00:00.000Z' } })]);
    const phone = await other.newPage();
    await phone.goto(server.url('quidsima.html')); await ready(phone); await phone.click('.topbar [data-open-saved]');
    await phone.setInputFiles('#restoreFile', listPath);
    await phone.waitForSelector('#restorePreview');
    assert.equal(norm(await phone.locator('#restorePreview p').textContent()), 'This file lists 2 use-case ideas. 1 would be added to your saved list. 1 is already saved. It also carries 1 trial plan; an answer already written in this browser is kept. Nothing already saved here is removed.');
    assert.deepEqual((await stored(phone, PLANS))[routed.id].answers, ['Mine, written here.', '', '', '', 'After two weeks.'], 'reading the file changes no plan');
    await phone.click('#restoreConfirm');
    await phone.waitForFunction(() => /^Added 1 /.test(document.getElementById('transferStatus').textContent));
    assert.equal(norm(await phone.locator('#transferStatus').textContent()), 'Added 1 use-case idea from the file. 1 was already saved. 1 trial plan was restored. Where a plan in this browser already had an answer, that answer was kept.');
    assert.deepEqual((await stored(phone, PLANS))[routed.id].answers, ['Mine, written here.', ANSWER_2, '', '', 'After two weeks.']);
    await phone.click(`#savedBody [data-plan="${routed.id}"]`); await phone.waitForSelector('#planDialog[open]');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll on a phone');
    await axe(phone, 'the trial plan on a phone');
    await other.close();
    pass('restoring a list restores its plans and keeps answers already written in this browser');

    /* ── a plan leaves with its idea, after asking ── */
    const remove = page.locator(`#savedBody .saved-item [data-unsave="${routed.id}"]:not([data-unsave-sure])`);
    await remove.click();
    assert.ok(norm(await page.locator('#savedBody .saved-item .confirm').innerText()).startsWith('Remove this use-case idea and the trial plan written for it?'));
    assert.equal((await stored(page, SAVED)).length, 2, 'nothing is removed before the answer');
    await page.click('[data-unsave-keep]');
    assert.equal(await page.locator('#savedBody .saved-item .confirm').count(), 0); assert.ok((await stored(page, PLANS))[routed.id]);
    await page.locator(`#savedBody [data-unsave="${second.id}"]`).click();
    assert.deepEqual(await stored(page, SAVED), [routed.id], 'an idea without a plan is removed at once, as before');
    await remove.click(); await page.click('[data-unsave-sure]');
    assert.deepEqual(await stored(page, SAVED), []); assert.equal(await stored(page, PLANS), null, 'the plan went with its idea');
    await page.keyboard.press('Escape');
    pass('removing a saved idea with a plan asks first, and removes both');

    /* ── from an idea that is not saved yet; clearing a plan; Clear all ── */
    await page.goto(server.url('register.html#act=' + third.id)); await ready(page); await page.waitForSelector('#actDialog[open]');
    await page.click('#actDialog .trialcta [data-plan]'); await page.waitForSelector('#planDialog[open]');
    assert.deepEqual(await stored(page, SAVED), [third.id], 'planning a trial saves the idea');
    assert.ok(norm(await page.locator('#planBody .note').textContent()).includes('added to your saved list'));
    await page.fill('#plan-q3', 'Fewer unsupported claims in the accounts.'); await settle(page);
    assert.ok((await stored(page, PLANS))[third.id]);
    await page.click('#clearPlan'); await page.click('#planClearNo');
    assert.equal(await page.inputValue('#plan-q3'), 'Fewer unsupported claims in the accounts.');
    await page.click('#clearPlan'); await page.click('#planClearYes');
    assert.equal(await page.inputValue('#plan-q3'), ''); assert.equal(await stored(page, PLANS), null, 'a cleared plan leaves nothing in storage');
    assert.deepEqual(await stored(page, SAVED), [third.id], 'the idea stays saved');
    await page.fill('#plan-q0', 'Again.'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('planDialog').open);
    /* the dialog's close event, which saves, is dispatched just after it stops being open */
    await page.waitForFunction(k => !!localStorage.getItem(k), PLANS);
    assert.ok((await stored(page, PLANS))[third.id], 'closing keeps what was just typed');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('actDialog').open);
    await page.click('.topbar [data-open-saved]'); await page.click('#clearSaved');
    assert.ok(norm(await page.locator('#clearConfirm p').textContent()).includes('The trial plan written for one of them is removed too.'));
    await page.click('#clearYes');
    assert.deepEqual(await stored(page, SAVED), []); assert.equal(await stored(page, PLANS), null);
    pass('a plan can start from an unsaved idea (which saves it), be cleared after asking, and goes when the list is cleared');

    /* ── the same worksheet open in two tabs: what is written in one appears in the other ── */
    await page.keyboard.press('Escape');
    await page.goto(server.url('register.html#act=' + third.id)); await ready(page); await page.waitForSelector('#actDialog[open]');
    await page.click('#actDialog .trialcta [data-plan]'); await page.waitForSelector('#planDialog[open]');
    await page.fill('#plan-q0', 'Written in the first tab.'); await settle(page);
    /* opened from the first tab, as a link in a new tab would be (it shares the test's one-time seeding of the saved list) */
    const [tab] = await Promise.all([context.waitForEvent('page'), page.evaluate(url => { window.open(url); }, server.url('quidsima.html'))]);
    await ready(tab); await tab.click('.topbar [data-open-saved]');
    await tab.click(`#savedBody [data-plan="${third.id}"]`); await tab.waitForSelector('#planDialog[open]');
    assert.equal(await tab.inputValue('#plan-q0'), 'Written in the first tab.');
    await tab.fill('#plan-q1', 'Written in the second tab.'); await settle(tab);
    await page.waitForFunction(() => document.getElementById('plan-q1').value === 'Written in the second tab.');
    assert.equal(await page.inputValue('#plan-q0'), 'Written in the first tab.', 'and nothing already there is lost');
    await tab.close();
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('planDialog').open);
    pass('a worksheet open in two tabs follows what is written in the other');

    assert.deepEqual(requests.filter(outbound), [], 'nothing written in a plan is sent anywhere');
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('\nTrial-plan checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
