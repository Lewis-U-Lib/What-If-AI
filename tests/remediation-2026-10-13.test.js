/* Regression checks for the October 13 corrections: focus, status, reflow, print, route notes,
   the student-input limit, attribution lines, and the privacy notice.
   External tracking/chat are intercepted; no production feedback is submitted. */
const assert=require('assert/strict'),path=require('path');
const engines=require('playwright'),{createContext}=require('./browser'),{start}=require('./serve');
const M=require('../src/js/matching'),D=require('./public-data');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
let count=0;function pass(m){count++;console.log('PASS '+m);}
async function ready(p){await p.waitForSelector('html[data-ready]',{state:'attached'});await p.evaluate(()=>document.fonts.ready);}

/* data rules that hold for every idea */
for(const a of D.acts){
  if(a.op==='students'){
    assert.notEqual(a.sen,'none',a.id+': students operate a tool, so something they wrote goes into it');
    assert.equal(M.requirement(a,'nostudent'),'excluded',a.id);
  }
  if(a.op==='students'&&a.eq==='free_tier')assert.notEqual(a.pc,'none',a.id+': an account is not established for a student-operated free tier');
  assert.ok(!/Public domain \(U\.S\. Government work\)/.test(a.lic||''),a.id+': a library adaptation is not a U.S. Government work');
}
const STOCK=[/facets assigned/,/schema v3/,/controlled record fields/,/Editorial condensation/,/Restated as a bounded procedure/,/assignment pass/,/the workbook/i,/theory register/i,/this record\b/i];
for(const a of D.acts)for(const re of STOCK)assert.ok(!re.test(a.chg||''),a.id+': change note uses internal wording '+re);
const shared=new Map();for(const a of D.acts)if(a.chg)shared.set(a.chg,(shared.get(a.chg)||0)+1);
assert.ok(Math.max(...shared.values())<=3,'no stock change note is shared across many ideas');
for(const a of D.acts.filter(a=>a.cls==='licensed_adaptation'&&a.attr)){
  assert.ok(!/for this corpus|recorded lineage/.test(a.attr),a.id+': attribution has internal wording');
}
for(const id of ['CAN-A2-A-104','CAN-A2-A-115']){
  const a=D.acts.find(x=>x.id===id);
  assert.ok(!a.pr,id+': a prompt written for this collection is not shown as the source’s');
  assert.ok((a.pa||[]).some(x=>x[0]==='A prompt written for this collection'),id);
  assert.ok(!/lines \d/.test(a.rel[0][3]),id+': locator a reader can follow');
}
const reg=require('../data/register.json');
assert.ok(!JSON.stringify(reg.policy).includes('368226179'),'policy links name the Policies tab');
const ud=reg.policy.tiers.flatMap(t=>t.items).find(q=>q.inst==='University of Delaware');
assert.match(ud.quote,/if instructor permission is obtained in advance/);
pass('data: student input, accounts, U.S. Government label, change notes, attribution, editorial prompts, policy excerpt and links');

(async()=>{
  const server=await start({dir:SITE}),browser=await engines.chromium.launch();
  try{
    const ctx=await createContext(browser,{viewport:{width:1280,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    const go=async(file,hash='')=>{await p.goto('about:blank');await p.goto(server.url(file+hash));await ready(p);};

    // focus returns to the opener after closing an idea opened from a bare section address
    await go('register.html','#activities');
    const opener=p.locator('#actResults [data-open]:visible').first();await opener.focus();await p.keyboard.press('Enter');
    await p.waitForSelector('#actDialog[open]');await p.keyboard.press('Escape');await p.waitForTimeout(800);
    assert.ok(await p.evaluate(()=>!!document.activeElement.getAttribute('data-open')),'focus is back on View details');
    // removing the last filter chip moves focus to the section heading
    await go('register.html','#activities?op=students');await p.locator('#actResults .fchip').first().click();await p.waitForTimeout(200);
    assert.equal(await p.evaluate(()=>document.activeElement.id),'h-activities');
    pass('focus returns after closing to #activities and after removing the last chip');

    // copy-link failure: visible status inside the dialog with the address to copy by hand
    await go('register.html','#act=CAN-D-ADM-001');
    await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}));
    await p.locator('#actDialog [data-copy-act]').click();await p.waitForTimeout(150);
    const copy=await p.evaluate(()=>{const s=document.querySelector('#actDialog .copy-status'),i=s&&s.querySelector('input');
      return {visible:!!s&&s.offsetHeight>0,url:i&&i.value,focused:document.activeElement===i,live:document.querySelector('#actDialog .dlg-status').textContent};});
    assert.ok(copy.visible&&/#act=CAN-D-ADM-001$/.test(copy.url)&&copy.focused,'address shown and focused');
    assert.match(copy.live,/Copying is not available/);
    pass('copy-link status is visible in the dialog and announced from the dialog’s own live region');

    // printing while an idea is open prints that idea with its license and attribution
    await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await p.emulateMedia({media:'print'});
    const pr=await p.evaluate(()=>{const r=document.getElementById('printRoot');return {shown:getComputedStyle(r).display,text:r.innerText,dialog:getComputedStyle(document.getElementById('actDialog')).display};});
    assert.equal(pr.shown,'block');assert.equal(pr.dialog,'none');
    assert.match(pr.text,/License for this use-case idea/);assert.match(pr.text,/Attribution to keep when reusing/);
    await p.emulateMedia({media:'screen'});await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
    assert.equal(await p.evaluate(()=>getComputedStyle(document.getElementById('printRoot')).display),'none');
    pass('the browser’s Print command while an idea is open prints that idea with its license and attribution');

    // no sideways scrolling at 320 px for ideas with long attribution addresses
    await p.setViewportSize({width:320,height:700});
    const long=D.acts.filter(a=>/\S{70,}/.test(a.attr||'')).slice(0,6).map(a=>a.id);
    for(const file of ['what-if-ai.html','register.html'])for(const id of long){
      await go(file,'#act='+encodeURIComponent(id));
      const g=await p.evaluate(()=>{const d=document.getElementById('actDialog');const r=d.getBoundingClientRect();return {over:d.scrollWidth-d.clientWidth,right:r.right,vw:innerWidth};});
      assert.ok(g.over<=1&&g.right<=g.vw+1,file+' '+id+' '+JSON.stringify(g));
    }
    await p.setViewportSize({width:1280,height:900});
    pass('no horizontal scrolling at 320 px in either tool ('+long.length+' long-address ideas)');

    // The Register explains route-based qualification for "Students use no AI tool"
    const via=D.acts.find(a=>a.na&&a.op==='students');
    await go('register.html','#activities?noai=1&q='+encodeURIComponent(via.id));
    assert.match(await p.locator('#actResults').innerText(),/Qualifies through its route without AI/);
    assert.match(await p.locator('#filters').innerText(),/Nothing anyone has to pay for/);
    assert.match(await p.locator('#filters').innerText(),/Nothing students wrote goes into a tool/);
    pass('The Register shows the route note and limit labels that match their rules');

    // privacy notice describes what is recorded and who can see it
    await go('register.html');await p.locator('#privacy summary').click();
    const priv=await p.locator('#privacy').innerText();
    for(const re of [/Umami/,/does not use cookies/,/Only the library team can view/,/Do Not Track/,/not sent to the library or anyone else/])assert.match(priv,re);
    assert.ok(!/nothing is sent anywhere/.test(await p.content()),'no absolute “nothing is sent anywhere”');
    pass('privacy notice states what is recorded, who sees it, and how Do Not Track is handled');

    assert.deepEqual(errors,[]);
  }finally{await browser.close();await server.close();}
  console.log(count+' October 13 remediation checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
