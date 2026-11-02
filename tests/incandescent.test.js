/* Regression checks for incandescent controls: solid overlays, keyboard use,
 * narrow/short layouts, forced colors, and exact disclosure/link content. */
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require('playwright');
const {createContext} = require('./browser');
const {start} = require('./serve');
const SITE = path.resolve(process.argv[2] || path.join(__dirname,'..','_site'));
const DISCLOSURE = 'HCAI and HITL Disclosure: AI assistance was used to realize this resource, utilized for coding, collation, editing, and certain visual elements. Claude Opus 5.5, Claude Fable, ChatGPT GPT-6 Astra, and Canva AI were employed in building the resource and followed a Human-Centered AI framework (HCAI) and Human-in-the-Loop deployment (HITL).';
const LINKS = [
  ['Human-Centered AI framework (HCAI)','https://hai.stanford.edu/ai-definitions/what-is-human-centered-ai'],
  ['Human-in-the-Loop deployment (HITL)','https://hai.stanford.edu/ai-definitions/what-is-human-in-the-loop'],
];
const opaque = color => /^rgb\(/.test(color) || /,\s*1\)$/.test(color);
async function solid(locator) {
  const css = await locator.evaluate(n => {const s=getComputedStyle(n);return {background:s.backgroundColor,opacity:s.opacity};});
  assert.ok(opaque(css.background), 'opaque backing: '+JSON.stringify(css));
  assert.equal(css.opacity,'1');
}
async function inView(locator) {
  assert.ok(await locator.evaluate(n => {const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}), 'focused control is inside viewport');
}
(async()=>{
  const server=await start({dir:SITE}), browser=await chromium.launch();
  try {
    for(const file of ['what-if-ai.html','register.html#ai-types']) {
      for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:640,height:360}]) {
        const context=await createContext(browser,{viewport,reducedMotion:'reduce'}),page=await context.newPage();
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('https://lewisu.libanswers.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Chat test fixture</title><p>Chat service omitted from local checks.</p>'}));
        await page.goto(server.url(file));await page.waitForSelector('html[data-ready]');
        assert.equal((await page.locator('.hcai').textContent()).replace(/\s+/g,' ').trim(),DISCLOSURE);
        assert.equal((await page.locator('#aboutSlides [data-slide]').last().locator('p').textContent()).replace(/\s+/g,' ').trim(),DISCLOSURE);
        for(const [label,url] of LINKS) {
          assert.equal(await page.locator('.hcai').getByRole('link',{name:label,exact:true}).getAttribute('href'),url);
          assert.equal(await page.locator('#aboutSlides').getByRole('link',{name:label,exact:true,includeHidden:true}).getAttribute('href'),url);
        }
        const report=page.locator('.site-foot__links').getByRole('link',{name:'Report an Issue'});
        assert.equal(await report.getAttribute('href'),'https://lewisu.libwizard.com/f/report-issue');
        assert.ok(await report.evaluate(n=>n.closest('li').previousElementSibling.textContent.includes('Send feedback')));
        assert.ok(await page.locator('.hdr__link').getAttribute('aria-label'));
        const logo=page.locator('.hdr__logo img');
        assert.ok(await logo.evaluate(n=>getComputedStyle(n).filter.includes('library-press')),'the original logo is rendered as a metal recess');
        const resting=await logo.evaluate(n=>getComputedStyle(n).filter);
        await page.locator('.hdr__link').hover();
        assert.notEqual(await logo.evaluate(n=>getComputedStyle(n).filter),resting,'logo has a distinct hover rim');
        await page.mouse.move(1,1);
        await page.emulateMedia({media:'print'});
        assert.equal(await logo.evaluate(n=>getComputedStyle(n).filter),'brightness(0)','logo prints black on paper');
        await page.emulateMedia({media:'screen'});
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hdr__logo img')).filter.includes('library-press')&&parseFloat(getComputedStyle(document.querySelector('.site-foot')).paddingBottom)>=116);

        // At the end of either page, the lamp must occupy its reserved strip,
        // with the entire disclosure and all footer links clear above it.
        await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
        const clearance=await page.evaluate(()=>{
          const lamp=document.querySelector('#fabToggle').getBoundingClientRect();
          const disclosure=document.querySelector('.hcai').getBoundingClientRect();
          return {gap:lamp.top-disclosure.bottom,horizontal:document.documentElement.scrollWidth-innerWidth};
        });
        assert.ok(clearance.gap>=16,'disclosure clears the fixed lamp: '+JSON.stringify(clearance));
        assert.ok(clearance.horizontal<=1);

        const toggle=page.locator('#fabToggle'),items=page.locator('.fab-item');
        await toggle.focus();await page.keyboard.press('Enter');
        assert.equal(await toggle.getAttribute('aria-expanded'),'true');
        assert.ok(await items.first().evaluate(n=>n===document.activeElement));
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('#fabMenu')).opacity==='1');
        await solid(page.locator('#fabMenu'));
        const count=await items.count();
        // Follow actual tab order: focus rings and short-viewport scrolling must work.
        for(let i=0;i<count;i++) {
          const item=items.nth(i);
          assert.ok(await item.evaluate(n=>n===document.activeElement&&n.matches(':focus-visible')));
          await solid(item);await inView(item);
          assert.ok(await item.evaluate(n=>parseFloat(getComputedStyle(n).outlineWidth)*(parseFloat(getComputedStyle(document.body).zoom)||1)>=2.99),'at least a 3px rendered focus ring');
          assert.ok((await item.boundingBox()).height>=44);
          await page.keyboard.press('Tab');
        }
        assert.ok(await toggle.evaluate(n=>n===document.activeElement));
        for(let i=0;i<count;i++) {
          await items.nth(i).hover();await solid(items.nth(i));
          await page.mouse.down();await solid(items.nth(i));
          // Releasing off the target avoids navigation or contacting a service.
          await page.mouse.move(1,1);await page.mouse.up();
        }
        await items.first().focus();await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'),'false');
        assert.ok(await toggle.evaluate(n=>n===document.activeElement));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

        await page.emulateMedia({forcedColors:'active'});
        await page.waitForFunction(()=>matchMedia('(forced-colors:active)').matches&&getComputedStyle(document.querySelector('.cc-license-symbols')).filter==='none');
        await page.locator('.hdr__link').hover();
        assert.equal(await logo.evaluate(n=>getComputedStyle(n).opacity),'0','the filtered logo yields to the system-color fallback');
        assert.equal(await page.locator('.hdr__logo').evaluate(n=>getComputedStyle(n,'::before').display),'block','system-color logo remains visible, including on hover');
        await toggle.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('#fabMenu')).opacity==='1');
        await solid(page.locator('#fabMenu'));
        for(let i=0;i<count;i++)await solid(items.nth(i));
        assert.equal(await page.locator('.cc-license-symbols').evaluate(n=>getComputedStyle(n).filter),'none');
        await page.keyboard.press('Escape');
        await page.emulateMedia({forcedColors:'none'});
        await page.waitForFunction(()=>!matchMedia('(forced-colors:active)').matches);
        // The separate chat overlay's local controls are also solid and keyboard operable.
        await toggle.click();await page.locator('#fabAskUs').click();
        await solid(page.locator('.chat-modal__link'));await solid(page.locator('.chat-modal__close'));
        await page.locator('.chat-modal__close').hover();await solid(page.locator('.chat-modal__close'));
        await page.keyboard.press('Escape');assert.ok(await toggle.evaluate(n=>n===document.activeElement));
        assert.deepEqual(errors,[]);
        console.log('PASS '+file+' @'+viewport.width+'x'+viewport.height+': solid hover/focus/pressed controls, keyboard, forced colors, exact content');
        await context.close();
      }
    }
  } finally {await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
