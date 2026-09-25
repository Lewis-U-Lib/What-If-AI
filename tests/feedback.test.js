/* Real form interaction and actual intake payloads, intercepted before they leave
 * the browser. Test a production hostname against the local build so the domain
 * guard is exercised without sending fabricated responses to the live account. */
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');
const path = require('path');
const fs = require('fs');
const CFG = require('../site.json');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const endpoint = CFG.analytics.host_url + '/api/send';
const receiptsKey = 'lul-whatifai-feedback-v1';
let count = 0;
function check(name, condition) { if (!condition) throw new Error(name); count++; console.log('PASS ' + name); }
const fixture = 'window.umami = { track: function(){}, getSession: function(){ return {}; } };';

(async () => {
  const server = await start({ dir: SITE });
  const browser = await chromium.launch();
  try {
    for (const file of ['what-if-ai.html', 'register.html']) {
      const ctx = await createContext(browser, { viewport: { width: 1440, height: 1000 } });
      await ctx.route(CFG.base_url + '**', async route => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: server.origin + url.pathname + url.search });
        await route.fulfill({ response });
      });
      await ctx.route(CFG.analytics.script_url, route => route.fulfill({ contentType: 'application/javascript', body: fixture }));
      const reports = [], errors = [];
      let responseStatus = 200, responseBody = '{"cache":"test-acknowledgment"}', delay = 0;
      await ctx.route(endpoint, async route => {
        reports.push(route.request().postDataJSON());
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        await route.fulfill({ status: responseStatus, contentType: 'application/json', body: responseBody, headers: { 'Access-Control-Allow-Origin': '*' } });
      });
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { window.__violations = []; document.addEventListener('securitypolicyviolation', e => window.__violations.push(e.effectiveDirective)); });
      await page.goto(CFG.base_url + file + '?ignored=search#a=focus:teaching;task:feedback');
      await page.waitForSelector('html[data-ready]', { state: 'attached' });
      const ids = await page.evaluate(() => SITE.A.slice(0, 8).map(a => a.id));
      async function open(id) { await page.evaluate(id => SITE.openActivity(id), id); await page.locator('[data-give-feedback]').click(); }
      const form = page.locator('.activity-feedback');
      const submit = form.locator('[type="submit"]');
      async function choice(value) { await form.locator('[name="activity-response"][value="' + value + '"]').check(); }
      async function sent() { await form.getByRole('status').filter({ hasText: 'your feedback was sent' }).waitFor(); }
      await open(ids[0]);
      check(file + ': five native radios, no default answer and no automatic event', await form.locator('[name="activity-response"]').count() === 5 && await form.locator('input:checked').count() === 0 && reports.length === 0 && await submit.isDisabled());
      check(file + ': the footer shortcut focuses the first choice', await form.locator('[name="activity-response"]').first().evaluate(e => e === document.activeElement));
      check(file + ': jumping to feedback keeps the dialog title and footer in view', await page.locator('#actDialog').evaluate(d => {
        const dialog = d.getBoundingClientRect(), head = d.querySelector('.dlg__head').getBoundingClientRect(), foot = d.querySelector('.dlg__foot').getBoundingClientRect();
        return d.scrollTop === 0 && head.top >= dialog.top && foot.bottom <= dialog.bottom;
      }));
      await page.keyboard.press('ArrowDown');
      check(file + ': keyboard selection does not submit', await form.locator('[value="considering"]').isChecked() && reports.length === 0);
      await choice('used');
      check(file + ': use outcome appears only for a used activity', await form.locator('[data-followup="used"]').isVisible() && !await form.locator('[data-followup="not_fit"]').isVisible());
      await form.locator('[value="mixed"]').check();
      await choice('not_fit');
      check(file + ': changing branch clears and disables the hidden outcome', await form.locator('[value="mixed"]').isDisabled() && !await form.locator('[value="mixed"]').isChecked() && await form.locator('[data-followup="not_fit"]').isVisible());
      await form.locator('[value="access"]').check();
      await form.locator('[data-followup="not_fit"] [data-clear-followup]').click();
      check(file + ': an optional follow-up can be cleared', !await form.locator('[value="access"]').isChecked());
      await choice('used'); await form.locator('[value="worked_well"]').check();
      delay = 300;
      await submit.click();
      check(file + ': pending submission disables duplicate clicks', await submit.isDisabled() && await form.locator('[value="used"]').isDisabled());
      await form.evaluate(f => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      await sent(); delay = 0;
      check(file + ': one acknowledged response uses the stable activity ID and valid follow-up', reports.length === 1 && reports[0].type === 'event' && reports[0].payload.name === 'activity-feedback' && reports[0].payload.data.activity_id === ids[0] && reports[0].payload.data.response === 'used' && reports[0].payload.data.outcome === 'worked_well' && !('reason' in reports[0].payload.data));
      check(file + ': response payload contains no query, fragment, free text or custom identity', reports[0].payload.url === new URL(CFG.base_url + file).pathname && !('id' in reports[0].payload) && Object.keys(reports[0].payload.data).sort().join(',') === 'activity_id,outcome,response,surface');
      await page.reload(); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await open(ids[0]);
      check(file + ': reload restores the receipt and prevents identical resubmission', await form.locator('[value="used"]').isChecked() && await form.locator('[value="worked_well"]').isChecked() && await submit.isDisabled());
      await choice('planning'); await submit.click(); await sent();
      check(file + ': a changed answer is an update, with no stale outcome', reports.length === 2 && reports[1].payload.name === 'activity-feedback-updated' && reports[1].payload.data.previous_response === 'used' && reports[1].payload.data.response === 'planning' && !('outcome' in reports[1].payload.data));
      await open(ids[1]); await choice('not_fit'); await submit.click(); await sent();
      check(file + ': follow-up is optional and receipt is specific to its activity', reports.length === 3 && reports[2].payload.name === 'activity-feedback' && reports[2].payload.data.activity_id === ids[1] && !('reason' in reports[2].payload.data));
      await choice('not_fit'); await form.locator('[value="time"]').check(); await submit.click(); await sent();
      check(file + ': a reason is sent only for the not-fit response', reports[3].payload.data.reason === 'time' && !('outcome' in reports[3].payload.data));
      await open(ids[2]); await choice('exploring'); responseStatus = 503;
      await submit.click(); await form.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
      check(file + ': failure is honest, keeps the selection and allows retry', !await submit.isDisabled() && await form.locator('[value="exploring"]').isChecked() && !await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) || '{}')[id], { key: receiptsKey, id: ids[2] }));
      responseStatus = 200; await submit.click(); await sent();
      check(file + ': retry succeeds without mislabeling the response as an update', reports.at(-1).payload.name === 'activity-feedback');
      await open(ids[3]); await choice('considering'); responseBody = '{"disabled":true}';
      await submit.click(); await form.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
      check(file + ': service-disabled reply is not reported as successful', !await submit.isDisabled());
      responseBody = '{"beep":"boop"}';
      await submit.click(); await form.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
      check(file + ': an ignored request is not mistaken for an acknowledged response', !await submit.isDisabled() && !await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) || '{}')[id], { key: receiptsKey, id: ids[3] }));
      responseBody = '{"cache":"test-acknowledgment"}';
      const beforeBlocked = reports.length;
      await page.evaluate(() => { localStorage.setItem('umami.disabled', '1'); });
      await submit.click(); await form.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
      check(file + ': Umami opt-out prevents a request', reports.length === beforeBlocked);
      await page.evaluate(() => { localStorage.removeItem('umami.disabled'); window.umami = undefined; });
      await submit.click(); await form.getByRole('status').filter({ hasText: 'couldn’t be sent' }).waitFor();
      check(file + ': a blocked tracker is not bypassed', reports.length === beforeBlocked);
      await page.evaluate(fixture);
      await open(ids[4]); await choice('planning'); delay = 400; await submit.click();
      await open(ids[5]);
      await page.waitForTimeout(600); delay = 0;
      check(file + ': completing another activity does not alter the current form', await form.locator('input:checked').count() === 0 && await form.getByRole('status').innerText() === '');
      // A receipt is shared across the two tools, without creating a visitor ID.
      const other = file === 'what-if-ai.html' ? 'register.html' : 'what-if-ai.html';
      await page.goto(CFG.base_url + other); await page.waitForSelector('html[data-ready]', { state: 'attached' }); await open(ids[0]);
      check(file + ': the other tool restores the same activity response', await form.locator('[value="planning"]').isChecked() && await submit.isDisabled());
      await page.evaluate(id => { SITE.Saved.add(id); window.print = function(){}; SITE.printSaved(); window.dispatchEvent(new Event('afterprint')); }, ids[0]);
      check(file + ': feedback is excluded from printed activities', await page.locator('#printRoot .activity-feedback').count() === 0);
      await open(ids[6]);
      await page.evaluate(() => { Storage.prototype.setItem = function(){ throw new Error('Storage unavailable'); }; });
      await choice('considering'); await submit.click(); await sent();
      await open(ids[6]);
      check(file + ': unavailable storage still prevents repeats during this page visit', await form.locator('[value="considering"]').isChecked() && await submit.isDisabled());
      await open(ids[0]); await choice('exploring'); await submit.click(); await sent(); await open(ids[0]);
      check(file + ': an in-memory update takes precedence when an old receipt cannot be overwritten', await form.locator('[value="exploring"]').isChecked() && await submit.isDisabled());
      // Native controls must work on desktop, narrow screens, and in forced colors.
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        for (const state of ['planning', 'used', 'not_fit']) {
          await open(ids[7]); await choice(state);
          await form.scrollIntoViewIfNeeded();
          const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
          check(file + ': accessible ' + state + ' feedback at ' + width + 'px', audit.violations.length === 0);
          const fits = await form.evaluate(f => f.scrollWidth <= f.clientWidth + 1 && f.closest('.dlg__body').scrollWidth <= f.closest('.dlg__body').clientWidth + 1);
          check(file + ': no horizontal overflow for ' + state + ' at ' + width + 'px', fits);
          check(file + ': the dialog frame stays fixed for ' + state + ' at ' + width + 'px', await page.locator('#actDialog').evaluate(d => d.scrollTop === 0));
        }
        if (process.env.FEEDBACK_SHOTS) {
          fs.mkdirSync(process.env.FEEDBACK_SHOTS, { recursive: true });
          await page.screenshot({ path: path.join(process.env.FEEDBACK_SHOTS, file.replace('.html','') + '-' + width + '.png') });
        }
      }
      await page.emulateMedia({ forcedColors: 'active' });
      check(file + ': radios remain visible in forced colors', await form.locator('[value="not_fit"]').isVisible());
      check(file + ': no script errors or CSP violations', errors.length === 0 && (await page.evaluate(() => window.__violations)).length === 0);
      await ctx.close();
    }
    const local = await createContext(browser);
    await local.route(CFG.analytics.script_url, route => route.fulfill({ contentType: 'application/javascript', body: fixture }));
    let localReports = 0;
    await local.route(endpoint, route => { localReports++; return route.fulfill({ contentType: 'application/json', body: '{}' }); });
    const page = await local.newPage();
    await page.goto(server.url('register.html')); await page.waitForSelector('html[data-ready]', { state: 'attached' });
    await page.evaluate(() => SITE.openActivity(SITE.A[0].id));
    await page.locator('[data-give-feedback]').click();
    await page.locator('[name="activity-response"][value="exploring"]').check();
    await page.locator('.activity-feedback [type="submit"]').click();
    await page.locator('.activity-feedback [role="status"]').filter({ hasText: 'couldn’t be sent' }).waitFor();
    check('local previews cannot submit feedback to the production account', localReports === 0);
    await local.close();
    console.log('\n' + count + '/' + count + ' feedback checks passed');
  } finally { await browser.close(); await server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
