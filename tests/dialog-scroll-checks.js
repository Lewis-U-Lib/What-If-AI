/* Reopen and replace scrolled dialogs, including nested saved-activity details. */
const assert = require('assert/strict');
const { createContext } = require('./browser');

module.exports = async function checkDialogScroll(browser, go, check) {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    const context = await createContext(browser, { viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function atTop(id) {
      await page.waitForFunction(id => {
        const dialog = document.getElementById(id);
        return dialog.open && dialog.scrollTop === 0 && dialog.querySelector('.dlg__body').scrollTop === 0;
      }, id);
    }
    async function scrollDown(id) {
      return page.locator('#' + id + ' .dlg__body').evaluate(body => {
        body.scrollTop = body.scrollHeight;
        return body.scrollTop;
      });
    }
    for (const file of ['what-if-ai.html#a=focus:teaching;task:design', 'register.html#activities']) {
      await page.goto('about:blank'); await go(page, file);
      const button = page.locator(file.startsWith('register') ? '#actResults [data-open]' : '#plan [data-open]').first();
      await button.click(); await atTop('actDialog');
      await page.locator('#actDialog [data-give-feedback]').click();
      assert.ok(await page.locator('#actDialog .dlg__body').evaluate(e => e.scrollTop) > 0);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !/^#act=/.test(location.hash));
      await button.click(); await atTop('actDialog');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'actDialogTitle');
      await scrollDown('actDialog');
      await page.evaluate(() => SITE.openActivity(SITE.A.find(a => a.id !== document.getElementById('actDialog').getAttribute('data-act')).id));
      await atTop('actDialog');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !/^#act=/.test(location.hash));
      await page.evaluate(() => { SITE.Saved.clear(); SITE.A.slice(0, 30).forEach(a => SITE.Saved.add(a.id)); });
      await page.locator('.topbar [data-open-saved]').click(); await atTop('savedDrawer');
      assert.ok(await scrollDown('savedDrawer') > 0);
      await page.locator('#savedBody [data-open]').last().click(); await atTop('actDialog');
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#savedBody').evaluate(e => e.scrollTop) > 0, 'Returning from nested details preserves the drawer position');
      await page.keyboard.press('Escape');
      await page.locator('.topbar [data-open-saved]').click(); await atTop('savedDrawer');
      await page.keyboard.press('Escape');
      check(file + ' @' + width + ': reopened and replaced activities and saved drawers start at the top; nested return preserves its position', true);
    }
    for (const [file, dialog, launch, next] of [
      ['what-if-ai.html', 'tourDialog', '.hdr [data-open-tour]', '#tourNext'],
      ['register.html', 'rtour', '.hdr [data-open-register-tour]', '#rtourNext'],
    ]) {
      await page.goto('about:blank'); await go(page, file);
      await page.locator(launch).click(); await atTop(dialog);
      await scrollDown(dialog); await page.locator(next).click(); await atTop(dialog);
      await scrollDown(dialog); await page.keyboard.press('Escape');
      await page.waitForFunction(() => location.hash !== '#about');
      await page.locator(launch).click(); await atTop(dialog);
      await page.keyboard.press('Escape');
      check(file + ' @' + width + ': walkthrough openings and step changes start at the top', true);
    }
    await page.goto('about:blank'); await go(page, 'register.html#ai-types');
    await page.locator('[data-open-type="conversational"]').click();
    await page.locator('.type-example-disclosure > summary').click();
    assert.ok(await scrollDown('aiTypeDialog') > 0);
    await page.keyboard.press('Escape');
    await page.locator('[data-open-type="conversational"]').click(); await atTop('aiTypeDialog');
    assert.equal(await page.locator('.type-example-disclosure').evaluate(e => e.open), false);
    check('The Register @' + width + ': AI-type details reopen at the top with examples collapsed', true);
    assert.deepEqual(errors, []);
    await context.close();
  }
};
