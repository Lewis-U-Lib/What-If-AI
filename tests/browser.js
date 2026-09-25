// Keep browser checks independent of the analytics service and out of real reports.
// The site checks separately exercise the script and reporting endpoint under CSP.
const { analytics } = require('../site.json');

async function createContext(browser, options) {
  const context = await browser.newContext(options);
  await context.route(analytics.script_url, route => route.fulfill({
    contentType: 'application/javascript', body: '/* Analytics disabled in automated checks. */',
  }));
  return context;
}

module.exports = { createContext };
