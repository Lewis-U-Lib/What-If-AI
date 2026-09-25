/* Checks that exist because the site is now many files instead of two:
 * fingerprinting, determinism, the Content-Security-Policy, same-origin loading,
 * the loading and failure states, the landing and 404 pages, and page weight.
 *   node tests/site.test.js            (after python3 tools/build.py)
 */
const { chromium } = require('playwright');
const { createContext } = require('./browser');
const { AxeBuilder } = require('@axe-core/playwright');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { start, BASE } = require('./serve');

const ROOT = path.join(__dirname, '..');
const SITE = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const results = [];
function check(name, ok, detail) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '')); }
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function walk(d, base = d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]); }
const PAGES = ['index.html', 'what-if-ai.html', 'register.html', '404.html'];
const html = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const CFG = require('../site.json');
const ANALYTICS = CFG.analytics;

(async () => {
  // ── static
  const files = walk(SITE);
  const hashed = files.filter(f => /\.[0-9a-f]{10}\.\w+$/.test(f));
  check('every fingerprinted file name matches its content', hashed.every(f => sha(fs.readFileSync(path.join(SITE, f))).slice(0, 10) === f.match(/\.([0-9a-f]{10})\.\w+$/)[1]), hashed.length + ' files');
  const refs = PAGES.flatMap(p => [...html(p).matchAll(/(?:href|src)="([^"#?]+)"/g)].map(m => m[1]))
    .concat(PAGES.flatMap(p => { const m = /<script id="site-manifest" type="application\/json">([\s\S]*?)<\/script>/.exec(html(p)); return m ? Object.values(JSON.parse(m[1]).data).concat(JSON.parse(m[1]).scripts) : []; }))
    .filter(r => !/^(https?:|mailto:)/.test(r)).map(r => r.startsWith(BASE) ? r.slice(BASE.length) : r).filter(Boolean);
  const cssRefs = files.filter(f => f.endsWith('.css')).flatMap(f => [...fs.readFileSync(path.join(SITE, f), 'utf8').matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/g)].map(m => (m[1] ?? m[2] ?? m[3]).trim()).filter(u => !/^(data:|#|https?:)/.test(u)).map(u => path.normalize(path.join(path.dirname(f), u))));
  const missing = [...new Set(refs.concat(cssRefs))].filter(r => !fs.existsSync(path.join(SITE, r)));
  check('every local file a page or stylesheet refers to exists', missing.length === 0, missing.join(' ') || (new Set(refs.concat(cssRefs))).size + ' references');
  const inlineScripts = PAGES.flatMap(p => [...html(p).matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>/g)].map(m => p + ': ' + m[0]));
  check('no inline script anywhere (only JSON data blocks and external files)', inlineScripts.length === 0, inlineScripts.join(' '));
  const styleAttrs = PAGES.flatMap(p => (html(p).match(/\sstyle="/g) || []).map(() => p)).concat(
    files.filter(f => f.endsWith('.js')).flatMap(f => (fs.readFileSync(path.join(SITE, f), 'utf8').match(/style="/g) || []).map(() => f)));
  check('no inline style attributes in pages or generated markup', styleAttrs.length === 0, styleAttrs.join(' '));
  check('every page declares the Content-Security-Policy', PAGES.every(p => /<meta http-equiv="Content-Security-Policy" content="default-src &#x27;self&#x27;; script-src &#x27;self&#x27;/.test(html(p))));
  const release = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'release.json'), 'utf8'));
  check('data files are the release, unchanged, under fingerprinted names', ['acts', 'register', 'guide'].every(n => {
    const f = files.find(x => x.startsWith('data/' + n + '.')); return f && sha(fs.readFileSync(path.join(SITE, f))) === release.files[n + '.json'].sha256; }));
  check('.nojekyll, robots.txt, sitemap.xml and version.json are present', ['.nojekyll', 'robots.txt', 'sitemap.xml', 'version.json'].every(f => files.includes(f)));
  const v = JSON.parse(fs.readFileSync(path.join(SITE, 'version.json'), 'utf8'));
  check('version.json names the release and the pipeline commit it came from', v.release === release.release && v.pipeline_commit === release.source.commit, v.release + ' @ ' + v.pipeline_commit.slice(0, 7));

  // determinism: two builds of the same inputs are byte-identical
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wia-')), t1 = path.join(tmp, 'a'), t2 = path.join(tmp, 'b');
  execFileSync('python3', [path.join(ROOT, 'tools', 'build.py'), '--out', t1], { stdio: 'ignore' });
  execFileSync('python3', [path.join(ROOT, 'tools', 'build.py'), '--out', t2], { stdio: 'ignore' });
  const f1 = walk(t1).sort(), f2 = walk(t2).sort();
  check('two builds of the same inputs are byte-identical', JSON.stringify(f1) === JSON.stringify(f2) && f1.every(f => sha(fs.readFileSync(path.join(t1, f))) === sha(fs.readFileSync(path.join(t2, f)))), f1.length + ' files');
  fs.rmSync(tmp, { recursive: true, force: true });

  // ── in the browser
  const srv = await start({ dir: SITE });
  const browser = await chromium.launch();
  const ctx = await createContext(browser, { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const foreign = [], violations = [], errors = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.origin !== new URL(srv.origin).origin && !/^(data|about):/.test(r.url())) foreign.push(r.url()); });
  page.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => { (window.__csp = window.__csp || []).push(e.violatedDirective + ' ' + e.blockedURI); }));
  let bytes = {};
  page.on('response', async r => { try { const b = await r.body(); bytes[page.url().split('/').pop().split('#')[0] || 'index'] = (bytes[page.url().split('/').pop().split('#')[0] || 'index'] || 0) + b.length; } catch (_) {} });
  for (const f of ['', 'what-if-ai.html#a=focus:teaching;task:feedback', 'register.html#activities', 'register.html#sources']) {
    await page.goto(srv.url(f)); await page.waitForTimeout(1200);
    const csp = await page.evaluate(() => window.__csp || []); violations.push(...csp.map(c => (f || 'index') + ': ' + c));
  }
  const unexpected = foreign.filter(u => u !== ANALYTICS.script_url);
  check('only the Umami tracker is requested externally before Ask Us is opened', unexpected.length === 0 && foreign.includes(ANALYTICS.script_url), unexpected.slice(0, 3).join(' '));
  check('no Content-Security-Policy violations while using the pages', violations.length === 0, violations.slice(0, 3).join(' | '));
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  // Use a fixture to verify the real page's script/connect CSP exceptions without
  // sending test visits to Umami or requiring the service to be available in CI.
  const analyticsCtx = await createContext(browser);
  const analyticsPage = await analyticsCtx.newPage();
  const reports = [];
  const endpoint = ANALYTICS.host_url + '/api/send';
  await analyticsPage.route(ANALYTICS.script_url, route => route.fulfill({
    contentType: 'application/javascript',
    body: `const tracker = document.currentScript;
      fetch(tracker.dataset.hostUrl + '/api/send', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: tracker.dataset.websiteId })
      }).then(r => r.json()).then(() => { window.__analyticsSent = true; });`,
  }));
  await analyticsPage.route(endpoint, route => {
    reports.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/json', body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  for (const file of PAGES) {
    await analyticsPage.goto(srv.url(file));
    const trackers = await analyticsPage.$$eval('script[data-website-id]', ss => ss.map(s => ({ src: s.src, defer: s.defer, ...s.dataset })));
    const tracker = trackers[0] || {};
    check(file + ': one tracker uses the existing website ID and excludes filter URLs', trackers.length === 1 && tracker.defer &&
      tracker.src === ANALYTICS.script_url && tracker.websiteId === ANALYTICS.website_id &&
      tracker.hostUrl === ANALYTICS.host_url && tracker.domains === new URL(CFG.base_url).hostname &&
      tracker.excludeHash === 'true' && tracker.excludeSearch === 'true' && tracker.tag === 'what-if-ai');
    const sent = await analyticsPage.waitForFunction(() => window.__analyticsSent, null, { timeout: 3000 }).then(() => true, () => false);
    check(file + ': CSP permits the tracker and reporting endpoint', sent && reports.length === PAGES.indexOf(file) + 1 && reports.at(-1)?.website === ANALYTICS.website_id);
  }
  let unrelatedRequests = 0;
  await analyticsPage.route('https://unrelated.example/**', route => {
    unrelatedRequests++;
    return route.fulfill({ body: '', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await analyticsPage.evaluate(() => {
    window.__blockedAnalytics = [];
    document.addEventListener('securitypolicyviolation', e => window.__blockedAnalytics.push(e.effectiveDirective));
  });
  await analyticsPage.addScriptTag({ url: 'https://unrelated.example/tracker.js' }).catch(() => {});
  await analyticsPage.evaluate(() => fetch('https://unrelated.example/api/send').catch(() => {}));
  await analyticsPage.waitForFunction(() => window.__blockedAnalytics.length >= 2);
  const blockedDirectives = await analyticsPage.evaluate(() => window.__blockedAnalytics);
  check('CSP still blocks scripts from unrelated services', unrelatedRequests === 0 && blockedDirectives.includes('script-src-elem'));
  check('CSP still blocks connections to unrelated services', unrelatedRequests === 0 && blockedDirectives.includes('connect-src'));
  await analyticsCtx.close();

  const blockedCtx = await createContext(browser);
  const blockedPage = await blockedCtx.newPage();
  await blockedPage.route(ANALYTICS.script_url, route => route.abort('blockedbyclient'));
  await blockedPage.goto(srv.url('what-if-ai.html'));
  await blockedPage.waitForSelector('html[data-ready]', { state: 'attached' });
  check('the activity finder works when analytics is blocked', await blockedPage.isVisible('#wizard'));
  await blockedCtx.close();

  // landing page
  await page.goto(srv.url(''));
  const doors = await page.$$eval('.door', ds => ds.map(d => d.getAttribute('href')));
  check('the landing page leads to both tools', JSON.stringify(doors) === JSON.stringify(['what-if-ai.html', 'register.html']), doors.join(', '));
  await page.click('.door[href="register.html"]'); await page.waitForSelector('html[data-ready]', { state: 'attached' });
  check('The Register opens from the landing page and loads its data', await page.isVisible('#h-activities'));

  // 404 at depth: styles and links still work
  await page.goto(srv.url('some/deep/missing/page'));
  const nf = await page.evaluate(() => ({ css: getComputedStyle(document.querySelector('.door')).display, links: [...document.querySelectorAll('.door')].map(a => a.getAttribute('href')), logo: document.querySelector('.hdr__logo img').naturalWidth }));
  check('404 page is styled at any depth, with its logo and absolute links into the site', nf.css === 'flex' && nf.logo > 0 && nf.links.every(h => h.startsWith(BASE)), JSON.stringify(nf.links));

  // loading state and failure state
  const slow = await createContext(browser, { viewport: { width: 1440, height: 900 } }); const sp = await slow.newPage();
  await sp.route('**/data/acts.*.json', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await sp.goto(srv.url('register.html'));
  const loading = await sp.evaluate(() => ({ msg: (document.getElementById('boot-msg') || {}).textContent, role: (document.getElementById('boot-msg') || { getAttribute: () => '' }).getAttribute('role'), busy: document.getElementById('main').getAttribute('aria-busy') }));
  check('while data loads, a status message is shown and the main region is marked busy', /Loading/.test(loading.msg || '') && loading.role === 'status' && loading.busy === 'true', JSON.stringify(loading));
  await sp.waitForSelector('html[data-ready]', { state: 'attached' });
  check('when the data arrives the message goes and the page is no longer busy', !(await sp.$('#boot-msg')) && (await sp.getAttribute('#main', 'aria-busy')) === null);
  await slow.close();
  const bad = await createContext(browser, { viewport: { width: 1440, height: 900 } }); const bp = await bad.newPage();
  await bp.route('**/data/acts.*.json', route => route.fulfill({ status: 503, body: 'down' }));
  await bp.goto(srv.url('what-if-ai.html')); await bp.waitForSelector('.boot-msg--error');
  const fail = await bp.evaluate(() => ({ role: document.getElementById('boot-msg').getAttribute('role'), text: document.getElementById('boot-msg').textContent, retry: !!document.getElementById('boot-retry') }));
  check('if the data cannot load, the reader is told plainly and can try again', fail.role === 'alert' && /could not be loaded/.test(fail.text) && fail.retry, fail.text.trim().slice(0, 60));
  const ax = await new AxeBuilder({ page: bp }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  check('the failure message passes axe', ax.violations.length === 0, ax.violations.map(v => v.id).join(' '));
  await bad.close();
  const fc = await createContext(browser); const fp = await fc.newPage();
  await fp.goto('file://' + path.join(SITE, 'register.html')); await fp.waitForSelector('.boot-msg--error', { timeout: 5000 }).catch(() => {});
  check('opened as a local file, the page explains that it needs to be served', /run a local server/.test(await fp.textContent('#boot-msg').catch(() => '')));
  await fc.close();

  // weight: bytes the server sends (uncompressed; GitHub Pages also gzips). A second tool opened
  // in the same browser should not download the activity data again.
  const log = [], ws = await start({ dir: SITE, log });
  const served = () => log.reduce((n, x) => n + x.bytes, 0);
  const wc = await browser.newContext(); const wp = await wc.newPage();
  // Playwright routing disables HTTP caching. Block only the analytics URL through
  // Chromium here, preserving the normal browser cache for the shared-file check.
  const cacheSession = await wc.newCDPSession(wp);
  await cacheSession.send('Network.enable');
  await cacheSession.send('Network.setBlockedURLs', { urls: [ANALYTICS.script_url] });
  await wp.goto(ws.url('what-if-ai.html')); await wp.waitForSelector('html[data-ready]', { state: 'attached' }); await wp.waitForTimeout(400);
  const first = served(); const n0 = log.length;
  await wp.goto(ws.url('register.html')); await wp.waitForSelector('html[data-ready]', { state: 'attached' }); await wp.waitForTimeout(400);
  const second = served() - first, again = log.slice(n0).map(x => x.path);
  await wc.close(); await ws.close();
  console.log(`      What If AI, first visit: ${(first / 1e6).toFixed(2)} MB · then The Register: ${(second / 1e3).toFixed(0)} KB (${again.join(', ')})`);
  check('opening the second tool reuses the cached activity data and shared files', !again.some(p => /^data\/acts\.|assets\/css\/base\.|assets\/js\/core\./.test(p)), again.length + ' files fetched');

  // Ask Us: exercise the iframe under the real page CSP without depending on live chat
  // availability or opening a conversation with library staff during automated tests.
  const chatURL = 'https://lewisu.libanswers.com/chat/widget/9834cecf0f3b65300e275b111a06f48909feee517a3cfe2daedf5b9229fe58cc';
  for (const file of ['what-if-ai.html', 'register.html']) {
    const chatCtx = await createContext(browser);
    const chatPage = await chatCtx.newPage();
    let requests = 0, otherRequests = 0;
    await chatPage.route(chatURL, route => {
      requests++;
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Chat fixture</title><h1>Library chat loaded</h1></html>' });
    });
    await chatPage.route('https://unrelated.example/chat', route => {
      otherRequests++;
      return route.fulfill({ contentType: 'text/html', body: 'Unapproved frame' });
    });
    await chatPage.addInitScript(() => {
      window.__frameViolations = [];
      document.addEventListener('securitypolicyviolation', e => {
        if (e.effectiveDirective === 'frame-src') window.__frameViolations.push(e.blockedURI);
      });
    });
    await chatPage.goto(srv.url(file));
    await chatPage.waitForSelector('html[data-ready]', { state: 'attached' });
    check(file + ': Ask Us does not contact chat before opening', requests === 0 && !(await chatPage.getAttribute('#chatFrame', 'src')));
    await chatPage.getByRole('button', { name: 'Help and support menu', exact: true }).click();
    await chatPage.getByRole('button', { name: 'Ask Us — Lewis University Library Chat', exact: true }).click();
    const loaded = await chatPage.frameLocator('#chatFrame').getByRole('heading', { name: 'Library chat loaded' })
      .waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
    check(file + ': Ask Us loads the library widget inside its iframe', loaded && requests === 1 && await chatPage.isVisible('#chatModal'));
    check(file + ': the library chat iframe is permitted by CSP', (await chatPage.evaluate(() => window.__frameViolations)).length === 0);
    await chatPage.$eval('#chatFrame', frame => { frame.src = 'https://unrelated.example/chat'; });
    const blocked = await chatPage.waitForFunction(() => window.__frameViolations.some(u => u.startsWith('https://unrelated.example')), { }, { timeout: 3000 })
      .then(() => true, () => false);
    check(file + ': CSP still blocks iframe content from unrelated services', blocked && otherRequests === 0);
    await chatCtx.close();
  }

  await browser.close(); await srv.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
