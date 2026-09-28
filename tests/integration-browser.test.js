const assert=require('assert/strict'), fs=require('fs'), path=require('path');
const {chromium}=require('playwright'), {start}=require('./serve'), {createContext}=require('./browser');
const {witnesses}=require('./data-integration.test');
const D=require('./public-data');
const report=[];
const hash=w=>'#a='+Object.entries(w.state).map(([k,v])=>k+':'+encodeURIComponent(v)).join(';');
(async()=>{
  const server=await start({dir:path.join(__dirname,'../_site')});
  const base=process.env.LIVE_URL||server.url('');
  const browser=await chromium.launch();
  try{
    const context=await createContext(browser,{viewport:{width:1440,height:900}}),p=await context.newPage();
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    async function go(file){await p.goto('about:blank');await p.goto(base+file);await p.waitForSelector('html[data-ready]');}
    for(const w of witnesses){
      await go('what-if-ai.html'+hash(w));
      const card=p.locator(`[data-match-group="${w.group}"] [data-card="${w.id}"]`);
      for(let n=0;!await card.count()&&n<100;n++)await p.locator(`[data-more-matches="${w.group}"]`).click();
      assert.ok(await card.count(),w.id+' is reachable through result pagination');
      await card.locator('[data-open]').click();
      assert.equal(await p.locator('#actDialogTitle').textContent(),w.title);
      assert.ok(await p.locator('#actDialog').evaluate(d=>d.open));
      assert.ok(await p.locator('#actDialog a[href*="'+D.acts.find(a=>a.id===w.id).url.replace(/"/g,'')+'"]').count(),w.id+' source link');
      const finder=(await p.locator('#actDialog .dlg__body').textContent()).replace(' Open in The Register','');
      await go('register.html#act='+w.id);
      assert.equal(await p.locator('#actDialogTitle').textContent(),w.title);
      assert.equal(await p.locator('#actDialog .dlg__body').textContent(),finder,w.id+' content parity');
      report.push({id:w.id,group:w.group,rank:w.rank,finder:true,register:true,url:base+'what-if-ai.html'+hash(w)});
    }
    // Both readers label the paid workflows, and held deep links cannot open records.
    for(const file of ['what-if-ai.html','register.html']){
      for(const id of ['CAN-L-038','CAN-L-039']){
        await go(file+'#act='+id);
        assert.ok((await p.locator('#actDialog .dlg__body').textContent()).includes('Paid tool required'));
      }
      for(const id of require('../content/publication-review.json').decisions.filter(d=>d.decision==='hold').map(d=>d.id)){
        await go(file+'#act='+id);
        assert.equal(await p.locator('#actDialog').evaluate(d=>d.open),false,id+' is held in '+file);
        assert.equal(await p.locator(`[data-card="${id}"]`).count(),0);
      }
    }
    // Use the wizard itself for each focus and newly represented scale, not just deep links.
    for(const id of ['CAN-L-040','CAN-L-020','CAN-L-060']){
      const w=witnesses.find(w=>w.id===id);
      await go('what-if-ai.html');
      await p.check(`[name="q-focus"][value="${w.state.focus}"]`);await p.locator('#next').click();
      await p.check(`[name="q-task"][value="${w.state.task}"]`);await p.locator('#next').click();
      await p.check(`[name="q-disc"][value="${w.state.disc}"]`);await p.locator('#next').click();
      await p.check(`[name="q-depth"][value="${w.state.depth}"]`);await p.locator('#next').click();
      await p.locator('#next').click();
      assert.ok(p.url().includes('depth:'+w.state.depth));
      const card=p.locator(`#plan [data-card="${id}"]`);
      for(let n=0;!await card.count()&&n<100;n++)await p.locator('[data-more-matches="exact"]').click();
      assert.ok(await card.count(),id+' is reachable through the full wizard');
    }
    let navChecks=0;
    for(const width of [320,390,760,761,1280,1440]){
      await p.setViewportSize({width,height:900});
      for(const section of ['activities','ai-types','policies','sources','about']){
        await go('register.html#'+section);
        await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        async function visibleMenu(){
          const geometry=await p.evaluate(()=>({top:document.querySelector('.topbar').getBoundingClientRect().bottom,nav:document.getElementById('secnav').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth-innerWidth}));
          assert.ok(geometry.nav>=geometry.top-1,`${width} ${section}: menu hidden ${JSON.stringify(geometry)}`);
          assert.ok(geometry.overflow<=1,`${width} ${section}: overflow ${JSON.stringify(geometry)}`);navChecks++;
        }
        await visibleMenu();
        await p.locator(`#secnav [data-sec="${section}"]`).click();
        await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await visibleMenu();
        const next=section==='about'?'ai-types':'about';
        await p.locator(`#secnav [data-sec="${next}"]`).click();
        await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await visibleMenu();
        assert.equal(await p.evaluate(()=>document.activeElement.id),'h-'+next,`${width} ${section} to ${next}: heading focus`);
      }
      await go('what-if-ai.html#act=CAN-L-034');
      assert.ok(await p.locator('#actDialog').isVisible());
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(process.env.PREVIEW_DIR&&[390,1440].includes(width)){
        fs.mkdirSync(process.env.PREVIEW_DIR,{recursive:true});
        await p.screenshot({path:path.join(process.env.PREVIEW_DIR,`activity-${width}.png`)});
        await go('register.html#ai-types');await p.waitForTimeout(100);
        await p.screenshot({path:path.join(process.env.PREVIEW_DIR,`register-${width}.png`)});
      }
    }
    for(const [alias,section] of [['tools','ai-types'],['spectrum','policies'],['biblio','sources']]){
      await go('register.html#'+alias);
      await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(p.url().endsWith('#'+section));
      assert.ok(await p.evaluate(()=>document.getElementById('secnav').getBoundingClientRect().top>=document.querySelector('.topbar').getBoundingClientRect().bottom-1));
    }
    assert.deepEqual(errors,[]);
    if(process.env.BROWSER_REPORT)fs.writeFileSync(process.env.BROWSER_REPORT,JSON.stringify({checked:new Date().toISOString(),base,activities:report,menuChecks:navChecks,pageErrors:errors},null,2)+'\n');
    console.log(`PASS: all ${witnesses.length} additions visible through results/pagination and identical pop-ups in both tools; three full wizard paths; ${navChecks} section-menu checks; six screen widths; no page errors.`);
  }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
