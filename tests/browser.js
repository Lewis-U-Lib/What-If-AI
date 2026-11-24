// Keep browser checks independent of the analytics service and out of real reports.
// The site checks separately exercise the script and reporting endpoint under CSP.
const { analytics } = require('../site.json');

async function createContext(browser, options) {
  const context = await browser.newContext(options);
  // SITE_THEME=blue or SITE_THEME=light runs any browser check against that palette, as a reader who chose it would see the pages.
  if (process.env.SITE_THEME === 'blue' || process.env.SITE_THEME === 'light') {
    await context.addInitScript(theme => { try { localStorage.setItem('lul-whatifai-theme-v1', theme); } catch (_) { /* storage blocked by the test */ } }, process.env.SITE_THEME);
  }
  // SITE_PLAIN=1 runs any browser check in the plain reading view (with either palette).
  if (process.env.SITE_PLAIN === '1') {
    await context.addInitScript(() => { try { localStorage.setItem('lul-whatifai-plain-v1', '1'); } catch (_) { /* storage blocked by the test */ } });
  }
  await context.route(analytics.script_url, route => route.fulfill({
    contentType: 'application/javascript', body: '/* Analytics disabled in automated checks. */',
  }));
  return context;
}

module.exports = { createContext };
