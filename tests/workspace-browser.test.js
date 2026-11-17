const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {AxeBuilder}=require('@axe-core/playwright');
const {createContext}=require('./browser');
const {start}=require('./serve');
const W=require('../src/js/workspace-data');
(async()=>{
 const server=await start(),browser=await chromium.launch();
 try{
  const ctx=await createContext(browser,{viewport:{width:1440,height:900}}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const go=async file=>{
    await p.goto(server.url(file));await p.waitForSelector('html[data-ready]');
    await p.evaluate(()=>document.fonts.ready);
    await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  await go('what-if-ai.html');
  const first=await p.locator('[name="q-focus"]').first().boundingBox();assert.ok(first.y+first.height<900,'first task choice is above the desktop fold');
  await p.locator('.topbar [data-reading-toggle]').click();
  assert.equal(await p.locator('html').getAttribute('data-reading'),'plain');
  await p.locator('#fabToggle').click();await p.locator('[data-theme-toggle]').click();await p.keyboard.press('Escape');
  assert.equal(await p.locator('html').getAttribute('data-theme'),'blue');assert.equal(await p.locator('html').getAttribute('data-reading'),'plain');
  let axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[],'plain opening screen');
  await go('what-if-ai.html#a=focus:teaching;task:design;disc:humanities;depth:quick;lim:nopaid');
  assert.equal(await p.locator('#rTitle').textContent(),'Start with 4 exact matches');
  assert.equal(await p.locator('[data-match-group="exact"] [data-card]').count(),4);
  for(const key of ['compatible','close','unknown'])assert.equal(await p.locator('[data-result-disclosure="'+key+'"]').getAttribute('open'),null);
  await p.locator('[data-review-results]').click();assert.ok(await p.locator('[data-match-group="exact"] [data-open]').first().evaluate(e=>e===document.activeElement));
  const ids=await p.locator('[data-match-group="exact"] [data-card]').evaluateAll(es=>es.map(e=>e.dataset.card));
  for(const id of ids)await p.locator('[data-card="'+id+'"] [data-save]').click();
  await p.locator('.topbar [data-open-saved]').click();
  for(const id of ids.slice(0,3))await p.locator('[data-compare-choice="'+id+'"]').check();
  await p.locator('[data-compare-choice="'+ids[3]+'"]').check().catch(()=>{});
  assert.equal(await p.locator('[data-compare-choice]:checked').count(),3);
  await p.locator('[data-compare-selected]').click();
  assert.equal(await p.locator('#compareDialog th[scope="col"]').count(),4);
  assert.match(await p.locator('#compareDialog').textContent(),/Preparation: unknown/);
  axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(axe.violations,[],'comparison table');
  await p.locator('#compareDialog [data-plan-trial]').first().click();
  await p.locator('#trial-goal').fill('Check reasoning before and after a small trial.');
  await p.locator('#trial-trial').fill('<img src=x onerror=alert(1)> is literal planning text.');
  assert.match(await p.locator('#trialState').textContent(),/Saved in this browser/);
  assert.equal(await p.locator('#trialDialog img').count(),0);
  const downloadPromise=p.waitForEvent('download');await p.locator('#trialDialog [data-export-collection]').click();const download=await downloadPromise;
  const data=W.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(data.saved.length,4);assert.equal(data.plans[ids[0]].goal,'Check reasoning before and after a small trial.');
  await go('register.html');assert.equal(await p.locator('html').getAttribute('data-reading'),'plain');
  await p.locator('.topbar [data-open-saved]').click();await p.locator('[data-plan-trial="'+ids[0]+'"]').click();
  assert.equal(await p.locator('#trial-goal').inputValue(),data.plans[ids[0]].goal);
  await p.locator('#trial-goal').fill('Keep this newer draft');await p.keyboard.press('Escape');
  await p.locator('[data-import-collection]').setInputFiles({name:'collection.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await p.locator('[data-confirm-restore]').click();assert.match(await p.locator('#restorePreview').textContent(),/1 existing trial plan/);
  await p.locator('[data-plan-trial="'+ids[0]+'"]').click();assert.equal(await p.locator('#trial-goal').inputValue(),'Keep this newer draft');await p.keyboard.press('Escape');
  await p.locator('[data-import-collection]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
  await p.waitForFunction(()=>document.getElementById('restorePreview').textContent.includes('version 1'));assert.equal(await p.locator('[data-confirm-restore]').count(),0);
  await p.evaluate(()=>{window.print=()=>{};});await p.locator('[data-print-brief]').click();
  assert.match(await p.locator('#printRoot').textContent(),/Keep this newer draft/);assert.match(await p.locator('#printRoot').textContent(),/Reference and reuse/);
  await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  const attributedId=await p.evaluate(()=>{
    const entry=SITE.A.find(a=>a.attr);if(!entry)throw new Error('No attributed entry available for print verification');
    SITE.Saved.add(entry.id);SITE.printSaved();return entry.id;
  });
  assert.ok(await p.locator('#printRoot').evaluate((e,id)=>e.textContent.includes(SITE.BYID[id].sum),ids[0]),'full narrative survives planning and printing');
  assert.ok(await p.locator('#printRoot').evaluate((e,id)=>SITE.BYID[id].attr.split('\n').filter(Boolean).every(line=>e.textContent.includes(line)),attributedId),'source attribution survives the full collection print');
  await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  await go('what-if-ai.html#act=__proto__');assert.equal(await p.locator('#actDialog').evaluate(d=>d.open),false);
  await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await p.locator('.topbar [data-reading-toggle]').isVisible(),false);
  await p.locator('#fabToggle').click();await p.locator('#fabMenu [data-reading-toggle]').click();
  assert.notEqual(await p.locator('html').getAttribute('data-reading'),'plain','reading view remains available in the mobile help menu');
  await p.locator('#fabMenu [data-reading-toggle]').click();await p.keyboard.press('Escape');
  for(const width of [1440,390]){
    await p.setViewportSize({width,height:900});
    for(const section of ['activities','ai-types','policies','sources']){
      await go('register.html#'+section);
      await p.waitForFunction(()=>Math.abs(document.getElementById('secnav').getBoundingClientRect().top-document.querySelector('.topbar').getBoundingClientRect().bottom-12)<2);
      const geometry=await p.evaluate(()=>({bar:document.querySelector('.topbar').getBoundingClientRect().bottom,nav:document.getElementById('secnav').getBoundingClientRect().top}));
      assert.ok(geometry.nav>=geometry.bar-1,'plain section menu clears the header at '+width+': '+JSON.stringify(geometry));
      axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      assert.deepEqual(axe.violations,[],'plain Register '+section+' at '+width);
    }
    await go('register.html#act='+ids[0]);
    await p.locator('#actDialog details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
    axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    assert.deepEqual(axe.violations,[],'plain activity details at '+width);
    await p.locator('#actDialog [data-plan-trial]').click();
    axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    assert.deepEqual(axe.violations,[],'plain trial worksheet at '+width);
  }
  const reviewed=await p.evaluate(id=>{
    SITE_DATA.editorial.entries[id]={reviewer:'Test reviewer',checkedOn:'2026-11-17',scope:'Test fixture only',uncertainty:'No general effectiveness claim',relevance:{kind:'transferable',note:'Adapt the materials.'},use:{kind:'reported',note:'A specific classroom report.',source:'https://example.org/use'},evidence:{kind:'outcome_report',note:'An outcome claim with stated limits.',source:'https://example.org/evidence'}};
    const html=FacultyWorkspace.reviewHTML(SITE.BYID[id],false),doc=new DOMParser().parseFromString(html,'text/html');
    return {text:doc.body.textContent,links:[...doc.querySelectorAll('a')].map(a=>a.href),print:FacultyWorkspace.reviewHTML(SITE.BYID[id],true)};
  },ids[0]);
  assert.match(reviewed.text,/Transferable method; adaptation required/);assert.match(reviewed.text,/specific report of use/);assert.match(reviewed.text,/specific outcome claim/);
  assert.deepEqual(reviewed.links,['https://example.org/use','https://example.org/evidence']);
  for(const url of reviewed.links)assert.ok(reviewed.print.includes(url),'claim sources survive printing');
  assert.deepEqual(errors,[]);
  await ctx.close();console.log('PASS: focused results, reading/theme independence, compare limit, plans, transfer, conflict preservation, literal text, full print preservation, and accessibility.');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
