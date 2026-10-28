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
// Public descriptions include the sourced guide; classification links stay upstream-owned.
const version=JSON.parse(fs.readFileSync(path.join(SITE,'version.json')));
const source=JSON.parse(fs.readFileSync(path.join(SITE,version.assets['data/register.json']))).types;
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
 assert.equal(await page.locator('.type-group').count(),3);
 assert.deepEqual(await page.locator('[aria-labelledby="tg-choices"] [data-open-type]').evaluateAll(ns=>ns.map(n=>n.dataset.openType)),['institutional','noai']);
 assert.equal(await page.locator('.type-bibliography .type-sources li').count(),source.sources.length);
 assert.deepEqual(await page.locator('.type-bibliography .type-qualifiers li').allTextContents(),source.qualifiers);
 assert.equal((await page.locator('#ai-types').textContent()).includes('Source check:'),false);
 for(const s of source.sources){
   assert.equal(await page.locator('.type-bibliography li[value="'+s.id+'"] a').getAttribute('href'),s.url);
 }
 const bibliography=page.locator('.type-bibliography__list');
 const bibliographyToggle=bibliography.locator('summary');
 assert.equal(await bibliography.getAttribute('open'),null);
 assert.equal(await bibliography.locator('.type-sources').isVisible(),false);
 await bibliographyToggle.focus();await page.keyboard.press('Enter');
 assert.equal(await bibliography.locator('.type-sources').isVisible(),true);
 await page.keyboard.press('Enter');
 assert.equal(await bibliography.locator('.type-sources').isVisible(),false);
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
   assert.equal(await page.locator('.type-dialog__description .type-field-text').textContent(),t.what);
   assert.deepEqual(await page.locator('.type-slide .type-field-text').allTextContents(),[t.does,t.io,t.why,t.limits]);
   /* five slides, one showing at a time: the four explanation fields, then References */
   assert.deepEqual(await page.locator('.type-slide h3').allTextContents(),['What it does','Inputs and outputs','Illustrative faculty use','Limits and open questions','References']);
   assert.deepEqual(await page.locator('.type-slide').evaluateAll(ns=>ns.map(n=>n.hidden)),[false,true,true,true,true]);
   assert.equal(await page.locator('#typePos').textContent(),'1 of 5');
   /* All five watercolor scenes decode locally, keep their proportions, and have clear edges. */
   const art=await page.locator('.type-slide__art').evaluateAll(async ns=>{
     return Promise.all(ns.map(async n=>{
       const css=getComputedStyle(n,'::before'),url=css.backgroundImage.slice(5,-2),img=new Image();
       img.src=url;await img.decode();
       const size=css.backgroundSize.split(' ').map(parseFloat),pos=css.backgroundPosition.split(' ').map(parseFloat);
       const w=img.naturalWidth*100/size[0],h=img.naturalHeight*100/size[1];
       const x=Math.round((img.naturalWidth-w)*pos[0]/100),y=Math.round((img.naturalHeight-h)*pos[1]/100);
       const cw=Math.round(w),ch=Math.round(h),canvas=document.createElement('canvas');
       canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
       const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
       const pixels=ctx.getImageData(x,y,cw,ch).data;
       const alpha=(px,py)=>pixels[(py*cw+px)*4+3];
       let edgeAlpha=0;
       for(let px=0;px<cw;px++)edgeAlpha=Math.max(edgeAlpha,alpha(px,0),alpha(px,ch-1));
       for(let py=0;py<ch;py++)edgeAlpha=Math.max(edgeAlpha,alpha(0,py),alpha(cw-1,py));
       const ratio=parseFloat(css.getPropertyValue('--art-width'))/parseFloat(css.getPropertyValue('--art-height'));
       return {hidden:n.getAttribute('aria-hidden'),url,position:css.backgroundPosition,width:img.naturalWidth,height:img.naturalHeight,
         validCrop:x>=0&&y>=0&&cw>0&&ch>0&&x+cw<=img.naturalWidth&&y+ch<=img.naturalHeight,
         undistorted:Math.abs(w/h-ratio)<.0001,edgeAlpha};
     }));
   });
   assert.equal(art.length,5,t.key+' has an illustration on every slide');
   assert.ok(art.every(a=>a.hidden==='true'&&a.width===1536&&a.height===1024&&a.validCrop&&a.undistorted&&a.edgeAlpha<=8&&new URL(a.url).origin===new URL(server.origin).origin),JSON.stringify(art));
   assert.equal(new Set(art.map(a=>a.url)).size,1,'one cached atlas per type');
   assert.equal(new Set(art.map(a=>a.position)).size,5,'each slide has its own illustration');
   assert.ok(art[0].url.includes('/types-'+t.key+'.'),'the atlas matches the entry');
   if(out){
     for(let i=0;i<5;i++){
       await page.locator('.type-slide:not([hidden])').scrollIntoViewIfNeeded();
       await screenshot(page,'type-'+t.key+'-'+(i+1)+'.png');
       if(i<4) await page.locator('#typeNext').click();
     }
     await page.keyboard.press('Home');
   }
   assert.equal(await page.locator('.type-slide').nth(4).locator('.type-sources li').count(),[...new Set(Object.values(t.citations).flat())].length);
   const cited=[...new Set(Object.values(t.citations).flat())].sort((a,b)=>a-b);
   assert.deepEqual(await page.locator('#aiTypeDialog .type-sources li').evaluateAll(ns=>ns.map(n=>Number(n.value))),cited);
   assert.equal((await page.locator('#aiTypeDialog').textContent()).includes('Source check:'),false);
   assert.ok(await page.locator('#aiTypeDialog .type-cite').count()>0);
   assert.equal(await page.locator('.type-example .type-cite').count(),0);
   assert.ok(await page.locator('#aiTypeDialog .type-cite').evaluateAll(ns=>ns.every(n=>n.getAttribute('aria-label').includes('Source ')&&n.getAttribute('aria-label').includes('opens in a new tab'))));
   assert.equal(await page.locator('.type-example-disclosure').getAttribute('open'),null);
   assert.equal(await page.locator('.type-example').first().isVisible(),false);
   const ordered=await page.locator('#aiTypeDialog').evaluate(n=>{const els=[n.querySelector('h2'),n.querySelector('.type-dialog__description'),n.querySelector('.type-info'),n.querySelector('.type-example-disclosure')];return els.slice(1).every((e,i)=>!!(els[i].compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING));});
   assert.ok(ordered);
   if(t.key==='conversational'){
     /* paging: Next, Previous, arrow keys, End, a dot; the controls stay put; the last Next returns to the types */
     const navY=async()=>Math.round((await page.locator('#typeNext').boundingBox()).y),y0=await navY();
     const shown=()=>page.locator('.type-slide').evaluateAll(ns=>ns.findIndex(n=>!n.hidden));
     await page.locator('#typeNext').click();assert.equal(await shown(),1);assert.equal(await navY(),y0);
     await page.locator('#typePrev').click();assert.equal(await shown(),0);
     assert.equal(await page.locator('#typePrev').getAttribute('aria-disabled'),'true');
     await page.locator('#aiTypeDialog .type-dialog__body').focus();await page.keyboard.press('ArrowRight');assert.equal(await shown(),1);
     await page.keyboard.press('End');assert.equal(await shown(),4);assert.equal(await navY(),y0);
     assert.equal((await page.locator('#typeNext .tour__nextlabel').textContent()),'Back to types');
     await page.keyboard.press('Home');assert.equal(await shown(),0);
     if(await page.locator('[data-type-dot="2"]').isVisible()){await page.locator('[data-type-dot="2"]').click();assert.equal(await shown(),2);await page.keyboard.press('Home');}
     /* PR #32 review regression: hiding a focused citation must not strand focus on body. */
     await page.locator('.type-slide:not([hidden]) a').first().focus();
     await page.keyboard.press('ArrowRight');assert.equal(await shown(),1);
     assert.ok(await page.evaluate(()=>document.activeElement.matches('.type-slide:not([hidden])')));
     await page.keyboard.press('End');assert.equal(await shown(),4);
     await page.locator('.type-slide:not([hidden]) a').first().focus();
     await page.keyboard.press('Home');assert.equal(await shown(),0);
     assert.ok(await page.evaluate(()=>document.activeElement.matches('.type-slide:not([hidden])')));
     await page.locator('#typeNext').focus();await page.keyboard.press('ArrowRight');
     assert.equal(await page.evaluate(()=>document.activeElement.id),'typeNext','footer focus stays on its control');
     await page.keyboard.press('Home');
     /* nothing on a hidden slide can take focus */
     assert.ok(await page.locator('#aiTypeDialog').evaluate(d=>[...d.querySelectorAll('.type-slide[hidden] a')].every(a=>a.getClientRects().length===0)));
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
   if(t.key==='image'){
     await page.keyboard.press('End');await page.locator('#typeNext').click();await tick(page);
     assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),null,'Back to types closes the window');
     assert.equal(await opener.evaluate(n=>document.activeElement===n),true);
   } else {
     await page.keyboard.press('Escape');await tick(page);
   }
   assert.equal(await page.locator('#aiTypeDialog').getAttribute('open'),null);
   assert.equal(await opener.evaluate(n=>document.activeElement===n),true);
   assert.deepEqual(await layout(page),before);
   results.types.push({key:t.key,detailsPreserved:true,examplesInitiallyHidden:true,modalStable:true,pageStable:true});
 }
 await page.locator('[data-open-type="noai"]').click();
 assert.equal(await page.locator('.type-dialog__description .type-field-text').textContent(),source.no_ai.text);
 assert.equal(await page.locator('#aiTypeDialog .kicker').textContent(),'Access and teaching choices');
 assert.equal(await page.locator('#aiTypeDialog .type-sources li').count(),2);
 assert.equal(await page.locator('#typeEvidenceHeading').textContent(),'References');
 assert.equal(await page.locator('#aiTypeDialog [data-type-slide]').count(),0,'the no-AI choice has no slides');
 assert.equal(await page.locator('#aiTypeDialog .type-slide__art').count(),0,'the no-AI choice retains its single page');
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
