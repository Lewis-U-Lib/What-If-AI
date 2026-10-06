/* Browser checks for the fixes made after the October 2026 audit: field compatibility (WIA-02), the
   route note and operator fact (WIA-03), Ask Us focus (WIA-10), the tagged print copy (WIA-11),
   Back from an activity in What If AI (WIA-12), withheld-role wording (WIA-19), the operator-aware
   data warning (D-13), and the footer date (D-09). */
const assert=require('assert/strict'),path=require('path');
const {chromium}=require('playwright');
const {createContext}=require('./browser');
const {start}=require('./serve');
const M=require('../src/js/matching'),D=require('./public-data');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
const BY=new Map(D.acts.map(a=>[a.id,a]));
async function tick(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
(async()=>{
 const server=await start({dir:SITE}),browser=await chromium.launch();
 let passed=0;const pass=m=>{passed++;console.log('PASS '+m);};
 try{
  const ctx=await createContext(browser,{viewport:{width:1280,height:900},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await ctx.route(/libanswers\.com/,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>chat</title><button>Start chat</button>'}));
  const go=async(page,hash)=>{await p.goto('about:blank');await p.goto(server.url(page+hash));await p.waitForSelector('html[data-ready]');await tick(p);};
  const showUntil=async(group,id)=>{
    for(let i=0;i<60&&!(await p.locator(`[data-match-group="${group}"] [data-card="${id}"]`).count());i++){
      const more=p.locator(`[data-more-matches="${group}"]`);if(!(await more.count()))break;await more.click();await tick(p);}
    return p.locator(`[data-match-group="${group}"] [data-card="${id}"]`);
  };

  // WIA-02: an activity recorded for any course is a possible fit for a specific field, not a mismatch.
  const argu=BY.get('CAN-B-ARGU-09');assert.equal(argu.disc,'interdisciplinary');
  await go('what-if-ai.html','#a=focus:teaching;task:discussion;disc:humanities;depth:quick');
  const card=await showUntil('compatible','CAN-B-ARGU-09');
  assert.equal(await card.count(),1,'CAN-B-ARGU-09 is a possible fit');
  const note=await card.locator('.match-note').textContent();
  assert.ok(note.includes('Recorded for any course')&&!note.includes('Different from your preferences'),note);
  assert.equal(await p.locator('[data-match-group="close"] [data-card="CAN-B-ARGU-09"]').count(),0);
  pass('WIA-02: an any-course activity is a possible fit with “Recorded for any course”, not a field mismatch');

  // WIA-03: under the first limit, a card that qualifies only through its route without AI says so,
  // and every card says who uses AI.
  const eq=BY.get('CAN-A1-EQ-018');assert.equal(eq.op,'students');assert.ok(eq.na);
  const state={focus:'teaching',task:'feedback',disc:'humanities',depth:'assignment',limits:{noai:true}};
  const group=['exact','compatible','close'].find(k=>M.search(D.acts,state)[k].some(r=>r.activity.id===eq.id));
  assert.ok(group,'CAN-A1-EQ-018 is a confirmed result under the limit');
  await go('what-if-ai.html','#a=focus:teaching;task:feedback;disc:humanities;depth:assignment;lim:noai');
  const eqCard=await showUntil(group,eq.id);
  const eqNote=await eqCard.locator('.match-note').textContent();
  assert.ok(eqNote.includes('Qualifies through its route without AI')&&eqNote.includes(eq.na.split(/(?<=[.!?])\s/)[0]),eqNote);
  const facts=await eqCard.locator('.acard__facts').textContent();
  assert.ok(facts.includes('Who uses AI')&&facts.includes('Students'),facts);
  const shownCards=await p.locator('#plan [data-card]').evaluateAll(cs=>cs.map(c=>[c.getAttribute('data-card'),c.textContent]));
  assert.ok(shownCards.length>1);
  for(const [id,t] of shownCards){const a=BY.get(id),viaRoute=!!a.na&&!['faculty_or_staff','optional','none'].includes(a.op);
    assert.equal(t.includes('Qualifies through its route without AI'),viaRoute,id+': the route note appears exactly when the route is what qualifies');}
  await p.evaluate(()=>{location.hash='#q=limits&a=focus:teaching';});
  await p.waitForFunction(()=>!!document.querySelector('#wizard .noai'));
  const limitText=await p.textContent('#wizard');
  assert.ok(limitText.includes('the AI step is optional')&&limitText.includes('its card says so'),limitText.slice(0,200));
  pass('WIA-03: route-based results are explained, every card shows who uses AI, and the limit note names optional AI steps');

  // WIA-12: an activity opened from the results has its own history entry; Back closes it and keeps
  // the results as they were, expanded lists included.
  await go('what-if-ai.html','#a=focus:teaching;task:discussion');
  const resultsUrl=p.url();
  await p.locator('[data-more-matches="exact"]').click();await tick(p);
  const shownBefore=await p.locator('[data-match-group="exact"] [data-card]').count();
  const len0=await p.evaluate(()=>history.length);
  const opener=p.locator('[data-match-group="exact"] [data-card] [data-open]').nth(shownBefore-1);
  const openedId=await opener.evaluate(b=>b.getAttribute('data-open'));
  await opener.click();await p.waitForSelector('#actDialog[open]');
  assert.equal(new URL(p.url()).hash,'#act='+encodeURIComponent(openedId));
  assert.equal(await p.evaluate(()=>history.length),len0+1);
  await p.goBack();await p.waitForFunction(()=>!/^#act=/.test(location.hash));await tick(p);
  assert.equal(await p.locator('#actDialog').evaluate(d=>d.open),false,'Back closes the activity');
  assert.equal(p.url(),resultsUrl);
  assert.equal(await p.locator('[data-match-group="exact"] [data-card]').count(),shownBefore,'expanded results stay expanded');
  await opener.click();await p.waitForSelector('#actDialog[open]');await p.keyboard.press('Escape');
  await p.waitForFunction(()=>!/^#act=/.test(location.hash));await tick(p);
  assert.equal(p.url(),resultsUrl,'closing returns to the results address');
  assert.ok(await opener.evaluate(b=>b===document.activeElement),'focus returns to the card');
  pass('WIA-12: Back closes an activity opened from the results and keeps the results as they were');

  // WIA-19 and D-13: withheld-role wording and the operator-aware data warning.
  await go('register.html','#act=CAN-B-ETHI-03');await p.waitForSelector('#actDialog[open]');
  const ethi=await p.locator('#actDialog .dlg__body').textContent();
  assert.ok(ethi.includes('The AI tool is deliberately kept out of the activity; participants judge claims about AI against a standard they already hold.'),'withheld wording');
  assert.ok(!ethi.includes('came back')&&!ethi.includes('that the tool did not'),'nothing “came back” from a withheld tool');
  await go('register.html','#act=CAN-B-STYL-08');await p.waitForSelector('#actDialog[open]');
  const styl=await p.locator('#actDialog .dlg__body').textContent();
  assert.ok(styl.includes('into a third-party tool')&&!styl.includes('into an AI tool'),'no-operator warning names a third-party tool');
  pass('WIA-19 and D-13: withheld activities and no-operator data warnings describe what happens');

  // WIA-10: Ask Us is a modal dialog for keyboard users.
  for(const page of ['what-if-ai.html','register.html']){
    await go(page,'');
    await p.locator('#fabToggle').focus();await p.keyboard.press('Enter');
    await p.locator('#fabAskUs').focus();await p.keyboard.press('Enter');await tick(p);
    assert.ok(await p.evaluate(()=>document.getElementById('chatModal').contains(document.activeElement)),page+': focus moves into the chat');
    assert.ok(await p.evaluate(()=>!!document.querySelector('main').closest('[inert]')&&!!document.querySelector('.site-foot').closest('[inert]')&&!document.getElementById('chatModal').closest('[inert]')),page+': the page behind is inert');
    for(let i=0;i<20;i++){await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(()=>document.getElementById('chatModal').contains(document.activeElement)),page+': Tab stays inside ('+i+')');}
    await p.keyboard.press('Shift+Tab');
    assert.ok(await p.evaluate(()=>document.getElementById('chatModal').contains(document.activeElement)),page+': Shift+Tab stays inside');
    await p.locator('#chatModalClose').focus();await p.keyboard.press('Escape');await tick(p);
    assert.ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='fabToggle'),page+': Escape returns focus to the menu button');
    assert.ok(await p.evaluate(()=>!document.querySelector('main').closest('[inert]')&&!document.querySelector('.site-foot').closest('[inert]')),page+': the page is usable again');
    await p.locator('#fabToggle').focus();await p.keyboard.press('Enter');await p.locator('#fabAskUs').focus();await p.keyboard.press('Enter');await tick(p);
    await p.locator('#chatModalClose').click();await tick(p);
    assert.ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='fabToggle'),page+': ✕ returns focus to the menu button');
  }
  pass('WIA-10: Ask Us takes focus, keeps it, makes the page inert, and returns focus when closed (both tools)');

  // WIA-11: the saved-activities print copy is exposed to assistive technology while printing.
  await go('what-if-ai.html','');
  await p.evaluate(ids=>localStorage.setItem('lul-whatifai-saved-v1',JSON.stringify(ids)),D.acts.slice(0,2).map(a=>a.id));
  await go('what-if-ai.html','');
  await p.evaluate(()=>{window.print=()=>{window.__ariaWhilePrinting=document.getElementById('printRoot').getAttribute('aria-hidden');};
    const t=window.setTimeout;window.setTimeout=(f,ms)=>t(f,ms>1000?1e9:ms);});
  await p.locator('[data-open-saved]').first().click();await p.waitForSelector('#savedDrawer[open]');
  await p.locator('#printSaved').click();await p.waitForTimeout(200);
  assert.equal(await p.evaluate(()=>window.__ariaWhilePrinting),null,'print copy exposed while printing');
  assert.ok(await p.evaluate(()=>document.querySelectorAll('#printRoot article h2').length===2));
  await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  assert.equal(await p.evaluate(()=>document.getElementById('printRoot').getAttribute('aria-hidden')),'true','hidden again after printing');
  pass('WIA-11: the print copy of saved activities is exposed while printing and hidden again afterward');

  // D-09: every page's footer gives the month the collection last changed.
  for(const page of ['index.html','what-if-ai.html','register.html','404.html']){
    await p.goto(server.url(page));
    const t=await p.locator('[data-updated]').textContent();
    assert.match(t,/^Updated (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/,page);
  }
  pass('D-09: every footer gives the month the collection last changed');

  assert.deepEqual(errors,[]);
  console.log(`${passed} review-fix checks passed. No browser errors.`);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
