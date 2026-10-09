/* Browser checks for the fixes made after the October 2026 audit: field compatibility (WIA-02), the
   route note and operator fact (WIA-03), Ask Us focus (WIA-10), the tagged print copy (WIA-11),
   Back and Forward over an activity in What If AI and The Register (WIA-12), no-tool role wording
   (WIA-19), the operator-aware data warning (D-13), the footer date (D-09), and the source-access
   labels on synthesis activities whose source item is not openly licensed (WIA-01). */
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
  // the results as they were, expanded lists included. Forward reopens it with the same link to the
  // results, so a second Back, or closing it, returns to them again. The opener is past the first nine.
  const noAct=()=>p.waitForFunction(()=>!/^#act=/.test(location.hash));
  const view=async()=>({url:p.url(),shown:await p.locator('[data-match-group="exact"] [data-card]').count(),
    y:await p.evaluate(()=>Math.round(scrollY)),open:await p.locator('#actDialog').evaluate(d=>d.open)});
  await go('what-if-ai.html','#a=focus:teaching;task:discussion');
  const resultsUrl=p.url();
  await p.locator('[data-more-matches="exact"]').click();await tick(p);
  const shownBefore=await p.locator('[data-match-group="exact"] [data-card]').count();
  assert.ok(shownBefore>9,'the list is expanded past the first nine');
  const len0=await p.evaluate(()=>history.length);
  const opener=p.locator('[data-match-group="exact"] [data-card] [data-open]').nth(shownBefore-1);
  const openedId=await opener.evaluate(b=>b.getAttribute('data-open'));
  await opener.scrollIntoViewIfNeeded();await tick(p);
  const y0=await p.evaluate(()=>Math.round(scrollY));
  assert.ok(y0>0,'the opener is below the fold');
  const actUrl=resultsUrl.replace(/#.*$/,'')+'#act='+encodeURIComponent(openedId);
  const expectResults=async(label)=>{
    const v=await view();
    assert.equal(v.open,false,label+': the activity is closed');
    assert.equal(v.url,resultsUrl,label+': the address is the results');
    assert.equal(v.shown,shownBefore,label+': expanded results stay expanded');
    assert.equal(v.y,y0,label+': the scroll position is kept');
    await p.waitForFunction(id=>document.activeElement&&document.activeElement.getAttribute('data-open')===id,openedId);
    assert.equal(await p.evaluate(()=>history.length),len0+1,label+': no extra history entry');
  };
  const expectActivity=async(label)=>{
    await p.waitForSelector('#actDialog[open]');
    assert.equal(p.url(),actUrl,label+': the address is the activity');
    assert.equal(await p.locator('#actDialog').getAttribute('data-act'),openedId,label);
    assert.equal(await p.locator('[data-match-group="exact"] [data-card]').count(),shownBefore,label+': the results underneath are unchanged');
  };
  await opener.click();await expectActivity('open');
  assert.equal(await p.evaluate(()=>history.length),len0+1);
  await p.goBack();await noAct();await tick(p);await expectResults('Back');
  await p.goForward();await expectActivity('Back → Forward');
  await p.goBack();await noAct();await tick(p);await expectResults('Back → Forward → Back');
  // focus has moved away before Forward: the reopened activity still hands focus back to its card
  await p.evaluate(()=>{document.activeElement.blur();});
  await p.goForward();await expectActivity('Forward again');
  await p.keyboard.press('Escape');await noAct();await tick(p);await expectResults('Back → Forward → Escape');
  await p.goForward();await expectActivity('Forward after Escape');
  await p.locator('#actDialog [data-close]').last().click();await noAct();await tick(p);await expectResults('Back → Forward → Close');
  await opener.click();await expectActivity('reopen');await p.keyboard.press('Escape');await noAct();await tick(p);
  await expectResults('Escape');
  pass('WIA-12: Back, Forward, Back, Escape and Close over an activity opened past the first nine keep the results, scroll, focus and address');

  // The Register: Forward to an activity and closing it goes back, with no duplicate entry.
  await go('register.html','#activities?cap=text_chat');
  const regUrl=p.url(),regLen=await p.evaluate(()=>history.length);
  const regOpener=p.locator('#actResults [data-card] [data-open]').nth(5);
  await regOpener.click();await p.waitForSelector('#actDialog[open]');
  await p.goBack();await noAct();await tick(p);
  await p.goForward();await p.waitForSelector('#actDialog[open]');
  await p.keyboard.press('Escape');await noAct();await tick(p);
  assert.equal(p.url(),regUrl);
  assert.equal(await p.evaluate(()=>history.length),regLen+1);
  // closing went back, so the activity is still one step forward rather than replaced by a copy of the list
  await p.goForward();await p.waitForSelector('#actDialog[open]');
  await p.goBack();await noAct();await tick(p);
  assert.equal(p.url(),regUrl);
  assert.equal(await p.locator('#actDialog').evaluate(d=>d.open),false);
  // the filters change after Back (the list's entry is replaced); Forward and close still go back to the list
  if(await p.locator('#filtersToggle').isVisible()&&!(await p.locator('[data-fc="noai"]').isVisible()))await p.locator('#filtersToggle').click();
  await p.locator('[data-fc="noai"]').check();await p.waitForFunction(()=>/noai=1/.test(location.hash));
  const filteredUrl=p.url();
  await p.goForward();await p.waitForSelector('#actDialog[open]');
  await p.keyboard.press('Escape');await noAct();await tick(p);
  assert.equal(p.url(),filteredUrl);
  await p.goForward();await p.waitForSelector('#actDialog[open]');
  await p.keyboard.press('Escape');await noAct();await tick(p);
  assert.equal(p.url(),filteredUrl);
  pass('The Register: closing an activity reached by Forward goes back to the list, leaving no duplicate entry, even after the filters change');

  // WIA-19 and D-13: no-tool role wording and the operator-aware data warning.
  await go('register.html','#act=CAN-B-ETHI-03');await p.waitForSelector('#actDialog[open]');
  const ethi=await p.locator('#actDialog .dlg__body').textContent();
  assert.ok(ethi.includes('The AI tool is deliberately kept out of the use-case idea; participants judge claims about AI against a standard they already hold.'),'no-tool wording');
  assert.ok(!ethi.includes('came back')&&!ethi.includes('that the tool did not'),'nothing “came back” from an unused tool');
  await go('register.html','#act=CAN-B-STYL-08');await p.waitForSelector('#actDialog[open]');
  const styl=await p.locator('#actDialog .dlg__body').textContent();
  assert.ok(styl.includes('into a third-party tool')&&!styl.includes('into an AI tool'),'no-operator warning names a third-party tool');
  pass('WIA-19 and D-13: no-tool activities and no-operator data warnings describe what happens');

  // WIA-10: Ask Us is a modal dialog for keyboard users.
  for(const page of ['what-if-ai.html','register.html']){
    await go(page,'');
    await p.locator('#fabToggle').focus();await p.keyboard.press('Enter');
    await p.locator('#fabAskUs').focus();await p.keyboard.press('Enter');
    const inChat=()=>p.waitForFunction(()=>document.getElementById('chatModal').contains(document.activeElement),null,{timeout:5000});
    await inChat();
    assert.ok(await p.evaluate(()=>!!document.querySelector('main').closest('[inert]')&&!!document.querySelector('.site-foot').closest('[inert]')&&!document.getElementById('chatModal').closest('[inert]')),page+': the page behind is inert');
    // Tab and Shift+Tab move among the modal's own controls; the chat widget is an iframe, and focus
    // that enters it is still inside the modal. Each press is given time to settle before it is checked.
    for(let i=0;i<20;i++){await p.keyboard.press('Tab');await tick(p);
      await inChat().catch(()=>assert.fail(page+': Tab stays inside ('+i+')'));}
    await p.keyboard.press('Shift+Tab');await tick(p);
    await inChat().catch(()=>assert.fail(page+': Shift+Tab stays inside'));
    // Escape is handled by the modal when focus is on its own controls; a key pressed inside the chat's
    // iframe goes to the chat, not to this page.
    await p.locator('#chatModalClose').focus();await p.keyboard.press('Escape');
    await p.waitForFunction(()=>document.activeElement&&document.activeElement.id==='fabToggle',null,{timeout:5000})
      .catch(()=>assert.fail(page+': Escape returns focus to the menu button'));
    assert.ok(await p.evaluate(()=>!document.querySelector('main').closest('[inert]')&&!document.querySelector('.site-foot').closest('[inert]')),page+': the page is usable again');
    await p.locator('#fabToggle').focus();await p.keyboard.press('Enter');await p.locator('#fabAskUs').focus();await p.keyboard.press('Enter');
    await inChat();
    await p.locator('#chatModalClose').click();
    await p.waitForFunction(()=>document.activeElement&&document.activeElement.id==='fabToggle',null,{timeout:5000})
      .catch(()=>assert.fail(page+': ✕ returns focus to the menu button'));
  }
  pass('WIA-10: Ask Us takes focus, keeps Tab inside, makes the page inert, and returns focus when closed from its own controls (both tools)');

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

  // WIA-01: synthesis activities whose source item is not openly licensed are published with a label on
  // the card, at a glance, before use (naming the item and linking its terms), and in print; The Register
  // can leave them out, and its no-cost filter matches What If AI's "Nothing anyone has to pay for".
  const SA={not_open:'No clear open license',unmodified:'Use only as published',restricted:'Access or permission needed'};
  const saActs=D.acts.filter(a=>a.sa);
  assert.equal(saActs.length,115);
  for(const a of saActs){assert.equal(a.tier,'synthesis',a.id);assert.ok(a.rel.some(r=>r[1].startsWith('Used unmodified')),a.id);}
  for(const [v,label] of Object.entries(SA)){
    const a=saActs.find(x=>x.sa===v),item=a.rel.find(r=>r[1].startsWith('Used unmodified'));
    await go('register.html','#activities?q='+a.id);
    const facts=await p.locator(`#actResults [data-card="${a.id}"] .acard__facts`).textContent();
    assert.ok(facts.includes('Source item'+label),a.id+' card: '+facts);
    await p.locator(`#actResults [data-card="${a.id}"] [data-open]`).click();await p.waitForSelector('#actDialog[open]');
    const glance=await p.locator('#actDialog .dlg__body .facts').first().textContent();
    assert.ok(glance.includes('Source item'+label),a.id+' at a glance');
    const note=p.locator('#actDialog .dlg__body .note',{hasText:'Source item: '+label.toLowerCase()+'.'});
    assert.equal(await note.count(),1,a.id+' note');
    const t=await note.textContent();
    assert.ok(t.includes('uses “'+item[2]+'” as published, by link'),t);
    assert.equal(await note.locator(`a[href$="#src=${encodeURIComponent(item[0])}"]`).count(),1,a.id+': the note links the item’s terms');
    assert.equal(await note.evaluate(n=>n.classList.contains('note--caution')),v==='restricted');
    const printed=await p.evaluate(id=>{const d=document.createElement('div');d.innerHTML=SITE.detailHTML(SITE.BYID[id],{print:true});
      const n=[...d.querySelectorAll('.note')].find(x=>x.textContent.startsWith('Source item'));return n?[n.textContent,n.querySelectorAll('a').length]:null;},a.id);
    assert.ok(printed&&printed[0].includes('recorded with the source in The Register')&&printed[1]===0,a.id+' print');
  }
  const openLicensed=D.acts.filter(a=>!a.sa).length;
  await go('register.html','#activities?open=1');
  assert.match(await p.locator('#actCount').textContent(),new RegExp('of '+openLicensed+' use-case ideas'));
  assert.ok((await p.locator('.activechips').textContent()).includes('Source items open to adapt'));
  const free=D.acts.filter(a=>M.requirement(a,'nopaid')==='confirmed').length;
  await go('register.html','#activities?cost=1');
  assert.match(await p.locator('#actCount').textContent(),new RegExp('of '+free+' use-case ideas'),'the no-cost filter confirms exactly what What If AI confirms');
  assert.ok(D.acts.some(a=>a.sa==='restricted'&&['no_tool_needed','free_tier','institution_provided'].includes(a.eq)),'a restricted activity with a free tool is left out');
  pass('WIA-01: source-access labels on cards, details and print; the open-license and no-cost filters in The Register');

  assert.deepEqual(errors,[]);
  console.log(`${passed} review-fix checks passed. No browser errors.`);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
