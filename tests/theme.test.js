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
/* close the menu and take pointer and focus off the help button, so it is measured at rest; */
/* then let color transitions finish, so a snapshot never catches the previous palette mid-fade */
const rest = async page => { await page.keyboard.press('Escape'); await page.mouse.move(4, 4); await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(450); };
const channels = color => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const hex = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
/* the palette family, as tools/palette.py defines it (tests/palette_test.py checks that src/js/theme.js agrees) */
const PALETTES = [{"name": "crimson", "label": "Crimson", "base": "#940731", "tone": "dark", "bar": "#5b0a1f"}, {"name": "blue", "label": "Steel blue", "base": "#2f5f75", "tone": "dark", "bar": "#163442"}, {"name": "charcoal", "label": "Charcoal", "base": "#51534a", "tone": "dark", "bar": "#3f413a"}, {"name": "green", "label": "Fern green", "base": "#7c9858", "tone": "light", "bar": "#718954"}, {"name": "khaki", "label": "Khaki", "base": "#9b945f", "tone": "light", "bar": "#8b865a"}, {"name": "ice", "label": "Ice blue", "base": "#73c4d4", "tone": "light", "bar": "#5ab3c4"}, {"name": "bone", "label": "Bone", "base": "#cac7a7", "tone": "light", "bar": "#b8b48f"}, {"name": "gold", "label": "Gold", "base": "#e8c446", "tone": "light", "bar": "#d7b026"}, {"name": "lemon", "label": "Pale yellow", "base": "#ffe584", "tone": "light", "bar": "#f5cd38"}];

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
      const picker = page.locator('#fabMenu [data-theme-picker]');
      assert.ok(await picker.isVisible(), file + ': the menu offers the palettes');
      assert.equal((await picker.locator('[data-theme-label]').innerText()).trim(), 'Crimson');
      assert.deepEqual(await picker.locator('[data-theme-choice]').evaluateAll(all => all.map(b => b.getAttribute('data-theme-choice'))), PALETTES.map(p => p.name), file + ': one swatch per palette');
      assert.deepEqual(await picker.locator('[aria-pressed="true"]').evaluateAll(all => all.map(b => b.getAttribute('data-theme-choice'))), ['crimson'], file + ': crimson is the pressed swatch');
      assert.ok(await picker.locator('[data-theme-choice]').evaluateAll(all => all.every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && b.getAttribute('aria-label'); })), file + ': each swatch is named and 44px');
      assert.equal(await picker.evaluate(b => b === document.querySelector('#fabMenu').lastElementChild), true, file + ': the palettes are the last item');
      await rest(page);
    }
    pass('default: both tools are the crimson site and the help menu ends with one swatch per palette');

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
    assert.equal((await page.locator('#fabMenu [data-theme-label]').innerText()).trim(), 'Steel blue');
    assert.equal(await page.locator('#fabMenu [data-theme-choice="blue"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('html').getAttribute('data-tone'), null, 'blue is a dark palette');
    assert.ok(await page.evaluate(() => document.getElementById('fabWrap').classList.contains('open') && document.activeElement.matches('[data-theme-choice="blue"]')),
      'the menu stays open with focus on the swatch, so another can be chosen');
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
    await page.focus('#fabMenu [data-theme-choice="crimson"]'); await page.keyboard.press('Enter');
    const back = await snapshot(page);
    assert.equal(back.theme, null);
    assert.equal(await page.evaluate(k => localStorage.getItem(k), KEY), null, 'nothing is left in storage for crimson');
    assert.equal((await page.locator('#fabMenu [data-theme-label]').innerText()).trim(), 'Crimson');
    await rest(page);
    assert.deepEqual(await snapshot(page), crimson['register.html'], 'crimson again, exactly as before');
    pass('The Register: the keyboard switches back, and the page is exactly the crimson page again');

    /* every other palette: the plate takes the named color, no box moves, and axe passes on both tools */
    for (const palette of PALETTES.filter(p => !['crimson', 'blue'].includes(p.name))) {
      for (const file of TOOLS) {
        await page.goto(server.url(file)); await ready(page);
        await page.click('#fabToggle'); await page.click(`#fabMenu [data-theme-choice="${palette.name}"]`);
        assert.equal(await page.locator('html').getAttribute('data-tone'), palette.tone === 'light' ? 'light' : null, palette.name + ': tone');
        assert.equal(await page.$eval('meta[name="color-scheme"]', m => m.content), palette.tone);
        for (const open of [true, false]) {
          if (!open) await rest(page);
          const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          assert.deepEqual(result.violations.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(' | ')), [], `axe on ${file} in ${palette.name}` + (open ? ', menu open' : ''));
        }
        const now = await snapshot(page);
        assert.equal(now.theme, palette.name); assert.equal(now.bar, palette.bar);
        now.parts.forEach((part, i) => assert.equal(part.box, crimson[file].parts[i].box, `${palette.name}: ${file} ${part.sel} has not moved`));
        const plate = now.parts.find(part => part.sel === '.topbar').bg;
        if (palette.tone === 'light') assert.ok(channels(plate).every((v, k) => Math.abs(v - hex(palette.base)[k]) <= 2), `${palette.name}: the plate is ${palette.base}, got ${plate}`);
      }
      pass(`${palette.label}: both tools take the palette, keep every box, and pass axe with the menu open and closed`);
    }
    await page.goto(server.url('register.html')); await ready(page);
    await page.click('#fabToggle'); await page.click('#fabMenu [data-theme-choice="crimson"]'); await rest(page);
    assert.deepEqual(await snapshot(page), crimson['register.html'], 'crimson again after the tour of the family');
    assert.deepEqual(errors, []);
    await context.close();

    /* a second tab follows the first */
    const shared = await createContext(browser, { viewport: { width: 1280, height: 900 } });
    const one = await shared.newPage(), two = await shared.newPage();
    await one.goto(server.url('what-if-ai.html')); await ready(one);
    await two.goto(server.url('register.html')); await ready(two);
    await one.click('#fabToggle'); await one.click('#fabMenu [data-theme-choice="gold"]');
    await two.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'gold');
    assert.equal(await two.$eval('[data-theme-label]', el => el.textContent), 'Gold');
    assert.equal(await two.locator('html').getAttribute('data-tone'), 'light');
    await shared.close();
    pass('another open tab follows the choice');

    /* without JavaScript: crimson, and no button that cannot work */
    const plain = await createContext(browser, { javaScriptEnabled: false });
    const still = await plain.newPage();
    await still.goto(server.url('what-if-ai.html'));
    assert.equal(await still.locator('[data-theme-picker]').getAttribute('hidden'), '');
    assert.equal(await still.locator('html').getAttribute('data-theme'), null);
    await plain.close();
    pass('without JavaScript the palettes stay hidden and the page is crimson');

    /* storage blocked: the switch works for this page and nothing throws */
    const blocked = await createContext(browser, { viewport: { width: 390, height: 844 } });
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
    const phone = await blocked.newPage();
    const phoneErrors = [];
    phone.on('pageerror', error => phoneErrors.push(error.message));
    await phone.goto(server.url('register.html')); await phone.waitForSelector('[data-theme-picker]:not([hidden])', { state: 'attached' });
    await phone.click('#fabToggle'); await phone.click('#fabMenu [data-theme-choice="blue"]');
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
