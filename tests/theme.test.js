/* The palette switch in the help menu: crimson unless the reader chooses steel blue or light, which this browser remembers.
 *
 *  - with no choice made, the pages are exactly the crimson site: no attribute, the source colors;
 *  - the help menu shows the three palettes as a row of tiles, each one click away; the current one is pressed
 *    and carries a check mark; choosing one leaves the menu open;
 *  - blue changes colors only: every measured box is where it was, gold stays gold, and axe finds nothing;
 *  - light changes colors only too: pale plates, dark ink, crimson where gold was, the help button still
 *    yellow brass, and axe finds nothing;
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
const rest = async page => { await page.keyboard.press('Escape'); await page.mouse.move(4, 4); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(450); };   /* and let color transitions finish, so a snapshot never catches the other palette mid-fade */
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
      const row = page.locator('#fabMenu [data-theme-choices]');
      assert.ok(await row.isVisible(), file + ': the menu offers the palettes');
      assert.deepEqual(await row.locator('[data-theme-choice]').evaluateAll(bs => bs.map(b => [b.getAttribute('data-theme-choice'), b.innerText.trim(), b.getAttribute('aria-pressed'), b.offsetParent !== null])),
        [['crimson', 'Crimson', 'true', true], ['blue', 'Blue', 'false', true], ['light', 'Light', 'false', true]], file + ': all three are in view, crimson pressed');
      assert.equal(await row.evaluate(r => r.getAttribute('role') + '|' + document.getElementById(r.getAttribute('aria-labelledby')).textContent), 'group|Color palette');
      assert.deepEqual(await row.locator('[data-theme-choice]').evaluateAll(bs => bs.map(b => [getComputedStyle(b.querySelector('.fab-choice__check')).display !== 'none', getComputedStyle(b.querySelector('.fab-choice__swatch')).display !== 'none'])),
        [[true, false], [false, true], [false, true]], file + ': the current tile shows a check mark, the others their swatch');
      assert.ok(await row.locator('[data-theme-choice]').evaluateAll(bs => bs.every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })), file + ': each tile is a 44px target');
      assert.equal(await row.evaluate(b => b.nextElementSibling === document.querySelector('#fabMenu').lastElementChild && b.nextElementSibling.matches('[data-plain-toggle]')), true, file + ': the two view switches end the menu, palette first');
      await rest(page);
    }
    pass('default: both tools are the crimson site and the help menu shows Crimson, Blue and Light, with Crimson current');

    /* switch on What If AI */
    await page.goto(server.url('what-if-ai.html')); await ready(page);
    await page.click('#fabToggle');
    await page.click('#fabMenu [data-theme-choice="blue"]');
    let blue = await snapshot(page);
    assert.equal(blue.theme, 'blue');
    assert.equal(blue.navy, '#162c36', 'the ground is steel blue');
    assert.equal(blue.gold, crimson['what-if-ai.html'].gold, 'gold is unchanged');
    assert.equal(blue.bar, '#163442', 'the browser toolbar tint follows');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), 'blue');
    const pressed = () => page.locator('#fabMenu [data-theme-choice]').evaluateAll(bs => bs.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.getAttribute('data-theme-choice')));
    assert.deepEqual(await pressed(), ['blue'], 'Blue is now the pressed tile, and the only one');
    assert.ok(await page.evaluate(() => document.getElementById('fabWrap').classList.contains('open') && document.activeElement.matches('[data-theme-choice="blue"]')),
      'the menu stays open with focus on the tile, so another can be chosen');
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
      /* the menu fades in: wait until it is fully drawn before measuring contrast */
      if (open) { await page.click('#fabToggle'); await page.waitForFunction(() => getComputedStyle(document.getElementById('fabMenu')).opacity === '1'); }
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

    /* straight to light, from the keyboard */
    const triple = color => /^#[0-9a-f]{6}$/i.test(color) ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) : channels(color);
    const luminance = color => { const [r, g, b] = triple(color).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    await page.focus('#fabToggle'); await page.keyboard.press('Enter');
    await page.focus('#fabMenu [data-theme-choice="light"]'); await page.keyboard.press('Enter');
    let light = await snapshot(page);
    assert.equal(light.theme, 'light');
    assert.equal(light.bar, '#e9e6df', 'the browser toolbar tint follows');
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), 'light');
    assert.deepEqual(await pressed(), ['light']);
    await rest(page);
    light = await snapshot(page);
    assert.equal(light.height, crimson['register.html'].height, 'the page is the same height');
    light.parts.forEach((part, i) => assert.equal(part.box, crimson['register.html'].parts[i].box, 'register ' + part.sel + ' has not moved in light'));
    const part = name => light.parts.find(p => p.sel === name);
    assert.ok(luminance(light.navy) > .7, 'the ground is pale: ' + light.navy);
    assert.ok(luminance(part('.hdr__title').color) < .05, 'the title is ink: ' + part('.hdr__title').color);
    const [gr, gg, gb] = triple(light.gold);
    assert.ok(gr > 90 && gg < 40 && gb < 80, 'what was gold lettering is Lewis crimson: ' + light.gold);
    assert.equal(part('.fab-toggle').image, crimson['register.html'].parts.find(p => p.sel === '.fab-toggle').image, 'the help button keeps its yellow brass');
    assert.notEqual(part('.hdr-cta--primary').image, crimson['register.html'].parts.find(p => p.sel === '.hdr-cta--primary').image, 'the primary button is no longer gold');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light', 'native controls are drawn for a light page');
    for (const open of [false, true]) {
      if (open) { await page.click('#fabToggle'); await page.waitForFunction(() => getComputedStyle(document.getElementById('fabMenu')).opacity === '1'); }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], 'axe on The Register in light' + (open ? ', menu open' : ''));
      if (open) await page.keyboard.press('Escape');
    }
    await page.goto(server.url('what-if-ai.html')); await ready(page); await rest(page);
    const finderLight = await snapshot(page);
    assert.equal(finderLight.theme, 'light', 'the other tool follows');
    finderLight.parts.forEach((part, i) => assert.equal(part.box, crimson['what-if-ai.html'].parts[i].box, 'what-if-ai ' + part.sel + ' has not moved in light'));
    const finderAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(finderAxe.violations.map(v => v.id), [], 'axe on What If AI in light');
    await page.goto(server.url('index.html'));
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'the landing page follows');
    pass('the Light tile turns the pages light: pale plates, dark ink, crimson for gold, no box moved, the help button still brass, and axe finds nothing');

    /* and back to crimson, from the keyboard */
    await page.goto(server.url('register.html')); await ready(page);
    await page.focus('#fabToggle'); await page.keyboard.press('Enter');
    await page.focus('#fabMenu [data-theme-choice="crimson"]'); await page.keyboard.press('Space');
    const back = await snapshot(page);
    assert.equal(back.theme, null);
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), null, 'nothing is left in storage for crimson');
    assert.deepEqual(await pressed(), ['crimson']);
    /* pressing the current tile again changes nothing */
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), null);
    await rest(page);
    assert.deepEqual(await snapshot(page), crimson['register.html'], 'crimson again, exactly as before');
    pass('The Register: the Crimson tile returns to crimson, and the page is exactly the crimson page again');
    assert.deepEqual(errors, []);
    await context.close();

    /* a second tab follows the first */
    const shared = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    const one = await shared.newPage(), two = await shared.newPage();
    await one.goto(server.url('what-if-ai.html')); await ready(one);
    await two.goto(server.url('register.html')); await ready(two);
    const marked = () => two.$$eval('[data-theme-choice][aria-pressed="true"]', bs => bs.map(b => b.getAttribute('data-theme-choice')).join());
    await one.click('#fabToggle'); await one.click('#fabMenu [data-theme-choice="blue"]');
    await two.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'blue');
    assert.equal(await marked(), 'blue');
    await one.click('#fabMenu [data-theme-choice="light"]');
    await two.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
    assert.equal(await marked(), 'light');
    await shared.close();
    pass('another open tab follows the choice');

    /* without JavaScript: crimson, and no button that cannot work */
    const plain = await createContext(browser, { javaScriptEnabled: false });
    const still = await plain.newPage();
    await still.goto(server.url('what-if-ai.html'));
    assert.equal(await still.locator('[data-theme-choices]').getAttribute('hidden'), '');
    assert.equal(await still.locator('[data-theme-choices]').isVisible(), false);
    assert.equal(await still.locator('html').getAttribute('data-theme'), null);
    await plain.close();
    pass('without JavaScript the palette tiles stay hidden and the page is crimson');

    /* storage blocked: the switch works for this page and nothing throws */
    const blocked = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const phone = await blocked.newPage();
    const phoneErrors = [];
    phone.on('pageerror', error => phoneErrors.push(error.message));
    await phone.goto(server.url('register.html')); await phone.waitForSelector('[data-theme-choices]:not([hidden])', { state: 'attached' });
    /* the help button opens its menu only once the page's scripts have run */
    await phone.waitForSelector('html[data-ready]', { state: 'attached' });
    await phone.click('#fabToggle'); await phone.waitForSelector('#fabMenu [data-theme-choice="light"]', { state: 'visible' }); await phone.click('#fabMenu [data-theme-choice="light"]');
    assert.equal(await phone.locator('html').getAttribute('data-theme'), 'light');
    assert.ok(await phone.locator('#fabMenu [data-theme-choice]').evaluateAll(bs => bs.every(b => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().height < 80)), 'the three tiles fit one row on a phone without wrapping');
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
