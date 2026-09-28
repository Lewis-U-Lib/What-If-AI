/* Regressions for focus, small screens, printing, and the complete supplied walkthrough. */
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
module.exports=async function checkRegisterTour(page,check){
  const titles=['The reference companion','What is here','Reading an activity: who, how big, which tools','Reading an activity: judgment and cautions','Source and license','How the collection was assembled','Saving and printing','Activity feedback','Corrections and questions'];
  const out=process.env.REGISTER_TOUR_SCREENSHOTS;
  if(out)fs.mkdirSync(out,{recursive:true});
  const state=()=>page.locator('#rtour [data-slide]').evaluateAll(slides=>slides.map(s=>!s.inert&&s.getAttribute('aria-hidden')!=='true'&&getComputedStyle(s).visibility==='visible'));
  const step=async n=>{await page.focus('#rtourNext');await page.keyboard.press('Home');for(let i=1;i<n;i++)await page.keyboard.press('ArrowRight');};
  assert.deepEqual(await page.locator('#rtour h3').allTextContents(),titles);
  check('The Register: the old help grid is replaced by one walkthrough',await page.locator('#about .about').count()===0&&await page.locator('#rtour').count()===1);
  check('The Register: step changes have one polite, atomic status announcement',await page.locator('#rtourPos').getAttribute('role')==='status'&&await page.locator('#rtourPos').getAttribute('aria-live')==='polite'&&await page.locator('#rtourPos').getAttribute('aria-atomic')==='true');
  await step(1);await page.locator('#rtour [data-slide]').first().locator('a').first().focus();await page.keyboard.press('ArrowRight');
  check('The Register: arrow navigation from a link moves focus to the new visible heading',await page.evaluate(()=>document.activeElement===document.querySelectorAll('#rtour h3')[1]&&!document.activeElement.closest('[inert]')));
  await page.keyboard.press('ArrowRight');
  check('The Register: keyboard navigation continues after leaving a slide link',(await page.textContent('#rtourPos'))==='3 of 9');
  await page.keyboard.press('Home');await page.keyboard.press('Tab');
  check('The Register: Tab reaches only the current slide’s links',await page.evaluate(()=>document.activeElement===document.querySelector('#rtour [data-slide] a')));
  await page.focus('#rtourNext');await page.keyboard.press('Tab');
  check('The Register: Tab can leave the walkthrough',await page.evaluate(()=>!document.activeElement.closest('#rtour')));
  await page.focus('#h-about');await page.keyboard.press('End');
  check('The Register: keys outside the walkthrough do not change steps',(await page.textContent('#rtourPos'))==='1 of 9');
  // Internal links retain the existing routes, section heading focus, and Back behavior.
  await step(2);await page.locator('#rtour a[href="#ai-types"]').first().click();
  await page.waitForFunction(()=>document.activeElement.id==='h-ai-types');
  assert.ok(page.url().endsWith('#ai-types'));
  await page.goBack();await page.waitForSelector('#about.is-on');
  check('The Register: a walkthrough section link and Back preserve the current step',(await page.textContent('#rtourPos'))==='2 of 9');
  let geometryChecks=0;
  for(const width of [320,390,760,761,1024,1440]){
    await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);await step(1);
    let previous;
    for(let n=1;n<=9;n++){
      const actual=await state();assert.equal(actual.filter(Boolean).length,1);assert.ok(actual[n-1]);
      assert.ok(await page.locator('#rtour .is-off .btn').evaluateAll(es=>es.every(e=>getComputedStyle(e).visibility==='hidden')),'A previous slide’s button remains visible during its transition');
      const g=await page.locator('#rtour').evaluate(e=>{const r=e.getBoundingClientRect(),foot=e.querySelector('.rtour__foot').getBoundingClientRect();return {height:r.height,foot:foot.top-r.top,overflow:document.documentElement.scrollWidth-innerWidth,footOverflow:e.querySelector('.rtour__foot').scrollWidth-e.querySelector('.rtour__foot').clientWidth};});
      assert.ok(g.overflow<=1&&g.footOverflow<=1,`${width}px step ${n}: ${JSON.stringify(g)}`);
      if(previous){assert.ok(Math.abs(g.height-previous.height)<=1,`${width}px step ${n}: frame resized: ${JSON.stringify({previous,g})}`);assert.ok(Math.abs(g.foot-previous.foot)<=1,`${width}px step ${n}: controls moved within the frame: ${JSON.stringify({previous,g})}`);}
      previous=g;geometryChecks++;
      if(out&&[390,1440].includes(width)&&[1,4].includes(n))await page.locator('#rtour').screenshot({path:path.join(out,`step-${n}-${width}.png`)});
      if(n<9)await page.keyboard.press('ArrowRight');
    }
    await page.click('#rtourNext');assert.equal(await page.textContent('#rtourPos'),'1 of 9');
  }
  check('The Register: all nine steps keep a stable frame and fit six screen widths',geometryChecks===54,geometryChecks+' layouts');
  await step(4);await page.emulateMedia({media:'print'});
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  const printed=await page.locator('#rtour [data-slide]').evaluateAll(slides=>slides.map(s=>({accessible:!s.inert&&s.getAttribute('aria-hidden')!=='true',visible:getComputedStyle(s).visibility==='visible',art:getComputedStyle(s.querySelector('.tour__art')).display,text:[...s.querySelectorAll('p,dd')].map(n=>getComputedStyle(n).color),top:s.getBoundingClientRect().top,bottom:s.getBoundingClientRect().bottom})));
  check('The Register: printing exposes all nine steps in order without illustrations',printed.length===9&&printed.every((s,i)=>s.accessible&&s.visible&&s.art==='none'&&(!i||s.top>=printed[i-1].bottom-1)));
  check('The Register: printed help uses dark text on paper',printed.every(s=>s.text.every(c=>c==='rgb(17, 17, 17)')));
  check('The Register: printed help retains the link to What If AI’s walkthrough',await page.locator('#rtour a[href="what-if-ai.html#tour"]').isVisible());
  check('The Register: printed help omits carousel controls',await page.locator('.rtour__foot').evaluate(e=>getComputedStyle(e).display==='none'));
  if(out)await page.locator('#about').screenshot({path:path.join(out,'print-layout.png')});
  const pdf=await page.pdf({format:'Letter',printBackground:false,...(out?{path:path.join(out,'register-walkthrough-print.pdf')}:{})});
  assert.ok(pdf.length>1024);
  await page.emulateMedia({media:'screen'});
  check('The Register: after printing, the reader’s step and hidden-slide boundaries are restored',(await page.textContent('#rtourPos'))==='4 of 9'&&JSON.stringify(await state())===JSON.stringify([false,false,false,true,false,false,false,false,false]));
  await step(1);
};
