/* Semantic tests use independent expected outcomes, real audit regressions, and all limit combinations. */
const assert=require('assert/strict');
const M=require('../src/js/matching');
const D=require('./public-data');
const A=D.acts;
const fixture={id:'fixture',focus:'teaching',task:['design'],disc:'stem',depth:'assignment',lvl:['any'],mod:['any'],icap:'constructive',pc:'none',eq:'free_tier',sen:'none',dis:'none_required',cap:['text_chat'],gr:0};
const state={focus:'teaching',task:'design',disc:'stem',depth:'assignment',lvl:'grad',mod:'online'};
let r=M.assess(fixture,state);
assert.deepEqual(r.exact,['task','disc','depth']);assert.deepEqual(r.compatible,['lvl','mod']);assert.deepEqual(r.mismatch,[]);
assert.equal(M.compare({...fixture,lvl:['firstyear']},'lvl','grad'),'mismatch');
assert.equal(M.compare({...fixture,mod:['in_person']},'mod','online'),'mismatch');
assert.equal(M.compare({...fixture,disc:''},'disc','stem'),'compatible');
// An activity recorded for any course ("interdisciplinary") is a possible fit for every specific field,
// never a field mismatch; a reader who picks Cross-curricular gets the exact match.
for(const [field] of D.intake.disc){
  assert.equal(M.compare({...fixture,disc:'interdisciplinary'},'disc',field),field==='interdisciplinary'?'exact':'compatible',field);
}
assert.equal(M.compare({...fixture,disc:'humanities'},'disc','stem'),'mismatch');
assert.equal(M.compare(fixture,'lvl',null),'unasked');
assert.equal(M.assess(fixture,{focus:'admin'}).status,'excluded');
for(const icap of ['active','passive'])assert.equal(M.assess({...fixture,icap},{}).status,'excluded');

for(const k of ['noaccount','nokit','noapproval']){
  assert.equal(M.requirement(fixture,k),'confirmed');
  for(const pc of [undefined,'not_specified','human_checking_required'])assert.equal(M.requirement({...fixture,pc},k),'unknown');
}
for(const [k,field,blocked] of [['noaccount','pc','account_verification'],['nokit','pc','equipment_required'],['nokit','pc','purchased_material'],['nokit','pc','travel_or_attendance'],['noapproval','pc','institutional_approval_required'],['nodisclose','dis','formal_statement'],['nostudent','sen','student_work'],['nopaid','eq','paid_with_stated_alternative'],['nopaid','eq','paid_required']]){
  assert.equal(M.assess({...fixture,[field]:blocked},{limits:{[k]:true}}).status,'excluded');
}
assert.equal(M.requirement({...fixture,pc:'equipment_required'},'noaccount'),'unknown');
// noai: "My students won't use an AI tool themselves". Instructor-only use counts; students operating a tool does not;
// a record that does not say who operates the tool is never a confirmed fit; a stated route without AI always qualifies.
for(const op of ['faculty_or_staff','optional','none'])assert.equal(M.requirement({...fixture,op},'noai'),'confirmed');
assert.equal(M.requirement({...fixture,op:'students'},'noai'),'excluded');
for(const op of ['not_specified',undefined])assert.equal(M.requirement({...fixture,op},'noai'),'unknown');
for(const op of ['students','not_specified',undefined])assert.equal(M.requirement({...fixture,op,na:'Run the comparison by hand.'},'noai'),'confirmed');
assert.equal(M.requirement({...fixture,op:'students',cap:['none_required']},'noai'),'excluded');
// Information derived from students' writing, even de-identified, is not a confirmed absence of student work.
assert.equal(M.requirement({...fixture,sen:'student_derived_deidentified'},'nostudent'),'unknown');
for(const sen of ['none','research_participant_deidentified'])assert.equal(M.requirement({...fixture,sen},'nostudent'),'confirmed');
for(const sen of ['student_work','identifiable_student_data','own_personal_data'])assert.equal(M.requirement({...fixture,sen},'nostudent'),'excluded');
for(const [k,field] of [['nopaid','eq'],['nostudent','sen'],['nodisclose','dis']]){
  for(const v of [undefined,'not_specified'])assert.equal(M.requirement({...fixture,[field]:v},k),'unknown');
}
// WIA-01: a source item that needs a purchase, membership, subscription, or permission first (sa: restricted)
// is never a confirmed fit for "nothing anyone has to pay for" or "no purchases"; a known conflict still excludes.
// Items that are only not openly licensed, or usable only as published, change neither requirement.
assert.equal(M.requirement({...fixture,sa:'restricted'},'nopaid'),'unknown');
assert.equal(M.requirement({...fixture,sa:'restricted'},'nokit'),'unknown');
assert.equal(M.requirement({...fixture,sa:'restricted',eq:'paid_required'},'nopaid'),'excluded');
assert.equal(M.requirement({...fixture,sa:'restricted',pc:'purchased_material'},'nokit'),'excluded');
for(const k of ['noaccount','noapproval','noai','nostudent','nodisclose'])
  assert.equal(M.requirement({...fixture,op:'none',sa:'restricted'},k),M.requirement({...fixture,op:'none'},k),k);
for(const sa of ['not_open','unmodified'])for(const k of ['nopaid','nokit'])assert.equal(M.requirement({...fixture,sa},k),'confirmed',sa+' '+k);
for(const a of A.filter(a=>a.sa==='restricted'))for(const k of ['nopaid','nokit'])assert.notEqual(M.requirement(a,k),'confirmed',a.id+' '+k);
// A known conflict always wins, even when a different selected requirement is unknown.
assert.equal(M.assess({...fixture,pc:'account_verification',dis:'not_specified'},{limits:{noaccount:true,nodisclose:true}}).status,'excluded');
const uncertain=M.search([{...fixture,pc:'not_specified'}],{limits:{noaccount:true}});
assert.equal(uncertain.confirmed,0);assert.equal(uncertain.unknown.length,1);assert.equal(uncertain.near,0);
assert.deepEqual(uncertain.unknown[0].unknown,['noaccount']);
assert.equal(M.search([{...fixture,pc:'account_verification'}],{limits:{noaccount:true}}).unknown.length,0);

// Known paid workflows cannot leak into recovery or unknown-result groups.
for(const id of ['CAN-L-038','CAN-L-039']){
  const a=A.find(a=>a.id===id);assert.equal(a.eq,'paid_required');
  assert.equal(M.assess(a,{}).status,'confirmed');
  assert.equal(M.assess(a,{limits:{nopaid:true,noaccount:true}}).status,'excluded');
  const paid=M.search([a],{limits:{nopaid:true}});
  assert.equal(paid.confirmed,0);assert.equal(paid.unknown.length,0);assert.equal(paid.near,0);
}
const sourceBefore=JSON.stringify(A);
const wildcard=M.search(A,{focus:'teaching',task:'assessment',disc:'humanities',depth:'module',lvl:'firstyear',mod:'in_person'});
assert.ok(wildcard.compatible.some(r=>r.activity.id==='CAN-B-ASMT-01'));
const research=M.search(A,{focus:'research_own',task:'qualitative',disc:'education',mod:'online'});
assert.ok(research.compatible.some(r=>r.activity.id==='CAN-W-workflow-016'));
assert.ok(research.near>0);
// A wildcard can support an option, without pretending its metadata is an exact match.
assert.ok(M.viable([fixture],{focus:'teaching'},'lvl',D.intake.lvl).grad);
assert.ok(M.viable([fixture],{focus:'teaching'},'mod',D.intake.mod).online);
assert.equal(M.viable([fixture],{focus:'teaching'},'lvl',D.intake.lvl).scholarly,undefined);

const confirmedSets=[],candidateSets=[];
for(let mask=0;mask<128;mask++){
  const limits={};M.limits.forEach((k,i)=>{if(mask&(1<<i))limits[k]=true;});
  const p=M.search(A,{limits});
  const confirmed=[...p.exact,...p.compatible,...p.close,...p.broader];
  assert.equal(confirmed.length,p.confirmed);
  const ids=[...confirmed,...p.unknown].map(r=>r.activity.id);assert.equal(new Set(ids).size,ids.length);
  // Independent checks of the promise, rather than calling requirement() to verify itself.
  for(const r of confirmed){const a=r.activity;
    if(limits.noaccount||limits.nokit||limits.noapproval)assert.equal(a.pc,'none');
    if(limits.nodisclose)assert.ok(['none_required','informal_acknowledgement','documented_log','anonymity_by_design'].includes(a.dis));
    if(limits.nopaid)assert.ok(['no_tool_needed','free_tier','institution_provided'].includes(a.eq));
    if(limits.nostudent)assert.ok(['none','student_derived_deidentified','research_participant_deidentified'].includes(a.sen));
    if(limits.noai)assert.ok(a.na||['faculty_or_staff','optional','none'].includes(a.op),a.id);
  }
  for(const r of p.unknown){assert.ok(r.unknown.length);assert.equal(r.excluded.length,0);}
  if(limits.noai)for(const r of p.unknown)assert.ok(r.unknown.includes('noai')===(r.activity.op==='not_specified'&&!r.activity.na));
  confirmedSets[mask]=new Set(confirmed.map(r=>r.activity.id));candidateSets[mask]=new Set(ids);
}
let comparisons=0;
for(let mask=0;mask<128;mask++)for(let i=0;i<7;i++)if(!(mask&(1<<i))){
  comparisons++;
  for(const id of confirmedSets[mask|(1<<i)])assert.ok(confirmedSets[mask].has(id));
  for(const id of candidateSets[mask|(1<<i)])assert.ok(candidateSets[mask].has(id));
}

// Preserve the original 16,452-state regression grid, then cover the expanded release.
// Single-option scale questions are skipped by the normal wizard.
const eligible=A.filter(a=>!['active','passive'].includes(a.icap));
let states=0,withRecovery=0,withMatches=0,expectedStates=0;
const originalGrid=require('./fixtures/matching-grid.json');
let originalStates=0;
for(const [focus,d] of Object.entries(originalGrid)){
  for(const task of [null,...d.task])for(const disc of [null,...d.disc])for(const depth of d.depth.length>1?[null,...d.depth]:[null])for(const lvl of [null,...d.lvl])for(const mod of [null,...d.mod]){
    const p=M.search(A,{focus,task,disc,depth,lvl,mod});originalStates++;
    assert.ok(p.near>0||p.broader.length>0||p.unknown.length>0);
  }
}
assert.equal(originalStates,16452);
for(const [focus] of D.intake.focus){
  const pool=eligible.filter(a=>a.focus===focus),domains={};
  for(const k of M.keys)domains[k]=D.intake[k].map(o=>o[0]).filter(v=>pool.some(a=>Array.isArray(a[k])?a[k].includes(v):a[k]===v));
  expectedStates+=(domains.task.length+1)*(domains.disc.length+1)*(domains.depth.length>1?domains.depth.length+1:1)*(domains.lvl.length+1)*(domains.mod.length+1);
  for(const task of [null,...domains.task])for(const disc of [null,...domains.disc])for(const depth of domains.depth.length>1?[null,...domains.depth]:[null])for(const lvl of [null,...domains.lvl])for(const mod of [null,...domains.mod]){
    const p=M.search(A,{focus,task,disc,depth,lvl,mod});states++;
    assert.ok(p.near>0||p.broader.length>0||p.unknown.length>0);
    if(p.near)withMatches++;else withRecovery++;
    assert.equal(p.confirmed,pool.length);
  }
}
assert.equal(states,expectedStates);assert.ok(states>=originalStates);assert.equal(JSON.stringify(A),sourceBefore);
console.log('PASS: explicit compatibility, known mismatch, focus, admission, unknown requirements, and both real audit regressions.');
console.log('PASS: all 128 limit combinations; '+comparisons+' single-limit additions preserve or narrow both confirmed and possible sets.');
console.log('PASS: original '+originalStates+' states retained; '+states+' expanded states: '+withMatches+' have exact/compatible/close matches; '+withRecovery+' have explicitly labeled broader recovery. No silent blank plan; activity data unchanged.');

// Result order reflects match quality, never array position. Reversing or shuffling the
// activities must not change any ordered group, and the tie-breaks are quality-first.
{
  const shuffled=A.slice().reverse(), seeded=A.slice();
  let seed=7;for(let i=seeded.length-1;i>0;i--){seed=(seed*1103515245+12345)%2147483648;const j=seed%(i+1);[seeded[i],seeded[j]]=[seeded[j],seeded[i]];}
  let orders=0;
  const ids=p=>['exact','compatible','close','broader','unknown'].map(g=>p[g].map(r=>r.activity.id).join(',')).join('|');
  for(const [focus] of D.intake.focus)for(const [task] of [[null],...D.intake.task])for(const lim of [{},{nopaid:true,noaccount:true}]){
    const s={focus,task,limits:lim},base=ids(M.search(A,s));
    assert.equal(ids(M.search(shuffled,s)),base,`order depends on array position: ${focus}/${task}`);
    assert.equal(ids(M.search(seeded,s)),base,`order depends on array position: ${focus}/${task}`);
    orders++;
  }
  const mk=(id,extra)=>({id,focus:'teaching',task:['design'],disc:'',depth:'assignment',lvl:['any'],mod:['any'],icap:'constructive',pc:'none',eq:'free_tier',sen:'none',dis:'none_required',cap:['text_chat'],gr:1,...extra});
  const s={focus:'teaching',task:'design',limits:{}};
  const order=list=>M.search(list,s).exact.map(r=>r.activity.id);
  // better recorded match first, then the quality tier, then reported use
  assert.deepEqual(order([mk('a',{gr:0}),mk('b',{gr:3})]),['b','a']);
  assert.deepEqual(order([mk('u',{use:'unreported'}),mk('r',{})]),['r','u']);
  assert.deepEqual(order([mk('s',{tier:'remix'}),mk('r',{})]),['r','s'],'a set record written for the collection has no reported use');
  assert.deepEqual(order([mk('u',{use:'unreported',gr:3}),mk('r',{gr:1})]),['u','r'],'quality tier outranks evidence of use');
  const plan=M.search([mk('x',{task:['design','feedback']}),mk('y',{gr:3,task:['feedback']})],{focus:'teaching',task:'design',limits:{}});
  assert.deepEqual(plan.exact.map(r=>r.activity.id),['x'],'a better match is never displaced by a higher tier');
  // same-source results are not broken up when they are the best matches
  const same=['s1','s2','s3'].map(id=>mk(id,{gr:3,rel:[['CSR-1','Source of this activity','',''] ]})), other=mk('o',{gr:2,rel:[['CSR-2','','','']]});
  assert.deepEqual(order([other,...same]).slice(0,3).sort(),['s1','s2','s3']);
  console.log('PASS: result order is independent of array position across '+orders+' focus/task/limit states; score, quality tier, and reported use decide ties before a neutral fixed order.');
}
