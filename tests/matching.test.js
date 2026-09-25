/* Semantic tests use independent expected outcomes, real audit regressions, and all limit combinations. */
const assert=require('assert/strict');
const M=require('../src/js/matching');
const D=require('../data/acts.json');
const A=D.acts;
const fixture={id:'fixture',focus:'teaching',task:['design'],disc:'stem',depth:'assignment',lvl:['any'],mod:['any'],icap:'constructive',pc:'none',eq:'free_tier',sen:'none',dis:'none_required',cap:['text_chat'],gr:0};
const state={focus:'teaching',task:'design',disc:'stem',depth:'assignment',lvl:'grad',mod:'online'};
let r=M.assess(fixture,state);
assert.deepEqual(r.exact,['task','disc','depth']);assert.deepEqual(r.compatible,['lvl','mod']);assert.deepEqual(r.mismatch,[]);
assert.equal(M.compare({...fixture,lvl:['firstyear']},'lvl','grad'),'mismatch');
assert.equal(M.compare({...fixture,mod:['in_person']},'mod','online'),'mismatch');
assert.equal(M.compare({...fixture,disc:''},'disc','stem'),'compatible');
assert.equal(M.compare(fixture,'lvl',null),'unasked');
assert.equal(M.assess(fixture,{focus:'admin'}).status,'excluded');
for(const icap of ['active','passive'])assert.equal(M.assess({...fixture,icap},{}).status,'excluded');

for(const k of ['noaccount','nokit','noapproval']){
  assert.equal(M.requirement(fixture,k),'confirmed');
  for(const pc of [undefined,'not_specified','human_checking_required'])assert.equal(M.requirement({...fixture,pc},k),'unknown');
}
for(const [k,field,blocked] of [['noaccount','pc','account_verification'],['nokit','pc','equipment_required'],['nokit','pc','purchased_material'],['nokit','pc','travel_or_attendance'],['noapproval','pc','institutional_approval_required'],['nodisclose','dis','formal_statement'],['nostudent','sen','student_work'],['nopaid','eq','paid_with_stated_alternative']]){
  assert.equal(M.assess({...fixture,[field]:blocked},{limits:{[k]:true}}).status,'excluded');
}
assert.equal(M.requirement({...fixture,pc:'equipment_required'},'noaccount'),'unknown');
for(const [k,field] of [['nopaid','eq'],['nostudent','sen'],['nodisclose','dis']]){
  for(const v of [undefined,'not_specified'])assert.equal(M.requirement({...fixture,[field]:v},k),'unknown');
}
// A known conflict always wins, even when a different selected requirement is unknown.
assert.equal(M.assess({...fixture,pc:'account_verification',dis:'not_specified'},{limits:{noaccount:true,nodisclose:true}}).status,'excluded');
const uncertain=M.search([{...fixture,pc:'not_specified'}],{limits:{noaccount:true}});
assert.equal(uncertain.confirmed,0);assert.equal(uncertain.unknown.length,1);assert.equal(uncertain.near,0);
assert.deepEqual(uncertain.unknown[0].unknown,['noaccount']);
assert.equal(M.search([{...fixture,pc:'account_verification'}],{limits:{noaccount:true}}).unknown.length,0);

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
    if(limits.noai)assert.ok(a.cap.includes('none_required')||a.na);
  }
  for(const r of p.unknown){assert.ok(r.unknown.length);assert.equal(r.excluded.length,0);}
  confirmedSets[mask]=new Set(confirmed.map(r=>r.activity.id));candidateSets[mask]=new Set(ids);
}
let comparisons=0;
for(let mask=0;mask<128;mask++)for(let i=0;i<7;i++)if(!(mask&(1<<i))){
  comparisons++;
  for(const id of confirmedSets[mask|(1<<i)])assert.ok(confirmedSets[mask].has(id));
  for(const id of candidateSets[mask|(1<<i)])assert.ok(candidateSets[mask].has(id));
}

// Repeat the audit's original 16,452-state grid, including unanswered preferences.
// Single-option scale questions are skipped by the normal wizard.
const eligible=A.filter(a=>!['active','passive'].includes(a.icap));
let states=0,withRecovery=0,withMatches=0;
for(const [focus] of D.intake.focus){
  const pool=eligible.filter(a=>a.focus===focus),domains={};
  for(const k of M.keys)domains[k]=D.intake[k].map(o=>o[0]).filter(v=>pool.some(a=>Array.isArray(a[k])?a[k].includes(v):a[k]===v));
  for(const task of [null,...domains.task])for(const disc of [null,...domains.disc])for(const depth of domains.depth.length>1?[null,...domains.depth]:[null])for(const lvl of [null,...domains.lvl])for(const mod of [null,...domains.mod]){
    const p=M.search(A,{focus,task,disc,depth,lvl,mod});states++;
    assert.ok(p.near>0||p.broader.length>0||p.unknown.length>0);
    if(p.near)withMatches++;else withRecovery++;
    assert.equal(p.confirmed,pool.length);
  }
}
assert.equal(states,16452);assert.equal(JSON.stringify(A),sourceBefore);
console.log('PASS: explicit compatibility, known mismatch, focus, admission, unknown requirements, and both real audit regressions.');
console.log('PASS: all 128 limit combinations; '+comparisons+' single-limit additions preserve or narrow both confirmed and possible sets.');
console.log('PASS: '+states+' audit states: '+withMatches+' have exact/compatible/close matches; '+withRecovery+' have explicitly labeled broader recovery. No silent blank plan; activity data unchanged.');
