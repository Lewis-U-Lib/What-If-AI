/* Reproduce the October 9 audit failures against actual browser behavior.
   External tracking/chat are intercepted; no production feedback is submitted. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const engines=require('playwright'),{createContext:baseContext}=require('./browser'),{start:baseStart}=require('./serve');
// WebKit applies upgrade-insecure-requests even to loopback; use local TLS when supplied.
const tls=process.env.AUDIT_TLS_CERT?{cert:fs.readFileSync(process.env.AUDIT_TLS_CERT),key:fs.readFileSync(process.env.AUDIT_TLS_KEY)}:null;
const start=options=>baseStart({...options,tls});
const createContext=(browser,options={})=>baseContext(browser,{...options,ignoreHTTPSErrors:!!tls});
const {AxeBuilder}=require('@axe-core/playwright');
const M=require('../src/js/matching'),D=require('./public-data');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
const KEY='lul-whatifai-saved-v1',ID='CAN-L-014';
const unsafe=['javascript:alert(1)','data:text/html,test','vbscript:x','//example.org','https://example.org/\nx'];
let count=0;function pass(m){count++;console.log('PASS '+m);}
async function ready(p){await p.waitForSelector('html[data-ready]',{state:'attached'});await p.evaluate(()=>document.fonts.ready);}
(async()=>{
 const server=await start({dir:SITE}),browser=await engines[process.env.AUDIT_BROWSER||'chromium'].launch();
 try{
  for(const na of [undefined,'','  \n ',false,true,[]])assert.equal(M.requirement({op:'students',na},'noai'),'excluded');
  const cost=D.acts.filter(a=>a.eq==='no_tool_needed'&&a.op==='faculty_or_staff');assert.equal(cost.length,44);
  for(const a of cost)for(const k of ['nopaid','noaccount','noapproval'])assert.notEqual(M.requirement(a,k),'confirmed',a.id+': '+k);
  const optional=D.acts.find(a=>a.id==='CAN-A2-A-097');assert.equal(optional.op,'optional');assert.ok(optional.na.trim());
  assert.equal(M.requirement(optional,'noai'),'confirmed');
  assert.equal(M.requirement(optional,'nostudent'),'excluded');
  assert.equal(M.requirement(optional,'nodisclose'),'excluded');
  pass('route validation and all 44 preparation candidates stay conservative; optional participation preserves other restrictions');
  const ctx=await createContext(browser,{viewport:{width:1280,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const go=async(file,hash='')=>{await p.goto('about:blank');await p.goto(server.url(file+hash));await ready(p);};
  for(const file of ['what-if-ai.html','register.html']){
   await go(file,'#act='+optional.id);await p.waitForSelector('#actDialog[open]');
   assert.match(await p.locator('#actDialog').innerText(),/without a generative AI tool/);
   assert.match(await p.locator('#actDialog').innerText(),/requirements recorded above describe the main design/);
   assert.equal(await p.evaluate(id=>FINDER_MATCH.search(SITE.A.filter(a=>a.id===id),{limits:{noai:true}}).confirmed,optional.id),1);
   const render=await p.evaluate(()=>SITE.detailHTML(SITE.BYID['CAN-A1-EQ-017'],{}));
   assert.match(render,/No student AI tool; instructor access and cost need checking/);
   const faults=await p.evaluate(values=>values.flatMap(url=>{
    const d=document.createElement('div');d.innerHTML=SITE.detailHTML({...SITE.A[0],url,licu:url},{});
    return [...d.querySelectorAll('a')].filter(a=>!['http:','https:'].includes(a.protocol)&&!a.getAttribute('href').startsWith('#')).map(a=>a.href);
   }),unsafe);assert.deepEqual(faults,[]);
   await p.keyboard.press('Escape');
   await p.locator('#privacy summary').click();assert.match(await p.locator('#privacy').innerText(),/Umami/);
   assert.match(await p.locator('#privacy').innerText(),/LibAnswers/);
   assert.deepEqual((await new AxeBuilder({page:p}).include('.site-foot').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,[]);
  }
  await go('register.html','#activities?q='+optional.id+'&noai=1');assert.equal(await p.locator('[data-card="'+optional.id+'"]').count(),1);
  await go('register.html','#activities?q=CAN-A1-EQ-017&cost=1');assert.equal(await p.locator('[data-card="CAN-A1-EQ-017"]').count(),0);
  await go('register.html','#policies');
  const policies=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/register.json'))).policy;
  for(const tier of policies.tiers){
   await p.locator('#pt-'+tier.key).click();
   assert.deepEqual(await p.locator('#policies blockquote p').allTextContents(),tier.items.map(q=>'“'+q.quote+'”'));
   assert.equal(await p.locator('#policies .quotes a').count(),tier.items.length);
   assert.match(await p.locator('#policies').innerText(),/accessed 2026-10-09/);
  }
  await go('register.html','#src=SRC-0181');assert.match(await p.locator('#src-SRC-0181').innerText(),/replacement has not been verified/);
  pass('both tools show optional participation, preparation qualifications, route limits, privacy details, and all 21 dated policy excerpts');

  // Exercise actual persistent storage, reload, a second page, quota failure, and blocked reads.
  for(const mode of ['normal','quota','blocked-read','silent-write']){
   const c=await createContext(browser,{viewport:{width:1280,height:900}});
   if(mode!=='normal')await c.addInitScript(({mode,key})=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    Storage.prototype.getItem=function(k){if(k===key&&mode==='blocked-read')throw new DOMException('Denied','SecurityError');return get.call(this,k);};
    Storage.prototype.setItem=function(k,v){if(k===key&&mode==='quota')throw new DOMException('Full','QuotaExceededError');if(k===key&&mode==='silent-write')return;return set.call(this,k,v);};
   },{mode,key:KEY});
   const q=await c.newPage();await q.goto(server.url('register.html#act='+ID));await ready(q);
   await q.locator('#actDialog [data-save]').click();await q.waitForTimeout(100);
   const persistent=mode==='normal';
   assert.equal(await q.evaluate(()=>SITE.Saved.isPersistent()),persistent);
   assert.equal(await q.locator('#actDialog [data-save] .save__txt').innerText(),persistent?'Saved':'Saved temporarily');
   assert.match(await q.locator('#srStatus').textContent(),persistent?/Saved:/:/Saved temporarily in this tab/);
   if(!persistent){
    assert.ok(await q.locator('#actDialog [data-storage-warning]').isVisible());
    assert.deepEqual((await new AxeBuilder({page:q}).include('#actDialog').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,[]);
    await q.locator('#actDialog [data-open-saved]').click();
   }else{await q.keyboard.press('Escape');await q.locator('.topbar [data-open-saved]').click();}
   await q.evaluate(()=>{window.print=()=>{window.__printed=true;};});await q.locator('#printSaved').click();
   await q.waitForFunction(()=>window.__printed);assert.equal(await q.evaluate(()=>window.__printed),true);assert.equal(await q.locator('#printRoot article h2').innerText(),D.acts.find(a=>a.id===ID).t);
   await q.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
   await q.reload();await ready(q);assert.equal(await q.evaluate(id=>SITE.Saved.has(id),ID),persistent);
   await q.goto(server.url('what-if-ai.html'));await ready(q);assert.equal(await q.evaluate(id=>SITE.Saved.has(id),ID),persistent);
   await c.close();
  }
  // A failed removal must not imply the persisted item is gone; storage can recover on a later write.
  await go('register.html','#act='+ID);await p.evaluate(id=>SITE.Saved.add(id),ID);
  await p.evaluate(()=>{window.__saveSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('blocked');};});
  await p.locator('#actDialog [data-save]').click();await p.waitForTimeout(100);
  assert.match(await p.locator('#srStatus').textContent(),/storage is unavailable/i);
  assert.equal(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).includes('CAN-L-014'),KEY),true);
  await p.evaluate(()=>{Storage.prototype.setItem=window.__saveSet;SITE.Saved.add('CAN-L-014');});
  assert.equal(await p.evaluate(()=>SITE.Saved.isPersistent()),true);
  assert.equal(await p.locator('#actDialog [data-storage-warning]').isVisible(),false);
  assert.equal(await p.locator('#actDialog [data-save] .save__txt').innerText(),'Saved');
  await p.keyboard.press('Escape');
  const other=await ctx.newPage();await other.goto(server.url('what-if-ai.html'));await ready(other);
  assert.equal(await other.evaluate(id=>SITE.Saved.has(id),ID),true);
  await p.evaluate(()=>SITE.Saved.clear());await other.waitForFunction(()=>!SITE.Saved.ids().length);
  await other.close();pass('persistent, quota, blocked-read, silent-write, reload, cross-tool, cross-tab, recovered-write, and print behavior');

  await p.route('**/audit-spacing.css',r=>r.fulfill({contentType:'text/css',body:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'}));
  // Actual Tab navigation must reveal the complete focused control inside every clipping ancestor.
  for(const [width,height] of [[390,300],[320,300],[640,320]])for(const spacing of [false,true]){
   await p.setViewportSize({width,height});await go('register.html','#act='+ID);
   if(spacing)await p.addStyleTag({url:server.url('audit-spacing.css')});
   await p.locator('#actDialog [data-dlg-title]').focus();const seen=new Set();let reachedCopy=false,reachedClose=false;
   for(let i=0;i<100;i++){
    await p.keyboard.press(process.env.AUDIT_BROWSER==='webkit'?'Alt+Tab':'Tab');await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const f=await p.evaluate(()=>{
     const el=document.activeElement,r=el.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth;
     for(let n=el.parentElement;n;n=n.parentElement){const s=getComputedStyle(n);if(/auto|scroll|hidden|clip/.test(s.overflowY)){const b=n.getBoundingClientRect();top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}if(/auto|scroll|hidden|clip/.test(s.overflowX)){const b=n.getBoundingClientRect();left=Math.max(left,b.left);right=Math.min(right,b.right);}}
     return {key:el.outerHTML.slice(0,350),visible:r.height>0&&r.width>0&&r.top>=top-1&&r.bottom<=bottom+1&&r.left>=left-1&&r.right<=right+1,copy:el.hasAttribute('data-copy-act'),close:el.hasAttribute('data-close')&&!!el.closest('.dlg__foot'),rect:[r.top,r.bottom,top,bottom],inside:!!el.closest('#actDialog')};
    });
    assert.ok(f.inside,JSON.stringify({width,height,spacing,f}));assert.ok(f.visible,JSON.stringify({width,height,spacing,f}));
    reachedCopy ||= f.copy;reachedClose ||= f.close;if(reachedCopy&&reachedClose)break;if(seen.has(f.key))break;seen.add(f.key);
   }
   assert.ok(reachedCopy&&reachedClose,'copy and footer Close were reached');
   await p.keyboard.press('Escape');assert.equal(await p.locator('#actDialog').getAttribute('open'),null);
  }
  pass('every dialog control remains visible during keyboard navigation at three short viewports with and without text-spacing overrides');
  await p.setViewportSize({width:1280,height:900});
  const badCtx=await createContext(browser);await badCtx.route(/data\/(register|guide)\.[a-f0-9]+\.json/,async route=>{
   const response=await route.fetch(),data=await response.json();
   if(Array.isArray(data)){data.forEach(g=>g.url='javascript:alert(1)');}
   else{data.works[0].link='javascript:alert(1)';data.types.sources[0].url='data:text/html,test';data.policy.source.url='javascript:alert(1)';data.policy.local.url='javascript:alert(1)';data.policy.tiers.forEach(t=>t.items.forEach(q=>q.source_url='javascript:alert(1)'));}
   await route.fulfill({response,json:data});
  });
  const bad=await badCtx.newPage();
  for(const hash of ['#sources','#policies','#ai-types']){
   await bad.goto(server.url('register.html'+hash));await ready(bad);
   assert.deepEqual(await bad.locator('a[href]').evaluateAll(as=>as.map(a=>a.href).filter(h=>/^(javascript|data|vbscript):/i.test(h))),[]);
  }
  await badCtx.close();pass('unsafe external-link fixtures are never rendered as executable links');
  assert.deepEqual(errors,[]);await ctx.close();
  // Fixed byte budgets catch material growth; network timing remains an observation, not a portable promise.
  for(const [file,budget] of [['what-if-ai.html',1250000],['register.html',1450000]]){
   const log=[],s=await start({dir:SITE,log}),c=await createContext(browser),q=await c.newPage();
   await q.goto(s.url(file));await ready(q);await q.waitForTimeout(200);
   const paths=[...new Set(log.map(x=>x.path))];
   const bytes=paths.reduce((n,p)=>n+zlib.gzipSync(fs.readFileSync(path.join(SITE,p))).length,0);
   assert.ok(bytes<=budget,`${file}: ${bytes} gzip bytes exceed ${budget}`);
   console.log(`${file}: ${bytes} gzip-equivalent bytes; budget ${budget}`);
   await c.close();await s.close();
  }
  pass('cold-load compressed-byte budgets; no script errors');
  console.log(`PASS: ${count} audit-remediation groups`);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
