/* Links that are unknown or cut off must still leave a working page, and the curated
   records must read correctly in both tools. */
const assert=require('assert/strict'),path=require('path');
const {chromium}=require('playwright');
const {createContext}=require('./browser');
const {start}=require('./serve');
const D=require('./public-data');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
(async()=>{
 const server=await start({dir:SITE}),browser=await chromium.launch();
 let checks=0;
 try{
  const ctx=await createContext(browser,{viewport:{width:1280,height:900},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const go=async f=>{await p.goto('about:blank');await p.goto(server.url(f));await p.waitForSelector('html[data-ready]');};
  const text=sel=>p.locator(sel).first().textContent();
  const ok=(cond,msg)=>{assert.ok(cond,msg);checks++;};

  // 1 · a broken %-escape never blanks the page
  await go('what-if-ai.html#a=focus:teaching;task:%E0%A4%A');
  ok((await text('#wizard')).includes('What are you working on?'),'Finder falls back to the first question');
  await go('what-if-ai.html#act=%');
  ok(await p.locator('#missingAct').isVisible(),'Finder names a broken activity link');
  ok(!(await p.locator('#actDialog').evaluate(d=>d.open)),'no dialog opens for a broken link');
  ok((await text('#wizard')).includes('What are you working on?'),'questions stay available');
  await go('register.html#act=%');
  ok(await p.locator('#missingAct').isVisible(),'Register names a broken activity link');
  ok(await p.locator('#actResults [data-card]').count()>0,'Register still lists activities');
  await go('register.html#src=%E0');
  ok(await p.locator('#sources .srclist li, #sources [id^="src-"]').count()>0,'Register still lists sources');
  await go('register.html#activities?q=%&x=1');
  ok(await p.locator('#actResults [data-card]').count()>0,'a broken search term is ignored');
  await go('register.html#activities?q=100%25%20(AI');
  ok(await p.locator('#gq').inputValue()==='100% (AI','an encoded percent sign still round-trips');

  // 2 · unknown activity links say so in both tools
  for(const id of ['UNKNOWN-ACTIVITY','NOPE-123']){
    for(const f of ['what-if-ai.html','register.html']){
      await go(f+'#act='+id);
      ok(await p.locator('#missingAct').isVisible(),id+' is reported missing in '+f);
      ok((await text('#missingAct')).includes(id),'the note names '+id);
      ok(!(await p.locator('#actDialog').evaluate(d=>d.open)),id+' does not open in '+f);
    }
  }
  // the Finder note goes away once the reader moves on
  await go('what-if-ai.html#act=NOPE-123');
  await p.evaluate(()=>{location.hash='#a=focus:teaching;task:feedback';});
  await p.waitForSelector('#plan:not([hidden])');
  ok(await p.locator('#missingAct').count()===0,'the note clears on the next address');

  // A broken hash reached while a dialog is open must not leave the old activity on screen.
  for(const f of ['what-if-ai.html','register.html']){
    for(const id of ['%','UNKNOWN-ACTIVITY']){
      await go(f+'#act='+D.acts[0].id);
      await p.evaluate(id=>{location.hash='#act='+id;},id);
      await p.waitForSelector('#missingAct');
      ok(!(await p.locator('#actDialog').evaluate(d=>d.open)),'stale dialog closes in '+f);
      await p.evaluate(id=>{location.hash='#act='+id;},D.acts[0].id);
      await p.waitForSelector('#actDialog[open]');
      ok(await p.locator('#missingAct').count()===0,'valid activity clears the old missing notice in '+f);
    }
  }

  // 3 · a reclassified record keeps its caution and reads as a licensed adaptation
  const spec=D.acts.find(a=>a.use==='unreported');
  for(const f of ['what-if-ai.html','register.html']){
    await go(f+'#act='+spec.id);
    const body=await text('#actDialog .dlg__body');
    ok(body.includes('A published prompt or workflow.')&&body.includes('no results from using it have been reported'),'caution note in '+f);
    ok(body.includes('Licensed Adaptation.')&&!body.includes('Prompt Specification'),'controlled provenance label in '+f);
  }
  const reported=D.acts.find(a=>a.use!=='unreported');
  await go('what-if-ai.html#act='+reported.id);
  ok(!(await text('#actDialog .dlg__body')).includes('A published prompt or workflow.'),'no caution note on reported activities');

  // 4 · a license recorded without a version shows no invented deed link
  const tge=D.acts.find(a=>a.lic==='CC BY-NC (version not stated)'&&(a.attr||'').includes('TextGenEd'));
  await go('register.html#act='+tge.id);
  ok(await p.locator('#actDialog .dlg__body a[href*="creativecommons.org/licenses/by-nc/4.0"]').count()===0,'no 4.0 deed for an unversioned license');
  ok((await text('#actDialog .dlg__body')).includes('CC BY-NC (version not stated)'),'the unversioned license is shown as stated');

  // The original 2023 collection explicitly links a 4.0 deed; later releases are separate.
  const original=D.acts.find(a=>a.rel.some(r=>r[0]==='CSR-0205'));
  for(const f of ['what-if-ai.html','register.html']){
    await go(f+'#act='+original.id);
    ok(await p.locator('#actDialog .dlg__body a[href="https://creativecommons.org/licenses/by-nc/4.0/"]').count()>0,'confirmed 4.0 deed remains available in '+f);
    ok(!(await text('#actDialog .dlg__body')).includes('version not stated'),'original collection attribution agrees with its license in '+f);
  }

  ok(errors.length===0,'no page errors: '+errors.join('; '));
  console.log(`PASS: ${checks} checks — broken %-escapes, unknown links in both tools, reclassified records, and unversioned licenses.`);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
