/* Browser checks for What If AI and The Register. Run after `python3 scripts/build.py`:
 *   npm ci && npx playwright install chromium   (first time)
 *   npm run test:pages                            (or: node tests/pages.test.js [distDir])
 * Exits non-zero if any check fails. Every check prints PASS/FAIL with a reason.
 */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const { start } = require('./serve');
let SRV = null;
const URL = f => SRV.url(f);
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); }
/* the manifest a page's boot.js reads: which data files and scripts it loads */
function manifest(file) {
  const html = fs.readFileSync(path.join(SITE, file), 'utf8');
  const m = /<script id="site-manifest" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
}
const siteFile = rel => fs.readFileSync(path.join(SITE, rel.replace(/^\/?/, '')), 'utf8');
/* navigate, then wait until boot.js has loaded the data and run the page's scripts */
async function go(p, f) { await p.goto(URL(f)); await p.waitForSelector('html[data-ready]', { state: 'attached', timeout: 15000 }); }
/* phrases whose audience is the project, not a faculty reader; none may appear in either page */
const INTERNAL = ['held back', 'crosswalk', 'review queue', 'assignment pass', 'fingerprint', 'build 5ffdfb', 'schema v3',
  'awaiting a second', 'marked for human review', 'reintegration', 'csr-0', 'stamped from', 'canonical record', 'mechanism grid', 'void cell'];
function leaks(text) { const t = text.toLowerCase(); return INTERNAL.filter(w => t.indexOf(w) >= 0); }
async function overflow(page) { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }

(async () => {
  SRV = await start({ dir: SITE });
  // ── static: one store, public fields only
  const m1 = manifest('what-if-ai.html'), m2 = manifest('register.html');
  check('both pages load the same activity file (one download, cached for the other page)', m1 && m2 && m1.data.acts === m2.data.acts, m1 && m1.data.acts);
  const a1 = siteFile(m1.data.acts);
  const ACTS = JSON.parse(a1);
  const REGD = JSON.parse(siteFile(m2.data.register));
  const RELEASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'release.json'), 'utf8'));
  const ids = new Set(ACTS.acts.map(a => a.id));
  check('the page store holds exactly the released activities', ids.size === RELEASE.counts.activities && ACTS.acts.length === ids.size, ids.size + ' activities');
  check('the served data is the release, byte for byte', require('crypto').createHash('sha256').update(fs.readFileSync(path.join(SITE, m1.data.acts))).digest('hex') === RELEASE.files['acts.json'].sha256, RELEASE.release);
  const internalKeys = ['rq', 'vs', 'nf', 'ibasis', 'org', 'capb', 'fl', 'rs', 'cell', 'adm', 'gateb'];
  check('activity records carry no review or build fields', ACTS.acts.every(a => internalKeys.every(k => !(k in a))), internalKeys.join(', '));
  const regInternal = ['held', 'retired', 'xw', 'queues', 'audit', 'decisions', 'schema_map', 'schema_gaps', 'recon', 'rules', 'platforms'];
  check('The Register store carries no project-record sections', regInternal.every(k => !(k in REGD)), Object.keys(REGD).join(', '));
  check('stamps agree', JSON.stringify(ACTS.stamp) === JSON.stringify(REGD.stamp), ACTS.stamp.fingerprint);
  for (const f of ['what-if-ai.html', 'register.html']) {
    const html = fs.readFileSync(path.join(SITE, f), 'utf8');
    check(f + ': footer states CC BY-NC-SA 4.0 with the deed link',
      html.includes('https://creativecommons.org/licenses/by-nc-sa/4.0/') && html.includes('Attribution-NonCommercial-ShareAlike 4.0 International License') && !html.includes('by-nc-nd/4.0/" target'),
      'license text and link');
  }

  const browser = await chromium.launch();
  const ctx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // ══════════════ What If AI ══════════════
  await go(page, 'what-if-ai.html');
  check('What If AI: document title', (await page.title()) === 'What If AI | Lewis University Library', await page.title());
  check('What If AI: display title', (await page.textContent('h1')).replace(/\s+/g, ' ').trim() === 'What If AI');
  const landmarks = await page.evaluate(() => ['header', 'main', 'footer', 'nav'].map(t => document.querySelectorAll(t).length));
  check('What If AI: landmarks present (header, main, footer, nav)', landmarks.every(n => n > 0), landmarks.join('/'));
  check('What If AI: skip link targets main', await page.$eval('.skip', a => a.getAttribute('href') === '#main' && !!document.getElementById('main')));
  const radios = await page.$$('#wizard input[type=radio][name="q-focus"]');
  check('What If AI: first question offers three real radio options', radios.length === 3, radios.length + ' options');
  // no activity counts beside options on any of the four choice questions; every option offered still leads somewhere
  const countsShown = [];
  await page.check('input[value="teaching"]');
  for (const key of ['focus', 'task', 'disc', 'depth']) {
    await go(page, 'what-if-ai.html#q=' + key + '&a=focus:teaching'); await page.waitForTimeout(40);
    const t = await page.$$eval('#wizard .opt', os => os.map(o => o.textContent));
    if (await page.$('#wizard .opt__n') || t.some(x => /\b\d+\s*(matching\s*)?activit/i.test(x))) countsShown.push(key);
  }
  check('What If AI: the four choice questions show no activity counts beside options', countsShown.length === 0, countsShown.join(', ') || 'none shown');
  await go(page, 'what-if-ai.html#q=task&a=focus:teaching'); await page.waitForTimeout(40);
  const taskVals = await page.$$eval('#wizard input[name="q-task"]', is => is.map(i => i.value));
  const deadTasks = [];
  for (const v of taskVals) { await go(page, 'what-if-ai.html#a=focus:teaching;task:' + v); if ((await page.$$('#plan [data-card]')).length === 0) deadTasks.push(v); }
  check('What If AI: every option offered still leads to activities', taskVals.length > 1 && deadTasks.length === 0, taskVals.length + ' task options, dead: ' + (deadTasks.join(',') || 'none'));

  // keyboard: choose with arrows, advance, focus moves to the new question
  await go(page, 'what-if-ai.html');
  await page.focus('input[value="teaching"]');
  await page.keyboard.press('ArrowDown');
  const sel = await page.$eval('input[name="q-focus"]:checked', i => i.value);
  check('What If AI: options operate from the keyboard (arrow keys)', sel === 'research_own', 'selected ' + sel);
  await page.click('#next');
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('What If AI: focus moves to the new question heading', focused === 'qTitle', focused);

  // limits: every activity shown satisfies the rule-out
  await go(page, 'what-if-ai.html#a=focus:teaching;task:design;lim:noai');
  const shownIds = await page.$$eval('#plan [data-card]', cs => cs.map(c => c.getAttribute('data-card')));
  const BY = {}; ACTS.acts.forEach(a => BY[a.id] = a);
  check('What If AI: a rule-out removes every activity it names', shownIds.length > 0 && shownIds.every(i => BY[i].cap.includes('none_required') || !!BY[i].na), shownIds.length + ' checked');
  // gate: nothing that fails the admission test is recommended
  await go(page, 'what-if-ai.html#a=focus:teaching');
  const allShown = await page.$$eval('#plan [data-card]', cs => cs.map(c => c.getAttribute('data-card')));
  check('What If AI: activities that fail the admission test are never recommended', allShown.every(i => !['active', 'passive'].includes(BY[i].icap)));

  // deep links
  await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback');
  const n1 = (await page.$$('#plan [data-card]')).length;
  await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback');
  check('What If AI: a shared link restores the same results', n1 > 0 && n1 === (await page.$$('#plan [data-card]')).length, n1 + ' cards');
  await page.goto('about:blank'); await go(page, 'what-if-ai.html#a=focus:nonsense;task:<script>');
  check('What If AI: a malformed link falls back to the questions', await page.isVisible('#wizard .qpanel'));
  await go(page, 'what-if-ai.html#a=focus:admin;task:creative;lim:noai+nostudent+nopaid+noaccount+nokit+nodisclose+noapproval');
  check('What If AI: a very narrow answer set ends in results or a clear empty state',
    (await page.$$('#plan [data-card]')).length > 0 || await page.isVisible('#plan .empty'));

  // detail dialog: opens, shows provenance, Escape closes, focus returns
  await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback');
  const opener = await page.$('#plan [data-open]');
  const oid = await opener.getAttribute('data-open');
  await opener.click();
  check('What If AI: activity details open in a dialog', await page.$eval('#actDialog', d => d.open));
  const dtext = await page.textContent('#actDialog');
  check('What If AI: details carry source, license and attribution', /Source and license/.test(dtext) && dtext.includes(BY[oid].lic), BY[oid].lic);
  check('What If AI: details carry cautions before use', /Before you use it|How people and the AI tool divide the work/.test(dtext));
  check('What If AI: details no longer show the activity ID', !/Activity ID/i.test(dtext) && !dtext.includes(oid));
  const regLink = await page.$eval('#actDialog .idline a', a => ({ href: a.getAttribute('href'), text: a.textContent.trim() })).catch(() => null);
  check('What If AI: details end with "Open in The Register" linking to that activity', regLink && regLink.text === 'Open in The Register' && regLink.href === 'register.html#act=' + encodeURIComponent(oid), JSON.stringify(regLink));
  check('What If AI: no blank separator or dangling punctuation at the foot of details', (await page.$eval('#actDialog .idline', p => p.textContent.trim())) === 'Open in The Register');
  await page.keyboard.press('Escape');
  const back = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-open'));
  check('What If AI: Escape closes the dialog and returns focus to its opener', !(await page.$eval('#actDialog', d => d.open)) && back === oid);

  // field tags on result cards
  const tagInfo = await page.$$eval('#plan [data-card]', cs => cs.map(c => ({ id: c.getAttribute('data-card'), tags: [...c.querySelectorAll('.ftag')].map(t => t.textContent.trim()) })));
  check('What If AI: every result card shows at least one field tag', tagInfo.length > 0 && tagInfo.every(x => x.tags.length > 0), tagInfo.length + ' cards');
  check('What If AI: field tags match the activity\'s own field metadata', tagInfo.every(x => (BY[x.id].ft || []).length ? JSON.stringify(x.tags) === JSON.stringify(BY[x.id].ft) : x.tags[0] === 'Field not specified'));
  const crossMisuse = ACTS.acts.filter(a => (a.ft || []).includes('Cross-curricular') && a.ft.length > 1);
  check('What If AI: "Cross-curricular" is never combined with named fields', crossMisuse.length === 0, crossMisuse.length + ' misuses');
  const crossOk = ACTS.acts.filter(a => (a.ft || []).includes('Cross-curricular')).every(a => a.disc === 'interdisciplinary' || /discipline_general|interdisciplinary|Any course|Any field/.test(a.fld || ''));
  check('What If AI: "Cross-curricular" appears only where the record says so', crossOk);
  const multi = ACTS.acts.filter(a => (a.ft || []).length > 1).length;
  check('What If AI: multi-field activities carry each field', multi > 0, multi + ' multi-field activities');

  // walkthrough
  await go(page, 'what-if-ai.html');
  await page.click('.hdr [data-open-tour]');
  check('What If AI: the walkthrough opens from the header', await page.$eval('#tourDialog', d => d.open));
  const nSlides = (await page.$$('#tourDialog [data-slide]')).length;
  check('What If AI: the walkthrough has seven steps and shows its position', nSlides === 7 && (await page.textContent('#tourPos')) === '1 of 7', nSlides + ' / ' + await page.textContent('#tourPos'));
  await page.click('#tourNext');
  check('What If AI: Next moves to step 2 and announces it', (await page.textContent('#tourPos')) === '2 of 7' && await page.$eval('#tourDialog [data-slide]:nth-child(2)', s => !s.hidden && s.getAttribute('aria-label') === '2 of 7'));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  check('What If AI: arrow keys move through the walkthrough', (await page.textContent('#tourPos')) === '4 of 7');
  await page.click('#tourPrev');
  check('What If AI: Previous moves back', (await page.textContent('#tourPos')) === '3 of 7');
  await page.keyboard.press('End');
  check('What If AI: the last step offers Finish', (await page.textContent('#tourNext')).includes('Finish') && (await page.textContent('#tourPos')) === '7 of 7');
  const autoAdvance = await page.textContent('#tourPos'); await page.waitForTimeout(1200);
  check('What If AI: the walkthrough never advances by itself', (await page.textContent('#tourPos')) === autoAdvance);
  await page.click('#tourNext');
  const tourFocus = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-open-tour'));
  check('What If AI: Finish closes the walkthrough and returns focus to its button', !(await page.$eval('#tourDialog', d => d.open)) && tourFocus);
  await page.click('#wizard [data-open-tour]'); await page.keyboard.press('Escape');
  check('What If AI: Escape dismisses the walkthrough', !(await page.$eval('#tourDialog', d => d.open)));
  await page.goto('about:blank'); await go(page, 'what-if-ai.html#tour'); await page.waitForTimeout(80);
  check('What If AI: a #tour link opens the walkthrough', await page.$eval('#tourDialog', d => d.open));
  const artText = await page.$$eval('#tourDialog .tour__art svg text', t => t.length);
  check('What If AI: walkthrough illustrations carry no text and are hidden from assistive technology', artText === 0 && await page.$$eval('#tourDialog .tour__art', as => as.every(a => a.getAttribute('aria-hidden') === 'true')));

  // history: questions and results have addresses, so Back and Forward work
  await page.goto('about:blank'); await go(page, 'what-if-ai.html');
  await page.check('input[value="teaching"]'); await page.click('#next');
  check('What If AI: moving to a question gives it an address', /#q=task&a=focus:teaching/.test(page.url()), page.url().split('#')[1]);
  await page.goBack(); await page.waitForTimeout(80);
  check('What If AI: browser Back returns to the previous question with the answer kept',
    (await page.textContent('#qTitle')) === 'What are you working on?' && await page.isChecked('input[value="teaching"]'));
  await page.goForward(); await page.waitForTimeout(80);
  check('What If AI: browser Forward returns to the next question', (await page.textContent('#qTitle')) === 'What would you like to do?');
  const fwdFocus = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check('What If AI: after Back or Forward, focus is on the question heading', fwdFocus === 'qTitle', fwdFocus);
  await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback'); await page.waitForTimeout(40);
  await page.click('#redo'); await page.waitForTimeout(40);
  await page.goBack(); await page.waitForTimeout(80);
  check('What If AI: Back from “Change my answers” returns to the results', await page.isVisible('#plan [data-card]'));
  // an answer that no longer applies after an earlier change is cleared, not left hidden
  await go(page, 'what-if-ai.html#q=focus&a=focus:admin;task:creative'); await page.waitForTimeout(40);
  await page.check('input[value="teaching"]');
  const pruned = await page.evaluate(() => location.hash);
  const creativeTeach = ACTS.acts.some(a => a.focus === 'teaching' && a.task.includes('creative') && !['active','passive'].includes(a.icap));
  check('What If AI: changing the first answer clears a later answer that no longer applies', creativeTeach ? /task:creative/.test(pruned) : !/task:creative/.test(pruned), pruned);
  // a chip for level/setting opens the field question with a sensible position
  await go(page, 'what-if-ai.html#a=focus:teaching;lvl:grad'); await page.waitForTimeout(40);
  await page.click('#plan .answer:has-text("Level")');
  const qs = await page.textContent('.qstep');
  check('What If AI: the Level chip opens the field question with a real position', /Question [1-9] of [1-9]/.test(qs) && (await page.textContent('#qTitle')) === 'What is your field?', qs);

  // saved activities
  await page.evaluate(() => localStorage.clear());
  await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback');
  let saves = await page.$$('#plan button[data-save]');
  await saves[0].click();
  check('What If AI: Save marks the activity saved', (await saves[0].getAttribute('aria-pressed')) === 'true' && (await saves[0].textContent()).includes('Saved'));
  check('What If AI: saved count updates', (await page.textContent('.topbar [data-saved-count]')) === '1');
  await page.waitForTimeout(120);
  check('What If AI: saving is announced to assistive technology', /Saved:/.test(await page.textContent('#srStatus')), await page.textContent('#srStatus'));
  await saves[0].click();
  check('What If AI: pressing Save again unsaves (no duplicates)', (await page.textContent('.topbar [data-saved-count]')) === '0');
  await saves[0].click(); await saves[1].click(); await saves[2].click();
  const savedIds = await page.evaluate(() => SITE.Saved.ids());
  check('What If AI: saved list has no duplicates', new Set(savedIds).size === savedIds.length && savedIds.length === 3, savedIds.length + ' saved');
  await page.reload(); await page.waitForSelector('html[data-ready]', { state: 'attached' });
  check('What If AI: saved activities persist across a reload', (await page.textContent('.topbar [data-saved-count]')) === '3');
  await page.click('.topbar [data-open-saved]');
  check('What If AI: the saved drawer opens and lists the selection', await page.$eval('#savedDrawer', d => d.open) && (await page.$$('#savedBody .saved-item')).length === 3);
  await page.click('#savedBody [data-open]');
  check('What If AI: an activity opens from the saved drawer', await page.$eval('#actDialog', d => d.open));
  await page.keyboard.press('Escape');
  const inDrawer = await page.evaluate(() => !!document.activeElement.closest('#savedDrawer') && document.activeElement.hasAttribute('data-open'));
  check('What If AI: closing that activity returns focus to its View button in the drawer', inDrawer);
  await page.keyboard.press('Escape');
  const toSavedBtn = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-open-saved'));
  check('What If AI: closing the drawer returns focus to the Saved activities button', toSavedBtn);
  await page.click('.topbar [data-open-saved]');
  await page.click('#savedBody [data-unsave]');
  check('What If AI: an item can be removed from the drawer', (await page.$$('#savedBody .saved-item')).length === 2 && (await page.textContent('.topbar [data-saved-count]')) === '2');
  // print
  await page.evaluate(() => { window.__printed = 0; window.print = function () { window.__printed++; }; });
  await page.click('#printSaved');
  await page.waitForTimeout(150);
  const pr = await page.evaluate(() => ({ printed: window.__printed, arts: document.querySelectorAll('#printRoot article').length,
    buttons: document.querySelectorAll('#printRoot button').length, cls: document.body.classList.contains('print-saved') }));
  check('What If AI: Print builds a clean print view of exactly the saved activities', pr.printed === 1 && pr.arts === 2 && pr.buttons === 0, JSON.stringify(pr));
  await page.evaluate(() => document.body.classList.add('print-saved'));
  await page.emulateMedia({ media: 'print' });
  const pv = await page.evaluate(() => ({ app: getComputedStyle(document.querySelector('.app')).display,
    root: getComputedStyle(document.getElementById('printRoot')).display, top: getComputedStyle(document.querySelector('.topbar')).display,
    foot: getComputedStyle(document.querySelector('.site-foot')).display }));
  check('What If AI: in print, only the saved activities appear', pv.app === 'none' && pv.root === 'block' && pv.top === 'none' && pv.foot === 'none', JSON.stringify(pv));
  const prText = await page.textContent('#printRoot');
  check('What If AI: printed activities keep citation and license', /Source and license/.test(prText) && /License/.test(prText));
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.body.classList.remove('print-saved'));
  // clear all, with confirmation
  await page.click('.topbar [data-open-saved]');
  await page.click('#clearSaved');
  check('What If AI: Clear all asks for confirmation first', await page.isVisible('#clearConfirm') && (await page.textContent('.topbar [data-saved-count]')) === '2');
  await page.click('#clearYes');
  check('What If AI: confirmed Clear all empties the selection', (await page.textContent('.topbar [data-saved-count]')) === '0' && /No saved activities yet/.test(await page.textContent('#savedBody')));
  await page.keyboard.press('Escape');

  const guideIcons = await page.$$eval('a[href*="genaifacultystaff"]', as => as.map(a => (a.querySelector('use') || {}).getAttribute ? a.querySelector('use').getAttribute('href') : ''));
  check('What If AI: every link to the Gen AI Guide carries the robot icon', guideIcons.length >= 3 && guideIcons.every(h => h === '#i-robot'), guideIcons.join(' '));
  check('What If AI: no internal project language in the page', leaks(await page.evaluate(() => document.body.innerText)).length === 0,
    leaks(await page.evaluate(() => document.body.innerText)).join(', ') || 'clean');

  // ══════════════ The Register ══════════════
  await go(page, 'register.html');
  check('The Register: document title names the section', /The Register \| Lewis University Library$/.test(await page.title()), await page.title());
  check('The Register: display title', (await page.textContent('h1')).replace(/\s+/g, ' ').trim() === 'The Register');
  const navs = await page.$$eval('#secnav a', as => as.map(a => a.textContent.replace(/\d[\d,]*/g, '').trim()));
  check('The Register: five public sections, none of the removed ones',
    navs.length === 5 && !navs.some(t => /Platforms|Provenance|Held|Crosswalk|Method/.test(t)), navs.join(' | '));
  for (const s of ['activities', 'ai-types', 'policies', 'sources', 'about']) {
    await go(page, 'register.html#' + s); await page.waitForTimeout(60);
    const vis = await page.isVisible('#h-' + s);
    const cur = await page.$eval('#secnav a[aria-current="page"]', a => a.getAttribute('data-sec')).catch(() => '');
    check('The Register: section "' + s + '" renders and is marked current', vis && cur === s, cur);
    check('The Register: section "' + s + '" has no internal project language', leaks(await page.textContent('#' + s)).length === 0, leaks(await page.textContent('#' + s)).join(', ') || 'clean');
  }
  for (const [old, now] of [['platforms', 'ai-types'], ['provenance', 'sources'], ['held', 'about'], ['crosswalk', 'about'], ['method', 'about']]) {
    await go(page, 'register.html#' + old); await page.waitForTimeout(60);
    check('The Register: an old #' + old + ' address lands on "' + now + '"', await page.isVisible('#h-' + now));
  }
  // header: logo in the upper-left of the header, title centered on the page (both pages)
  for (const f of ['what-if-ai.html', 'register.html']) {
    await go(page, f); await page.waitForTimeout(60);
    const g = await page.evaluate(() => { const h = document.querySelector('header.hdr').getBoundingClientRect(), l = document.querySelector('.hdr__logo img').getBoundingClientRect(),
      t = document.querySelector('.hdr__title'), r = document.createRange(); r.selectNodeContents(t); const tr = r.getBoundingClientRect();
      return { logoLeft: l.left - h.left, logoTop: l.top - h.top, titleMid: (tr.left + tr.right) / 2, page: document.documentElement.clientWidth / 2, overlap: !(l.right < tr.left || l.bottom < tr.top) }; });
    check(f + ': the logo sits in the upper-left of the header', g.logoLeft < 60 && g.logoTop < 60, JSON.stringify({ l: Math.round(g.logoLeft), t: Math.round(g.logoTop) }));
    check(f + ': the title is centered on the page and clear of the logo', Math.abs(g.titleMid - g.page) < 6 && !g.overlap, Math.round(g.titleMid) + ' vs ' + g.page);
  }
  await go(page, 'register.html#activities');
  const regTotal = +(await page.textContent('#secnav [data-count="activities"]')).replace(/,/g, '');
  await go(page, 'what-if-ai.html#a='); await page.waitForTimeout(40);
  const finderTotal = +((await page.textContent('#plan .browse')).match(/Browse all (\d+)/) || [])[1];
  check('Both pages report the same activity total, derived from the published store', regTotal === ACTS.acts.length && finderTotal === ACTS.acts.length && ACTS.n === ACTS.acts.length && REGD.counts.activities === ACTS.acts.length,
    [regTotal, finderTotal, ACTS.n, REGD.counts.activities].join(' / '));
  const removedCls = ['original_synthesis', 'hybrid_synthesis', 'source_uncertain'];
  check('No published activity belongs to a removed provenance class', ACTS.acts.every(a => !removedCls.includes(a.cls)) && ACTS.origin.every(o => !removedCls.includes(o[0])) && REGD.origin.every(o => !removedCls.includes(o[0])));
  await go(page, 'register.html#sources'); await page.click('#sources details.card summary');
  const legendText = await page.textContent('#sources');
  check('The Register: the provenance legend no longer describes the removed classes', !/Original Synthesis|Hybrid Synthesis|Source Under Review|not fully traced/i.test(legendText));
  const removedId = 'CAN-A2-A-999-NOT-RELEASED';
  const liveIds = new Set(ACTS.acts.map(a => a.id)), workIds = new Set(REGD.works.map(w => w.id));
  check('Every source lists only published activities, and every activity\'s sources are listed', REGD.works.every(w => w.acts.length && w.acts.every(i => liveIds.has(i))) && ACTS.acts.every(a => (a.rel || []).every(r => workIds.has(r[0]))));
  await go(page, 'register.html#act=' + removedId); await page.waitForTimeout(80);
  check('The Register: a removed activity\'s address gets a plain message', await page.isVisible('#missingAct') && !(await page.$eval('#actDialog', d => d.open)));

  await go(page, 'register.html#activities');
  const cl = await page.textContent('#actCount');
  check('The Register: activity count equals the published collection', cl.includes('of ' + ACTS.acts.length), cl.trim());
  await page.selectOption('#f-cap', 'image_generation');
  const want = ACTS.acts.filter(a => a.cap.includes('image_generation')).length;
  check('The Register: filtering by kind of AI tool returns the right count', (await page.textContent('#actCount')).includes('of ' + want), want + ' expected');
  check('The Register: an active filter can be removed from its chip', !!(await page.$('.fchip[data-clear="cap"]')));
  await page.click('.fchip[data-clear="cap"]');
  check('The Register: removing the chip restores the full list', (await page.textContent('#actCount')).includes('of ' + ACTS.acts.length));
  // filters live in the address, survive an activity being opened and closed, and Back works
  await page.selectOption('#f-cap', 'image_generation'); await page.waitForTimeout(40);
  check('The Register: a filter change updates the address', /#activities\?cap=image_generation$/.test(page.url()), page.url().split('#')[1]);
  await page.click('#actResults [data-open]'); await page.waitForTimeout(60);
  check('The Register: opening an activity gives it an address', /#act=/.test(page.url()));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => /^#activities/.test(location.hash), null, { timeout: 3000 }).catch(() => {});
  check('The Register: closing it restores the filtered address and list', /#activities\?cap=image_generation$/.test(page.url()) && (await page.textContent('#actCount')).includes('of ' + want), page.url().split('#')[1]);
  const fback = await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-open'));
  check('The Register: focus returns to the activity\'s button, not the page heading', fback);
  await page.click('#actResults [data-open]'); await page.waitForTimeout(60);
  await page.goBack(); await page.waitForTimeout(120);
  check('The Register: browser Back closes the activity and keeps the filters', !(await page.$eval('#actDialog', d => d.open)) && /cap=image_generation/.test(page.url()));
  await page.click('#secnav a[data-sec="policies"]'); await page.waitForTimeout(60);
  await page.goBack(); await page.waitForTimeout(100);
  check('The Register: Back from another section returns to the filtered list', await page.isVisible('#h-activities') && (await page.textContent('#actCount')).includes('of ' + want));
  await page.goForward(); await page.waitForTimeout(100);
  check('The Register: Forward returns to that section', await page.isVisible('#h-policies'));
  await go(page, 'register.html#activities'); await page.click('.fchip[data-clear="cap"]').catch(() => {});
  // filters flow with the page: no scroll area of their own
  const fs1 = await page.$eval('#filters', f => ({ ov: getComputedStyle(f).overflowY, sh: f.scrollHeight, ch: f.clientHeight, pos: getComputedStyle(f).position, mh: getComputedStyle(f).maxHeight }));
  check('The Register: the filter panel has no inner scrollbar and is not a fixed-height sticky box', fs1.ov === 'visible' && fs1.sh <= fs1.ch + 1 && fs1.pos === 'static' && fs1.mh === 'none', JSON.stringify(fs1));
  await go(page, 'register.html#activities?pol=open&cost=1');
  const want2 = ACTS.acts.filter(a => a.pol === 'open' && ['no_tool_needed', 'free_tier', 'institution_provided'].includes(a.eq)).length;
  check('The Register: a filtered address restores those filters', (await page.textContent('#actCount')).includes('of ' + want2), want2 + ' expected');
  await page.goto('about:blank'); await go(page, 'register.html#activities');
  await page.fill('#gq', 'debate');
  await page.waitForTimeout(400);
  const nSearch = ACTS.acts.filter(a => (a.t + ' ' + a.sum + ' ' + (a.cit || '') + ' ' + (a.cr || '') + ' ' + (a.fld || '') + ' ' + (a.f || '') + ' ' + a.id + ' ' + (a.al || []).join(' ')).toLowerCase().includes('debate')).length;
  check('The Register: search finds activities', (await page.textContent('#actCount')).includes('of ' + nSearch), nSearch + ' expected');
  await page.click('#moreActs').catch(() => {});
  // AI system types
  await go(page, 'register.html#ai-types');
  const types = await page.$$('#ai-types article.type');
  check('The Register: platform-neutral AI system types replace the platform catalog', types.length === REGD.types.types.length + 1, types.length + ' types');
  const typeText = await page.textContent('#ai-types');
  check('The Register: type cards stay platform-neutral; products are inside their dialogs', !/ChatGPT|Claude|Gemini|Copilot|Perplexity|NotebookLM|Midjourney|ElevenLabs/.test(typeText));
  const typeState = await page.$$eval('#ai-types article.type', cards => cards.map(card => ({
    preview: !!card.querySelector('.type-preview')?.checkVisibility(),
    button: !!card.querySelector('button[data-open-type][aria-haspopup="dialog"]'),
    inlineDetails: !!card.querySelector('details')
  })));
  check('The Register: type cards show compact descriptions and open a dialog', typeState.every(t => t.preview && t.button && !t.inlineDetails));
  await page.focus('[data-open-type="conversational"]'); await page.keyboard.press('Enter');
  check('The Register: a type opens from the keyboard with full details visible',
    await page.isVisible('#aiTypeDialog .type-info dl') && await page.textContent('#aiTypeDialogTitle') === REGD.types.types[0].name);
  check('The Register: current examples start collapsed in the type dialog',
    !(await page.$eval('#aiTypeDialog details', d => d.open)) && !(await page.isVisible('#aiTypeDialog .type-example')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(60);
  check('The Register: closing a type restores focus to its card',
    !(await page.$eval('#aiTypeDialog', d => d.open)) && (await page.evaluate(() => document.activeElement.getAttribute('data-open-type'))) === 'conversational');
  const navIcon = await page.$eval('#secnav a[data-sec="ai-types"] use', u => u.getAttribute('href'));
  check('The Register: Types of AI systems uses the robot icon', navIcon === '#i-robot', navIcon);
  check('The Register: "Whatever the tool" is a console panel separate from the cards', !!(await page.$('#ai-types .protocols #h-protocols')) && (await page.textContent('#h-protocols')) === 'Whatever the tool' && (await page.$$('#ai-types .protocols__list li')).length === REGD.types.general.length);
  await page.click('[data-open-type="image"]');
  await page.click('#aiTypeDialog a[href="#activities?cap=image_generation"]');
  await page.waitForTimeout(80);
  check('The Register: "see activities" from a type lands on the filtered list', (await page.textContent('#actCount')).includes('of ' + want));
  // policies
  await go(page, 'register.html#policies');
  const tabs = await page.$$('#policies [role="tab"]');
  check('The Register: policy spectrum has four positions as tabs', tabs.length === 4);
  await tabs[0].focus(); await page.keyboard.press('ArrowRight');
  const selTab = await page.$eval('#policies [role="tab"][aria-selected="true"]', b => b.getAttribute('data-pol'));
  const focusTab = await page.evaluate(() => document.activeElement.getAttribute('data-pol'));
  check('The Register: arrow keys move between policy positions', selTab === 'conditional' && focusTab === 'conditional', selTab);
  check('The Register: each position shows attributed, licensed examples', (await page.$$('#pp .quotes li')).length > 0 && /CC|Public Domain/.test(await page.textContent('#pp')));
  // sources
  await go(page, 'register.html#sources');
  check('The Register: every source is listed', (await page.$$('#sources .srclist > li')).length === REGD.works.length, REGD.works.length + ' works');
  // sources are filed alphabetically by the surname (or group name) their citation starts with
  const shownOrder = await page.$$eval('#sources .srclist > li', ls => ls.map(l => l.id.slice(4)));
  const W = {}; REGD.works.forEach(w => W[w.id] = w);
  const keys = shownOrder.map(id => W[id].sk);
  check('The Register: sources are in alphabetical order by surname', keys.every((k, i) => i === 0 || keys[i - 1] <= k), keys.length + ' sources');
  const letterOfCit = cit => { const w = REGD.works.find(x => x.cit.startsWith(cit)); return w && w.lt; };
  const filed = [['Ashley Fansher', 'F'], ['Antonio Julio López-Galisteo', 'L'], ['Naomi E. Winstone', 'W'], ['AI Pedagogy Project', 'A'], ['The Carpentries', 'C'], ['Abegglen, S.', 'A']];
  const misfiled = filed.filter(([c, l]) => letterOfCit(c) && letterOfCit(c) !== l);
  check('The Register: first-name-first citations file under the surname; group authors under their names', misfiled.length === 0, JSON.stringify(misfiled));
  const headsOk = await page.$$eval('#sources .letterhead', hs => hs.map(h => h.textContent));
  check('The Register: letter headings run A to Z', headsOk.every((h, i) => i === 0 || headsOk[i - 1] < h || headsOk[i - 1] === '#'), headsOk.join(''));
    const w0 = REGD.works[5];
  await go(page, 'register.html#src=' + w0.id); await page.waitForTimeout(80);
  check('The Register: a source address highlights that source', await page.$eval('#src-' + w0.id, li => li.classList.contains('is-target')));
  // activity addresses
  const a0 = ACTS.acts[10];
  await go(page, 'register.html#act=' + a0.id); await page.waitForTimeout(80);
  check('The Register: #act= opens that activity', await page.$eval('#actDialog', d => d.open) && (await page.textContent('#actDialogTitle')) === a0.t, a0.id);
  const withAlias = ACTS.acts.find(a => a.al && a.al.length);
  await go(page, 'register.html#act=' + withAlias.al[0]); await page.waitForTimeout(80);
  check('The Register: an earlier identifier opens the current activity', (await page.textContent('#actDialogTitle')) === withAlias.t, withAlias.al[0] + ' → ' + withAlias.id);
  const heldId = 'CAN-XX-NOT-PUBLISHED';
  await go(page, 'register.html#act=' + heldId); await page.waitForTimeout(80);
  check('The Register: an unpublished identifier gets a plain message, not a dead end', await page.isVisible('#missingAct'), heldId);
  // from a record to its source
  const withRel = ACTS.acts.find(a => a.rel && a.rel.length);
  await go(page, 'register.html#act=' + withRel.id); await page.waitForTimeout(80);
  await page.click('#actDialog a[href*="#src="]'); await page.waitForTimeout(120);
  check('The Register: a record links to the works it draws on', !(await page.$eval('#actDialog', d => d.open)) && await page.isVisible('#src-' + withRel.rel[0][0]));
  // shared saved list
  await go(page, 'register.html#activities');
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('html[data-ready]', { state: 'attached' });
  await page.click('#activities button[data-save]');
  check('The Register: activities can be saved here too', (await page.textContent('.topbar [data-saved-count]')) === '1');

  // ══════════════ phones ══════════════
  const m = await createContext(browser, { viewport: { width: 390, height: 844 } }); const mp = await m.newPage();
  mp.on('pageerror', e => errors.push(e.message));
  for (const [label, u] of [['What If AI questions', 'what-if-ai.html'], ['What If AI results', 'what-if-ai.html#a=focus:teaching;task:design'],
                            ['Register activities', 'register.html#activities'], ['Register AI types', 'register.html#ai-types'],
                            ['Register policies', 'register.html#policies'], ['Register sources', 'register.html#sources'], ['Register how to use', 'register.html#about']]) {
    await go(mp, u); await mp.waitForTimeout(120);
    const o = await overflow(mp);
    check('Phone: ' + label + ' fits the width', o <= 0, o + 'px');
  }
  await go(mp, 'register.html#activities');
  check('Phone: filters start collapsed behind a labeled toggle', !(await mp.isVisible('#filters')) && (await mp.getAttribute('#filtersToggle', 'aria-expanded')) === 'false');
  await mp.click('#filtersToggle');
  check('Phone: the toggle opens the filters', await mp.isVisible('#filters') && (await mp.getAttribute('#filtersToggle', 'aria-expanded')) === 'true');
  await go(mp, 'what-if-ai.html#a=focus:teaching;task:feedback');
  await mp.click('#plan [data-open]');
  const dlgW = await mp.$eval('#actDialog', d => d.getBoundingClientRect().width);
  check('Phone: activity details use the full screen', dlgW >= 380, Math.round(dlgW) + 'px');
  await mp.keyboard.press('Escape');
  await go(mp, 'what-if-ai.html'); await mp.click('.hdr [data-open-tour]');
  const tb = await mp.evaluate(() => { const d = document.getElementById('tourDialog'); return { w: d.getBoundingClientRect().width, sw: d.querySelector('.dlg__body').scrollWidth - d.querySelector('.dlg__body').clientWidth }; });
  await mp.click('#tourNext');
  check('Phone: the walkthrough fits the screen and works', tb.w <= 390 && tb.sw <= 0 && (await mp.textContent('#tourPos')) === '2 of 7', JSON.stringify(tb));
  const hdrPhone = await mp.evaluate(() => { const l = document.querySelector('.hdr__logo img').getBoundingClientRect(), t = document.querySelector('.hdr__title').getBoundingClientRect(); return l.bottom <= t.top + 1; });
  check('Phone: the logo moves above the title rather than overlapping it', hdrPhone);
  await m.close();

  // ══════════════ 200% zoom (reflow) ══════════════
  const z = await createContext(browser, { viewport: { width: 640, height: 450 } }); const zp = await z.newPage();
  for (const u of ['what-if-ai.html', 'register.html#activities', 'register.html#policies', 'register.html#ai-types', 'what-if-ai.html#tour']) {
    await go(zp, u); await zp.waitForTimeout(100);
    const o = await overflow(zp);
    check('Reflow at 200% zoom (1280px screen): ' + u + ' needs no horizontal scrolling', o <= 0, o + 'px');
  }
  await z.close();

  // cross-page transitions, and Back across them
  await page.goto('about:blank'); await go(page, 'what-if-ai.html#a=focus:teaching;task:feedback');
  const xid = await page.getAttribute('#plan [data-open]', 'data-open');
  await page.click('#plan [data-open]'); await page.click('#actDialog .dlg__foot a[href^="register.html#act="]'); await page.waitForLoadState('load'); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await page.waitForTimeout(150);
  check('Cross-page: "Open in The Register" opens the same activity there', /register\.html#act=/.test(page.url()) && await page.$eval('#actDialog', d => d.open) && (await page.textContent('#actDialogTitle')) === BY[xid].t);
  await page.goBack(); await page.waitForLoadState('load'); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await page.waitForTimeout(150);
  check('Cross-page: Back returns to the same What If AI results', /what-if-ai\.html#a=focus:teaching;task:feedback/.test(page.url()) && await page.isVisible('#plan [data-card]'));
  await page.click('#plan .browse a'); await page.waitForLoadState('load'); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await page.waitForTimeout(120);
  check('Cross-page: "Browse all … in The Register" lands on its activities', /register\.html#activities$/.test(page.url()) && await page.isVisible('#h-activities'));
  await go(page, 'register.html#about'); await page.click('#about a[href="what-if-ai.html#tour"]'); await page.waitForLoadState('load'); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await page.waitForTimeout(150);
  check('Cross-page: The Register\'s walkthrough link opens the walkthrough in What If AI', await page.$eval('#tourDialog', d => d.open));
  await page.focus('#tourNext'); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('tourDialog').open && location.hash !== '#tour', null, { timeout: 2000 }).catch(() => {});
  check('Cross-page: closing a walkthrough opened by link leaves a clean address', !/#tour/.test(page.url()), page.url().split('/').pop());
  await go(page, 'register.html#activities'); await page.click('#activities a[href="what-if-ai.html"]'); await page.waitForLoadState('load'); await page.waitForSelector('html[data-ready]', { state: 'attached' });
  check('Cross-page: "Try What If AI" opens the first question', await page.isVisible('#qTitle') && (await page.textContent('#qTitle')) === 'What are you working on?');
  const localLinks = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(https?:|mailto:|#)/.test(h)));
  check('Local links point only at the two pages', localLinks.every(h => /^(what-if-ai|register)\.html(#.*)?$/.test(h)), [...new Set(localLinks)].join(' '));
  const useRefs = await page.evaluate(() => [...document.querySelectorAll('use')].map(u => u.getAttribute('href')).filter(h => !document.getElementById(h.slice(1))));
  check('Every icon reference resolves to a symbol in the page', useRefs.length === 0, useRefs.join(' ') || 'all resolve');

    // the pulse of current: sparse, transform/opacity only, gone with reduced motion
  const cur = await page.evaluate(() => [...document.querySelectorAll('.current')].map(c => { const s = getComputedStyle(c, '::before'); return { anim: s.animationName, dur: parseFloat(s.animationDuration), pos: getComputedStyle(c).position }; }));
  check('Current pulses are few, slow and positioned out of flow', cur.length > 0 && cur.length <= 6 && cur.every(c => c.anim === 'lab-current' && c.dur >= 14 && c.pos === 'absolute'), JSON.stringify(cur.map(c => c.dur)));
  const rm = await createContext(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const rp = await rm.newPage();
  await go(rp, 'what-if-ai.html');
  check('Reduced motion removes the moving light', await rp.$$eval('.current', cs => cs.every(c => getComputedStyle(c).display === 'none')));
  await rm.close();
  const hc = await createContext(browser, { viewport: { width: 1440, height: 900 } }); const hp = await hc.newPage();
  await hp.emulateMedia({ contrast: 'more' }); await go(hp, 'register.html#ai-types');
  check('More-contrast mode removes the decoration', await hp.$$eval('.current, .lamps', cs => cs.every(c => getComputedStyle(c).display === 'none')));
  await hc.close();

  check('no page errors or console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close(); await SRV.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
