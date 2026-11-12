/* The palette switch in the help menu: crimson unless the reader chooses steel blue, which this browser remembers.
 *
 *  - with no choice made, the pages are exactly the crimson site: no attribute, the source colors;
 *  - the help menu's button switches to blue and back, says what it will do, and leaves the menu open;
 *  - blue changes colors only: every measured box is where it was, gold stays gold, and axe finds nothing;
 *  - the choice carries to the other tool and the landing page, survives a reload, and is applied by a
 *    script in the <head> that runs before any stylesheet is drawn;
 *  - without JavaScript the button stays hidden; with storage blocked it still works for the page.
 *
 * Run after `python3 tools/build.py`:  node tests/theme.test.js [site-dir]
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const { createContext } = require('./browser');
const { start } = require('./serve');
const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const KEY = 'lul-whatifai-theme-v1';
const TOOLS = ['what-if-ai.html', 'register.html'];
const pass = message => console.log('PASS  ' + message);

const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
/* colors and boxes of the parts a reader sees first, plus two tokens */
const snapshot = page => page.evaluate(() => {
  const css = getComputedStyle(document.documentElement);
  const parts = ['.topbar', 'header.hdr', '.hdr__title', '.hdr-cta--primary', '.hdr-cta--secondary', '.fab-toggle', '.site-foot', 'main'];
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    navy: css.getPropertyValue('--navy').trim(), gold: css.getPropertyValue('--gold').trim(),
    bar: document.querySelector('meta[name="theme-color"]').content,
    height: document.documentElement.scrollHeight,
    parts: parts.map(sel => { const el = document.querySelector(sel), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return { sel, box: [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(), color: cs.color, bg: cs.backgroundColor, image: cs.backgroundImage }; }),
  };
});
/* close the menu and take pointer and focus off the help button, so it is measured at rest */
const rest = async page => { await page.keyboard.press('Escape'); await page.mouse.move(4, 4); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
const channels = color => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  try {
    /* the script that applies the choice comes before every stylesheet and is not deferred */
    for (const file of ['index.html', '404.html', 'source-file.html', ...TOOLS]) {
      const html = fs.readFileSync(path.join(SITE_DIR, file), 'utf8');
      const script = /<script src="[^"]*assets\/js\/theme\.[0-9a-f]+\.js"><\/script>/.exec(html);
      assert.ok(script && script.index < html.indexOf('<link rel="stylesheet"') && script.index < html.indexOf('</head>'), file + ': theme script leads the head');
    }
    pass('every page loads the theme script in its head, ahead of the stylesheets and without defer');

    const context = await createContext(browser, { viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    const crimson = {};
    for (const file of TOOLS) {
      await page.goto(server.url(file)); await ready(page);
      await page.mouse.move(4, 4);
      crimson[file] = await snapshot(page);
      assert.equal(crimson[file].theme, null, file + ': no theme attribute by default');
      assert.equal(crimson[file].navy, '#520e20', file + ': the ground is the source crimson');
      assert.equal(crimson[file].bar, '#5b0a1f');
      await page.click('#fabToggle');
      const button = page.locator('#fabMenu [data-theme-toggle]');
      assert.ok(await button.isVisible(), file + ': the menu offers the switch');
      assert.equal((await button.innerText()).trim(), 'Switch to blue');
      assert.equal(await button.evaluate(b => b === document.querySelector('#fabMenu').lastElementChild), true, file + ': the switch is the last item');
      await rest(page);
    }
    pass('default: both tools are the crimson site and the help menu ends with "Switch to blue"');

    /* switch on What If AI */
    await page.goto(server.url('what-if-ai.html')); await ready(page);
    await page.click('#fabToggle');
    await page.click('#fabMenu [data-theme-toggle]');
    let blue = await snapshot(page);
    assert.equal(blue.theme, 'blue');
    assert.equal(blue.navy, '#162c36', 'the ground is steel blue');
    assert.equal(blue.gold, crimson['what-if-ai.html'].gold, 'gold is unchanged');
    assert.equal(blue.bar, '#163442', 'the browser toolbar tint follows');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), 'blue');
    assert.equal((await page.locator('#fabMenu [data-theme-toggle]').innerText()).trim(), 'Switch to crimson');
    assert.ok(await page.evaluate(() => document.getElementById('fabWrap').classList.contains('open') && document.activeElement.matches('[data-theme-toggle]')),
      'the menu stays open with focus on the switch, so it can be pressed again');
    await rest(page);
    blue = await snapshot(page);
    assert.equal(blue.height, crimson['what-if-ai.html'].height, 'the page is the same height');
    blue.parts.forEach((part, i) => {
      const was = crimson['what-if-ai.html'].parts[i];
      assert.equal(part.box, was.box, part.sel + ' has not moved or changed size');
    });
    const ground = name => blue.parts.find(p => p.sel === name);
    for (const sel of ['.topbar', 'header.hdr', '.site-foot']) {
      const [r, g, b] = channels(ground(sel).bg);
      assert.ok(b > r && g > r, sel + ' is blue: ' + ground(sel).bg);
      assert.notEqual(ground(sel).image + ground(sel).bg, crimson['what-if-ai.html'].parts.find(p => p.sel === sel).image + crimson['what-if-ai.html'].parts.find(p => p.sel === sel).bg);
    }
    for (const sel of ['.hdr-cta--primary', '.fab-toggle']) {
      const was = crimson['what-if-ai.html'].parts.find(p => p.sel === sel);
      assert.equal(ground(sel).image, was.image, sel + ' keeps its gold');
    }
    pass('What If AI: the switch turns the page steel blue, changes no box, keeps gold, and stays ready to switch back');

    /* accessibility in blue, with the menu closed and open */
    for (const open of [false, true]) {
      if (open) await page.click('#fabToggle');
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe in blue' + (open ? ', menu open' : ''));
      if (open) await page.keyboard.press('Escape');
    }
    pass('What If AI in blue: axe finds no violations, menu closed or open');

    /* remembered: reload, the other tool, the landing page */
    await page.reload(); await ready(page);
    assert.equal((await snapshot(page)).theme, 'blue', 'survives a reload');
    await page.goto(server.url('index.html'));
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'blue', 'the landing page follows');
    await page.goto(server.url('register.html')); await ready(page);
    const registerBlue = await snapshot(page);
    assert.equal(registerBlue.theme, 'blue', 'the other tool follows');
    registerBlue.parts.forEach((part, i) => assert.equal(part.box, crimson['register.html'].parts[i].box, 'register ' + part.sel + ' has not moved'));
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(axe.violations.map(v => v.id), [], 'axe on The Register in blue');
    pass('the choice survives a reload and carries to The Register and the landing page; The Register in blue passes axe');

    /* and back, from the keyboard */
    await page.focus('#fabToggle'); await page.keyboard.press('Enter');
    await page.focus('#fabMenu [data-theme-toggle]'); await page.keyboard.press('Enter');
    const back = await snapshot(page);
    assert.equal(back.theme, null);
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), null, 'nothing is left in storage for crimson');
    assert.equal((await page.locator('#fabMenu [data-theme-toggle]').innerText()).trim(), 'Switch to blue');
    await rest(page);
    assert.deepEqual(await snapshot(page), crimson['register.html'], 'crimson again, exactly as before');
    pass('The Register: the keyboard switches back, and the page is exactly the crimson page again');
    assert.deepEqual(errors, []);
    await context.close();

    /* a second tab follows the first */
    const shared = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    const one = await shared.newPage(), two = await shared.newPage();
    await one.goto(server.url('what-if-ai.html')); await ready(one);
    await two.goto(server.url('register.html')); await ready(two);
    await one.click('#fabToggle'); await one.click('#fabMenu [data-theme-toggle]');
    await two.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'blue');
    assert.equal(await two.$eval('[data-theme-label]', el => el.textContent), 'Switch to crimson');
    await shared.close();
    pass('another open tab follows the choice');

    /* without JavaScript: crimson, and no button that cannot work */
    const plain = await createContext(browser, { javaScriptEnabled: false });
    const still = await plain.newPage();
    await still.goto(server.url('what-if-ai.html'));
    assert.equal(await still.locator('[data-theme-toggle]').getAttribute('hidden'), '');
    assert.equal(await still.locator('html').getAttribute('data-theme'), null);
    await plain.close();
    pass('without JavaScript the switch stays hidden and the page is crimson');

    /* storage blocked: the switch works for this page and nothing throws */
    const blocked = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const phone = await blocked.newPage();
    const phoneErrors = [];
    phone.on('pageerror', error => phoneErrors.push(error.message));
    await phone.goto(server.url('register.html')); await phone.waitForSelector('[data-theme-toggle]:not([hidden])', { state: 'attached' });
    await phone.click('#fabToggle'); await phone.click('#fabMenu [data-theme-toggle]');
    assert.equal(await phone.locator('html').getAttribute('data-theme'), 'blue');
    assert.ok(await phone.evaluate(() => { const m = document.getElementById('fabMenu').getBoundingClientRect(); return m.left >= 0 && m.right <= innerWidth && m.top >= 0; }), 'the longer menu still fits a phone');
    assert.deepEqual(phoneErrors.filter(e => !/blocked/.test(e)), []);
    await blocked.close();
    pass('with storage blocked the switch still works for the page, and the menu fits a phone');
  } finally {
    await browser.close();
    await server.close();
  }
  console.log('\nTheme checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
