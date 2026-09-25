const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const {createContext}=require('./browser');
const {start}=require('./serve');
const M=require('../src/js/matching'),D=require('../data/acts.json');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
const SHOTS=process.env.MATCH_SCREENSHOTS;
async function tick(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function shot(p,name){if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await p.screenshot({path:path.join(SHOTS,name)});}}
(async()=>{
 const server=await start({dir:SITE}),browser=await chromium.launch();
 try{
  const ctx=await createContext(browser,{viewport:{width:1440,height:1050},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>(window.matchCspErrors=window.matchCspErrors||[]).push(e.violatedDirective)));
  const go=async hash=>{await p.goto('about:blank');await p.goto(server.url('what-if-ai.html'+hash));await p.waitForSelector('html[data-ready]');await tick(p);};
  // The original zero-card path, followed through the normal wizard.
  await go('');await p.check('[name="q-focus"][value="research_own"]');await p.click('#next');
  await p.check('[name="q-task"][value="qualitative"]');await p.click('#next');
  await p.check('[name="q-disc"][value="education"]');await p.click('.qmore > summary');await p.check('[name="q-mod"][value="online"]');
  await p.click('#next');await p.click('#next');
  assert.ok(await p.locator('[data-match-group="compatible"] [data-card="CAN-W-workflow-016"]').isVisible());
  assert.ok((await p.locator('[data-card="CAN-W-workflow-016"] .match-note').textContent()).includes('Check suitability'));
  assert.equal(await p.locator('#plan').textContent().then(t=>t.includes('76 activities are open to you')),false);
  await shot(p,'matching-research.png');
  await go('#a=focus:teaching;task:assessment;disc:humanities;depth:module;lvl:firstyear;mod:in_person');
  assert.ok(await p.locator('[data-match-group="compatible"] [data-card="CAN-B-ASMT-01"]').isVisible());
  assert.equal(await p.locator('[data-match-group="exact"] [data-card="CAN-B-ASMT-01"]').count(),0);
  await p.locator('[data-card="CAN-B-ASMT-01"] [data-open]').click();await p.keyboard.press('Escape');
  assert.ok(await p.locator('[data-card="CAN-B-ASMT-01"] [data-open]').evaluate(n=>n===document.activeElement));
  // A valid but sparse preference set gets a visible recovery state, never a false claim of fit.
  await go('#a=focus:teaching;task:qualitative;disc:arts;depth:research_phase;lvl:grad;mod:hybrid;lim:nopaid');
  assert.ok(await p.locator('.empty').isVisible());
  assert.ok(await p.locator('[data-match-group="broader"] [data-card]').count()>0);
  assert.ok((await p.locator('[data-match-group="broader"] .match-note').first().textContent()).includes('Different from your preferences'));
  const old=p.url();await p.locator('[data-relax="depth"]').click();await tick(p);
  assert.ok(!p.url().includes('depth:'));assert.ok(p.url().includes('lim:nopaid'));
  await p.goBack();await tick(p);assert.equal(p.url(),old);assert.ok(await p.locator('.empty').isVisible());
  await shot(p,'matching-broader.png');
  // Unknown requirements stay in a distinct, initially collapsed disclosure.
  await go('#a=focus:teaching;task:design;lim:noaccount+nokit+noapproval+nodisclose');
  const details=p.locator('.requirement-checks');assert.equal(await details.getAttribute('open'),null);
  const confirmedIds=await p.locator('#plan [data-match-group]:not([data-match-group="unknown"]) [data-card]').evaluateAll(es=>es.map(e=>e.dataset.card));
  for(const id of confirmedIds){const a=D.acts.find(a=>a.id===id);assert.equal(a.pc,'none');assert.notEqual(a.dis,'not_specified');assert.notEqual(a.dis,'formal_statement');}
  await details.locator('summary').focus();await p.keyboard.press('Enter');
  assert.ok(await p.locator('[data-match-group="unknown"] .match-note').first().isVisible());
  assert.ok((await p.locator('[data-match-group="unknown"] .match-note').first().textContent()).includes('Check first'));
  const before=await p.locator('[data-match-group="unknown"] [data-card]').count();
  await p.locator('[data-more-matches="unknown"]').click();
  assert.ok(await details.evaluate(n=>n.open));
  assert.ok(await p.locator('[data-match-group="unknown"] [data-card]').count()>before);
  assert.ok(await p.evaluate(()=>!!document.activeElement.closest('[data-match-group="unknown"]')));
  const ids=await p.locator('#plan [data-card]').evaluateAll(es=>es.map(e=>e.dataset.card));assert.equal(new Set(ids).size,ids.length);
  for(const id of ids){const a=D.acts.find(a=>a.id===id);assert.ok(!['account_verification','equipment_required','travel_or_attendance','purchased_material','institutional_approval_required'].includes(a.pc));assert.notEqual(a.dis,'formal_statement');}
  await p.locator('.requirement-checks > summary').evaluate(n=>n.scrollIntoView({block:'start'}));await shot(p,'matching-requirements.png');
  // Selecting a hard limit preserves soft preferences instead of silently clearing answers.
  await go('#q=limits&a=focus:teaching;task:creative;disc:arts;lvl:grad;mod:hybrid');
  await p.check('[name="q-limits"][value="noai"]');
  for(const token of ['task:creative','disc:arts','lvl:grad','mod:hybrid'])assert.ok(p.url().includes(token));
  // A synthetic minimum dataset verifies the all-unknown and all-excluded UI paths.
  const manifest=JSON.parse(fs.readFileSync(path.join(SITE,'what-if-ai.html'),'utf8').match(/<script id="site-manifest" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const one={...D,acts:[{...D.acts[0],pc:'not_specified'}]};
  await p.route('**/'+manifest.data.acts,route=>route.fulfill({contentType:'application/json',body:JSON.stringify(one)}));
  await go('#a=focus:teaching;lim:noaccount');assert.ok(await p.locator('.empty').isVisible());assert.equal(await p.locator('[data-match-group="exact"]').count(),0);assert.ok(await p.locator('.requirement-checks > summary').isVisible());
  one.acts[0].pc='account_verification';await go('#a=focus:teaching;lim:noaccount');assert.ok(await p.locator('.empty').isVisible());assert.equal(await p.locator('#plan [data-card]').count(),0);assert.equal(await p.locator('.requirement-checks').count(),0);
  await p.unroute('**/'+manifest.data.acts);
  for(const width of [1440,768,390,320]){
    await p.setViewportSize({width,height:900});await go('#a=focus:teaching;task:design;lim:noaccount+nodisclose');await p.locator('.requirement-checks > summary').click();
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(width===390)await shot(p,'matching-mobile.png');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(await p.evaluate(()=>window.matchCspErrors||[]),[]);
  console.log('PASS: live wizard regressions, compatibility explanations, recovery and Back, strict unknown separation, pagination/focus, preserved limits, no duplicates, all-unknown/all-excluded states, and 4 widths. No browser errors.');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
