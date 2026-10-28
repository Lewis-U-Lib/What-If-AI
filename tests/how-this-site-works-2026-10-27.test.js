/* Checks for the October 27 "How this site works" additions: the statements that both tools run on fixed
   rules rather than an AI system, the shared dialog that explains them, and the Ask Us note.
   The last group checks the facts that wording depends on. If one of those fails, the site has changed in
   a way that may make a statement untrue: correct src/partials/about.html (and the header and rail notes)
   before relaxing the check. External tracking and chat are intercepted; nothing is reported. */
const assert=require('assert/strict'),path=require('path');
const engines=require('playwright'),{createContext}=require('./browser'),{start}=require('./serve');
const CFG=require('../site.json');
const SITE=path.resolve(process.argv[2]||path.join(__dirname,'../_site'));
let count=0;function pass(m){count++;console.log('PASS '+m);}
async function ready(p){await p.waitForSelector('html[data-ready]',{state:'attached'});}
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();

const FINDER='Results come from fixed matching rules set by the Library. No AI system reads your answers or generates your results, and your answers stay in this browser.';
const REGISTER='Every entry is a fixed, static record you can read, search, and print; nothing is generated as you browse.';
const MADE='AI assistance was used to realize this resource, utilized for coding, collation, editing, and certain visual elements.';
const ASKUS='During staffed hours, Ask Us connects you to library staff. At other times it shows a set menu of answers written by the Library and a form for leaving your email. No AI system writes the replies.';
const RAIL='Matched by fixed rules set by the Library. No AI system reads your answers.';
const TITLES=['What If AI','The Register','What leaves your browser','Ask Us','Links to other sites','How it was made'];

(async()=>{
  const server=await start({dir:SITE}),browser=await engines.chromium.launch();
  try{
    for(const [width,height] of [[1280,900],[390,844]]){
      const ctx=await createContext(browser,{viewport:{width,height},reducedMotion:'reduce'});
      await ctx.route(/libanswers\.com/,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>chat</title>'}));
      const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      const wide=width>980;

      /* What If AI: the header statement, the note beside the questions, and the dialog */
      await p.goto(server.url('what-if-ai.html'));await ready(p);await p.waitForSelector('#wizard .qpanel');
      assert.equal(norm(await p.textContent('.hdr__lede .hdr__signal')),FINDER);
      assert.equal(await p.getAttribute('.hdr__signal use','href'),'#i-flow','the statement is not marked with the no-AI-tool robot');
      const notes=await p.evaluate(()=>[...document.querySelectorAll('.rail__note,.qsignal')].filter(e=>e.offsetParent).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
      assert.equal(notes.length,1,'exactly one note beside the questions is displayed at '+width+'px');
      assert.ok(notes[0].startsWith(RAIL),notes[0]);
      const visibleNote=wide?'.rail__note':'.qsignal';
      await p.click(visibleNote+' [data-open-about]');
      await p.waitForSelector('#aboutDialog[open]');
      assert.equal(await p.evaluate(()=>document.activeElement.id),'aboutTitle','focus moves to the dialog title');
      const finderText=norm(await p.textContent('#aboutDialog .dlg__body'));
      for(const s of [FINDER,REGISTER,MADE,ASKUS]) assert.ok(finderText.includes(s),'dialog states: '+s);
      await p.keyboard.press('Escape');
      await p.waitForFunction(()=>!document.getElementById('aboutDialog').open);
      assert.ok(await p.evaluate(sel=>document.activeElement===document.querySelector(sel+' [data-open-about]'),visibleNote),'focus returns to the note’s button');
      /* the first-question note belongs to the first question only */
      await p.check('input[name="q-focus"][value="teaching"]',{force:true});await p.click('#next');
      await p.waitForFunction(()=>/Question 2/.test(document.querySelector('.qstep').textContent));
      assert.equal(await p.$$eval('#wizard .qsignal',e=>e.length),0);
      if(wide) assert.equal(await p.$$eval('.rail__note',e=>e.length),1,'the rail note stays while answering');
      pass('What If AI @'+width+'px: header statement, one note beside the questions, dialog opens from it and returns focus');

      /* the dialog is a six-slide carousel in the walkthroughs' style (changed October 28) */
      await p.click('.hdr [data-open-about]');await p.waitForSelector('#aboutDialog[open]');
      /* the reduced-motion rule gives every transition 1ms, so wait until the one slide showing is the current one */
      const state=async()=>{await p.waitForFunction(()=>{const v=[...document.querySelectorAll('#aboutDialog [data-slide]')].filter(s=>getComputedStyle(s).visibility!=='hidden');return v.length===1&&!v[0].inert;});return p.evaluate(()=>{const d=document.getElementById('aboutDialog'),ss=[...d.querySelectorAll('[data-slide]')];
        return {pos:d.querySelector('#aboutPos').textContent,on:ss.filter(s=>getComputedStyle(s).visibility!=='hidden'&&!s.inert).map(s=>s.querySelector('h3').textContent),
          next:d.querySelector('#aboutNext .tour__nextlabel').textContent,prevDisabled:d.querySelector('#aboutPrev').getAttribute('aria-disabled')};});};
      let st=await state();
      assert.deepEqual(st,{pos:'1 of 6',on:['What If AI'],next:'Next',prevDisabled:'true'});
      assert.deepEqual(await p.$$eval('#aboutDialog [data-slide] h3',hs=>hs.map(h=>h.textContent)),TITLES);
      const nextY=async()=>Math.round((await p.locator('#aboutNext').boundingBox()).y),y0=await nextY();
      await p.click('#aboutNext');st=await state();
      assert.deepEqual([st.pos,st.on],['2 of 6',['The Register']]);
      assert.equal(await nextY(),y0,'Next stays in place from slide to slide');
      await p.focus('#aboutDialog .tour__body');await p.keyboard.press('ArrowRight');st=await state();
      assert.deepEqual([st.pos,st.on],['3 of 6',['What leaves your browser']]);
      await p.click('#aboutPrev');assert.equal((await state()).pos,'2 of 6');
      await p.keyboard.press('End');st=await state();
      assert.deepEqual([st.pos,st.on,st.next],['6 of 6',['How it was made'],'Finish']);
      assert.equal(await nextY(),y0,'Next stays in place on the last slide');
      if(wide){await p.click('#aboutDialog [data-about-dot="3"]');assert.equal((await state()).pos,'4 of 6');await p.keyboard.press('End');}
      /* each slide has its own drawing in the walkthroughs' painted style, with no text, hidden from assistive technology */
      const art=await p.$$eval('#aboutDialog [data-slide]',ss=>ss.map(s=>{const a=s.querySelector('.tour__art');
        return {hidden:a&&a.getAttribute('aria-hidden'),text:a?a.querySelectorAll('text').length:-1,paint:!!(a&&a.querySelector('g[filter="url(#wc)"]'))};}));
      assert.ok(art.every(a=>a.hidden==='true'&&a.text===0&&a.paint),JSON.stringify(art));
      assert.ok(await p.evaluate(()=>!!document.getElementById('wc')&&!!document.getElementById('wcGold')),'the paint filter and washes are on the page');
      await p.click('#aboutNext');
      await p.waitForFunction(()=>!document.getElementById('aboutDialog').open);
      assert.ok(await p.evaluate(()=>document.activeElement.matches('.hdr [data-open-about]')),'Finish returns focus to the button');
      await p.click('.hdr [data-open-about]');await p.waitForSelector('#aboutDialog[open]');
      assert.equal((await state()).pos,'1 of 6','reopening starts at the first slide');
      await p.click('#aboutDialog .dlg__close');
      await p.waitForFunction(()=>!document.getElementById('aboutDialog').open);
      assert.ok(await p.evaluate(()=>document.activeElement.matches('.hdr [data-open-about]')),'✕ returns focus to the button');
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth<=0),'no sideways scrolling');
      pass('What If AI @'+width+'px: six slides with drawings; Next, Previous, arrow keys, End'+(wide?', dots':'')+'; Next stays put; Finish and ✕ close and return focus; reopening starts at slide 1');

      /* The Register: the header statement and the same dialog */
      await p.goto(server.url('register.html'));await ready(p);
      assert.equal(norm(await p.textContent('.hdr__signal')),REGISTER);
      await p.click('.hdr [data-open-about]');await p.waitForSelector('#aboutDialog[open]');
      assert.equal(norm(await p.textContent('#aboutDialog .dlg__body')),finderText,'both pages show the same dialog');
      assert.ok(await p.evaluate(()=>!!document.getElementById('wc')&&!!document.getElementById('wcGold')),'the paint filter and washes are on this page too');
      await p.keyboard.press('Escape');
      await p.waitForFunction(()=>!document.getElementById('aboutDialog').open);
      assert.ok(await p.evaluate(()=>document.activeElement.matches('.hdr [data-open-about]')));
      pass('The Register @'+width+'px: header statement; the shared dialog opens and returns focus');

      /* Ask Us says who answers, and the chat panel announces it */
      await p.click('#fabToggle');await p.click('#fabAskUs');
      await p.waitForSelector('#chatModal.open');
      assert.equal(norm(await p.textContent('#chatModalNote')),ASKUS);
      assert.equal(await p.getAttribute('#chatModal [role="dialog"]','aria-describedby'),'chatModalNote');
      assert.ok(!/\blive\b/i.test(await p.textContent('.chat-modal__sub')),'the subtitle does not promise live staff at all hours');
      pass('Ask Us @'+width+'px: the panel says when staff answer and that no AI system writes the replies');

      assert.deepEqual(errors,[]);
      await ctx.close();
    }

    /* the facts the statements rest on */
    const ctx=await createContext(browser,{viewport:{width:1280,height:900}}),p=await ctx.newPage();
    for(const f of ['what-if-ai.html','register.html']){
      await p.goto(server.url(f));await ready(p);
      const csp=await p.$eval('meta[http-equiv="Content-Security-Policy"]',m=>m.content);
      const dir=name=>((csp.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+' '))||'').split(/\s+/).slice(1));
      const endpoint=CFG.analytics.host_url.replace(/\/$/,'')+'/api/send';
      assert.deepEqual(dir('connect-src').sort(),["'self'",endpoint].sort(),f+': the page may contact only its own site and the visit counter');
      assert.deepEqual(dir('frame-src'),['https://lewisu.libanswers.com'],f+': the only embedded service is the library’s Ask Us chat');
      const tag=await p.$eval('script[data-website-id]',s=>({search:s.dataset.excludeSearch,hash:s.dataset.excludeHash}));
      assert.deepEqual(tag,{search:'true',hash:'true'},f+': visit counting leaves out search text and the answers after #');
    }
    /* the footer's disclosure says the same thing as the dialog's "How it was made", on every page */
    for(const f of ['','what-if-ai.html','register.html']){
      await p.goto(server.url(f));
      assert.equal(norm(await p.textContent('.site-foot .hcai')),'HCAI Disclosure: '+MADE+' Its use followed a Human-Centered AI (HCAI) framework.',(f||'landing page')+': footer disclosure');
    }
    await ctx.close();
    pass('facts: each page can contact only itself and the visit counter, embeds only Ask Us, and visit counting omits answers and search text');
    pass('the footer disclosure on every page matches “How it was made”');
  }finally{await browser.close();await server.close();}
  console.log('\n'+count+' checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
