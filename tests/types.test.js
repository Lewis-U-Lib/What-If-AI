/* Type-dialog behavior against the built site, including its real CSP and base path. */
const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {chromium}=require('playwright');
const {createContext}=require('./browser');
const {start}=require('./serve');
const out=process.env.TYPE_SCREENSHOTS;
if(out) fs.mkdirSync(out,{recursive:true});
const SITE=path.resolve(process.argv[2] || path.join(__dirname,'..','_site'));
let server=null;
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/register.json'))).types;
async function screenshot(page,name){if(out) await page.screenshot({path:path.join(out,name)});}
async function tick(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function layout(page){return page.evaluate(()=>({scroll:scrollY,height:document.documentElement.scrollHeight,cards:[...document.querySelectorAll('.type--compact')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y+scrollY,r.width,r.height]})}));}
async function box(page){return page.locator('#aiTypeDialog').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,sw:n.scrollWidth,cw:n.clientWidth,sh:n.scrollHeight,ch:n.clientHeight};});}
(async()=>{
 server=await start({dir:SITE});
 const browser=await chromium.launch({headless:true});
 const context=await createContext(browser,{viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>{(window.typeCspErrors=window.typeCspErrors||[]).push(e.violatedDirective);}));
 await page.goto(server.url('register.html#ai-types'));await page.waitForSelector('html[data-ready]');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-open-type]').count(),12);
 await page.locator('.type-grid-guide').evaluate(n=>scrollTo({top:n.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));
 await screenshot(page,'register-type-popups-grid.png');
 const results={types:[],widths:[],errors};
 for(const t of source.types){
   const opener=page.locator('[data-open-type="'+t.key+'"]');
   await opener.scrollIntoViewIfNeeded();await opener.focus();
   const before=await layout(page);
   await page.keyboard.press('Enter');await tick(page);
   assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),'');
   assert.equal(await page.locator('#aiTypeDialogTitle').textContent(),t.name);
   assert.equal(await page.locator('.type-dialog__description').textContent(),t.what);
   assert.deepEqual(await page.locator('.type-info dd').allTextContents(),[t.does,t.io,t.why,t.limits]);
   assert.equal(await page.locator('.type-example-disclosure').getAttribute('open'),null);
   assert.equal(await page.locator('.type-example').first().isVisible(),false);
   const ordered=await page.locator('#aiTypeDialog').evaluate(n=>{const els=[n.querySelector('h2'),n.querySelector('.type-dialog__description'),n.querySelector('.type-info'),n.querySelector('.type-example-disclosure')];return els.slice(1).every((e,i)=>!!(els[i].compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING));});
   assert.ok(ordered);
   if(t.key==='conversational'){
     await screenshot(page,'register-type-popups-dialog.png');
     for(let i=0;i<10;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('#aiTypeDialog')));}
   }
   const small=await box(page);
   await page.locator('.type-example-disclosure > summary').click();await tick(page);
   assert.equal(await page.locator('.type-example').count(),3);
   assert.equal(await page.locator('.type-example').first().isVisible(),true);
   assert.ok(await page.locator('.type-example').evaluateAll(links=>links.every(a=>a.href.startsWith('https://')&&a.rel.includes('noopener')&&a.rel.includes('noreferrer'))));
   const large=await box(page);assert.equal(large.h,small.h);assert.equal(large.y,small.y);assert.equal(large.w,small.w);
   if(t.key==='conversational'){
     await page.locator('.type-dialog__body').evaluate(n=>n.scrollTop=n.scrollHeight);
     await screenshot(page,'register-type-popups-examples.png');
   }
   await page.keyboard.press('Escape');await tick(page);
   assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),null);
   assert.equal(await opener.evaluate(n=>document.activeElement===n),true);
   assert.deepEqual(await layout(page),before);
   results.types.push({key:t.key,detailsPreserved:true,examplesInitiallyHidden:true,modalStable:true,pageStable:true});
 }
 await page.locator('[data-open-type="noai"]').click();
 assert.equal(await page.locator('.type-dialog__description').textContent(),source.no_ai.text);
 await page.keyboard.press('Escape');await tick(page);
 for(const width of [1440,1024,768,761,760,700,650,390,320]){
   await page.setViewportSize({width,height:900});
   await page.locator('[data-open-type="institutional"]').click();await tick(page);
   const b=await box(page);
   assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=901,JSON.stringify({width,b}));
   assert.ok(b.sw<=b.cw&&b.sh<=b.ch+1,JSON.stringify({width,b}));
   const bodyOverflow=await page.locator('.type-dialog__body').evaluate(n=>n.scrollWidth>n.clientWidth);
   assert.equal(bodyOverflow,false);
   await page.locator('.type-example-disclosure > summary').click();await tick(page);
   const expanded=await box(page);
   assert.deepEqual([expanded.x,expanded.y,expanded.w,expanded.h],[b.x,b.y,b.w,b.h]);
   assert.equal(await page.locator('#aiTypeDialog').evaluate(n=>n.scrollTop),0);
   results.widths.push({width,modalFits:true,noHorizontalOverflow:true,examplesDoNotResize:true});
   if(width===390){
     await page.locator('.type-example-disclosure > summary').click();
     await page.locator('.type-dialog__body').evaluate(n=>n.scrollTop=0);
     await screenshot(page,'register-type-popups-mobile.png');
   }
   await page.getByRole('button',{name:'Close type details'}).click();await tick(page);
 }
 // Following the activity link closes the modal and lands on the matching filter.
 await page.setViewportSize({width:1440,height:1050});
 await page.locator('[data-open-type="image"]').click();
 await page.locator('[data-type-activities]').click();await tick(page);
 assert.ok(page.url().endsWith('#activities?cap=image_generation'));
 assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),null);
 assert.equal(await page.locator('#activities').isVisible(),true);
 assert.equal(await page.locator('html').evaluate(n=>n.classList.contains('type-dialog-open')),false);
 await page.locator('[data-sec="ai-types"]').click();await tick(page);
 await page.locator('[data-open-type="conversational"]').click();
 assert.equal(await page.locator('.type-example-disclosure').getAttribute('open'),null);
 await page.keyboard.press('Escape');await tick(page);
 // Browser history can leave the type section while a modal is open.
 await page.locator('[data-sec="policies"]').click();await tick(page);
 await page.locator('[data-sec="ai-types"]').click();await tick(page);
 await page.locator('[data-open-type="image"]').click();
 await page.goBack();await tick(page);
 assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),null);
 assert.equal(await page.locator('#policies').isVisible(),true);
 assert.equal(await page.locator('html').evaluate(n=>n.classList.contains('type-dialog-open')),false);
 assert.deepEqual(await page.evaluate(()=>window.typeCspErrors||[]),[]);
 assert.equal(errors.length,0);
 console.log('PASS: all '+results.types.length+' AI types preserve their full details; examples start hidden; pop-ups and page positions stay fixed.');
 console.log('PASS: keyboard focus, close/reopen, related activities, and '+results.widths.length+' screen widths. No browser errors.');
 await browser.close();await server.close();
})().catch(e=>{console.error(e);process.exit(1)});
