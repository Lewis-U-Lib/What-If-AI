// Keep browser checks independent of the analytics service and out of real reports.
// The site checks separately exercise the script and reporting endpoint under CSP.
const { analytics } = require('../site.json');

async function createContext(browser, options) {
  const context = await browser.newContext(options);
  // SITE_THEME=teal runs any browser check against the teal palette, as a reader who chose it would see the pages.
  if (process.env.SITE_THEME === 'teal') {
    await context.addInitScript(() => { try { localStorage.setItem('lul-whatifai-theme-v1', 'teal'); } catch (_) { /* storage blocked by the test */ } });
  }
  await context.route(analytics.script_url, route => route.fulfill({
    contentType: 'application/javascript', body: '/* Analytics disabled in automated checks. */',
  }));
  return context;
}

module.exports = { createContext };
