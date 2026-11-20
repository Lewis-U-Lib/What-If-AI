/* The plain reading view: an optional switch in the help menu that takes textures, glows and display
 * type off the same pages. It is separate from the palette, so it must work in crimson and in steel
 * blue, change no content and no control, and be remembered the same way.
 * Run after `python3 tools/build.py`:  node tests/plain.test.js [site-dir] */
const assert = require('assert/strict');
const path = require('path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { createContext } = require('./browser');
const { start } = require('./serve');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const KEY = 'lul-whatifai-plain-v1', THEME = 'lul-whatifai-theme-v1';
const TOOLS = ['what-if-ai.html', 'register.html'];
const pass = message => console.log('PASS  ' + message);
const ready = page => page.waitForSelector('html[data-ready]', { state: 'attached' });
const rest = async page => { await page.keyboard.press('Escape'); await page.mouse.move(4, 4); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(450); };
const TOGGLE = '#fabMenu [data-plain-toggle]';
const PLATES = ['.topbar', 'header.hdr', '.site-foot'];

/* what a reader can read and operate: the words on the page and every control, in order */
const inventory = page => page.evaluate(() => {
  const menu = document.getElementById('fabMenu');
  const words = el => el.textContent.replace(/\s+/g, ' ').trim();
  return {
    text: words(document.querySelector('.app') || document.body),
    foot: words(document.querySelector('.site-foot')),
    controls: [...document.querySelectorAll('a[href], button, input, select, summary')].filter(e => !menu.contains(e))
      .map(e => e.tagName + '|' + (e.getAttribute('href') || e.id || e.name || '') + '|' + words(e).slice(0, 40)),
  };
});
const look = page => page.evaluate(PLATES => {
  const cs = sel => getComputedStyle(document.querySelector(sel)), pseudo = (sel, p) => getComputedStyle(document.querySelector(sel), p);
  return {
    plain: document.documentElement.hasAttribute('data-plain'),
    theme: document.documentElement.getAttribute('data-theme'),
    images: PLATES.map(sel => cs(sel).backgroundImage),
    plates: PLATES.map(sel => cs(sel).backgroundColor),
    ground: pseudo('body', '::before').backgroundImage,
    titleFont: cs('.hdr__title').fontFamily, titleCase: cs('.hdr__title').textTransform, titleShadow: cs('.hdr__title').textShadow,
    bolts: pseudo('.topbar', '::after').display,
    fab: cs('#fabToggle').backgroundImage,
    animations: [...document.querySelectorAll('.current')].map(e => getComputedStyle(e).display),
  };
}, PLATES);

(async () => {
  const server = await start({ dir: SITE_DIR });
  const browser = await chromium.launch();
  try {
    const context = await createContext(browser, { viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    /* off by default, offered in both tools */
    const before = {};
    for (const file of TOOLS) {
      await page.goto(server.url(file)); await ready(page); await rest(page);
      before[file] = { inventory: await inventory(page), look: await look(page) };
      assert.equal(before[file].look.plain, false, file + ': the textured view is the default');
      assert.ok(before[file].look.images.every(i => i !== 'none') && before[file].look.bolts !== 'none', file + ': textures and bolts are on by default');
      await page.click('#fabToggle');
      const button = page.locator(TOGGLE);
      assert.ok(await button.isVisible(), file + ': the menu offers the plain reading view');
      assert.equal((await button.innerText()).trim(), 'Switch to plain reading view');
      assert.equal(await button.evaluate(b => b === document.getElementById('fabMenu').lastElementChild), true, file + ': it is the last item');
      await rest(page);
    }
    pass('default: both tools are textured and the help menu ends with "Switch to plain reading view"');

    /* switch it on in What If AI */
    await page.goto(server.url('what-if-ai.html')); await ready(page);
    await page.click('#fabToggle'); await page.click(TOGGLE);
    assert.equal((await page.locator(TOGGLE).innerText()).trim(), 'Switch to textured view');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), '1');
    assert.ok(await page.evaluate(() => document.getElementById('fabWrap').classList.contains('open') && document.activeElement.matches('[data-plain-toggle]')), 'the menu stays open with focus on the switch');
    await rest(page);
    let now = await look(page);
    assert.equal(now.plain, true);
    assert.equal(now.theme, null, 'the palette is untouched');
    assert.ok(now.images.every(i => i === 'none'), 'plates carry no texture: ' + now.images.join(' | '));
    assert.ok(!/url\(/.test(now.ground), 'the page ground carries no texture');
    assert.equal(now.bolts, 'none', 'bolts are off');
    assert.ok(now.animations.every(d => d === 'none'), 'the moving light is off');
    assert.equal(now.titleShadow, 'none');
    assert.equal(now.titleCase, 'none', 'the title is set in sentence case');
    assert.ok(/^"?Barlow"?,/.test(now.titleFont), 'one typeface: ' + now.titleFont);
    assert.equal(now.fab, 'none', 'the help button has no glow gradient');
    assert.deepEqual(now.plates, [now.plates[0], now.plates[0], now.plates[0]], 'plates share one flat color');
    assert.deepEqual(await inventory(page), before['what-if-ai.html'].inventory, 'the same words and the same controls');
    pass('What If AI: the plain view takes off textures, bolts, glows, motion and display type, and changes no word or control');

    /* the tool still works in it */
    await page.check('[name="q-focus"][value="teaching"]'); await page.click('#next');
    await page.check('[name="q-task"][value="feedback"]');
    for (let i = 0; i < 6 && !(await page.locator('#plan:not([hidden])').count()); i++) await page.click('#next');
    assert.ok(await page.locator('#plan [data-card]').count() > 0, 'questions lead to results');
    await page.locator('#plan [data-open]').first().click();
    assert.ok(await page.$eval('#actDialog', d => d.open), 'details open');
    await page.keyboard.press('Escape');
    await page.locator('#plan button[data-save]').first().click();
    assert.equal((await page.locator('.topbar [data-saved-count]').innerText()).trim(), '1', 'saving works');
    await page.locator('#plan button[data-save]').first().click();
    pass('What If AI in the plain view: answering, opening details and saving work as before');

    /* accessibility, menu closed and open; remembered across reloads and pages */
    for (const open of [false, true]) {
      /* the menu fades in: wait until it is fully drawn before measuring contrast */
      if (open) { await page.click('#fabToggle'); await page.waitForFunction(() => getComputedStyle(document.getElementById('fabMenu')).opacity === '1'); }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe in the plain view' + (open ? ', menu open' : ''));
      if (open) await page.keyboard.press('Escape');
    }
    await page.reload(); await ready(page);
    assert.equal((await look(page)).plain, true, 'survives a reload');
    await page.goto(server.url('index.html'));
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-plain')), true, 'the landing page follows');
    pass('the plain view passes axe, survives a reload, and carries to the landing page');

    /* with steel blue: the two choices are independent */
    await page.goto(server.url('register.html')); await ready(page);
    await page.click('#fabToggle'); await page.click('#fabMenu [data-theme-toggle]'); await rest(page);
    now = await look(page);
    assert.equal(now.plain, true, 'changing the palette keeps the plain view');
    assert.equal(now.theme, 'blue');
    assert.ok(now.images.every(i => i === 'none'));
    const [r, g, b] = now.plates[0].match(/[\d.]+/g).map(Number);
    assert.ok(b > r && g > r, 'the flat plate is steel blue: ' + now.plates[0]);
    assert.deepEqual(await inventory(page), before['register.html'].inventory, 'The Register: the same words and controls');
    for (const open of [false, true]) {
      /* the menu fades in: wait until it is fully drawn before measuring contrast */
      if (open) { await page.click('#fabToggle'); await page.waitForFunction(() => getComputedStyle(document.getElementById('fabMenu')).opacity === '1'); }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe on The Register, plain and blue' + (open ? ', menu open' : ''));
      if (open) await page.keyboard.press('Escape');
    }
    await page.click('#fabToggle'); await page.focus(TOGGLE); await page.keyboard.press('Enter'); await rest(page);
    now = await look(page);
    assert.equal(now.plain, false); assert.equal(now.theme, 'blue', 'leaving the plain view keeps the palette');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), null, 'nothing is left in storage for the textured view');
    assert.ok(now.images.every(i => i !== 'none'), 'textures return');
    await page.click('#fabToggle'); await page.click('#fabMenu [data-theme-toggle]'); await rest(page);
    assert.deepEqual(await look(page), before['register.html'].look, 'crimson and textured again, exactly as before');
    pass('The Register: the plain view works in steel blue, passes axe, and each switch leaves the other alone');
    assert.deepEqual(errors, []);
    await context.close();

    /* another tab follows; no JavaScript: no switch; storage blocked: still works */
    const shared = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    const one = await shared.newPage(), two = await shared.newPage();
    await one.goto(server.url('what-if-ai.html')); await ready(one);
    await two.goto(server.url('register.html')); await ready(two);
    await one.click('#fabToggle'); await one.click(TOGGLE);
    await two.waitForFunction(() => document.documentElement.hasAttribute('data-plain'));
    assert.equal(await two.$eval('[data-plain-label]', el => el.textContent), 'Switch to textured view');
    await shared.close();
    const plainJs = await createContext(browser, { javaScriptEnabled: false });
    const still = await plainJs.newPage();
    await still.goto(server.url('what-if-ai.html'));
    assert.equal(await still.locator('[data-plain-toggle]').getAttribute('hidden'), '');
    assert.equal(await still.locator('html').getAttribute('data-plain'), null);
    await plainJs.close();
    const blocked = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const phone = await blocked.newPage();
    await phone.goto(server.url('register.html')); await phone.waitForSelector('[data-plain-toggle]:not([hidden])', { state: 'attached' });
    /* the help button opens its menu only once the page's scripts have run */
    await ready(phone);
    await phone.click('#fabToggle'); await phone.waitForSelector(TOGGLE, { state: 'visible' }); await phone.click(TOGGLE);
    assert.equal(await phone.locator('html').getAttribute('data-plain'), '');
    assert.ok(await phone.evaluate(() => { const m = document.getElementById('fabMenu').getBoundingClientRect(); return m.left >= 0 && m.right <= innerWidth && m.top >= 0; }), 'the longer menu still fits a phone');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll on a phone');
    await blocked.close();
    pass('another tab follows; without JavaScript the switch stays hidden; with storage blocked it still works and the menu fits a phone');
  } finally {
    await browser.close();
    await server.close();
  }
  console.log('\nPlain reading view checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
