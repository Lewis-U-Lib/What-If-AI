/* Every public record must carry valid labels, traceable sources, and a reachable Finder path. */
const assert=require('assert/strict'), fs=require('fs'), path=require('path');
const M=require('../src/js/matching'), D=require('./public-data');
const root=path.join(__dirname,'..'), release=require('../data/release.json');
const version=JSON.parse(fs.readFileSync(path.join(root,'_site/version.json'),'utf8'));
const reg=JSON.parse(fs.readFileSync(path.join(root,'_site',version.assets['data/register.json']),'utf8'));
assert.equal(D.acts.length,release.counts.activities);
assert.equal(reg.works.length,release.counts.works);
assert.equal(D.n,D.acts.length);assert.equal(D.stamp.live,D.acts.length);
assert.deepEqual(reg.counts,{activities:D.acts.length,works:reg.works.length});assert.equal(reg.stamp.live,D.acts.length);
assert.ok(D.acts.every(M.admitted),'every public record can surface in the Finder');
const knownCaps=new Set(['text_chat','image_generation','audio_or_voice','code_execution','retrieval_grounded','image_understanding','external_retrieval','workflow_automation','video_generation','none_required']);
const requirements={pc:['none','not_specified','human_checking_required','institutional_approval_required','equipment_required','purchased_material','travel_or_attendance','account_verification'],eq:['no_tool_needed','free_tier','institution_provided','paid_with_stated_alternative','paid_required','not_specified'],sen:['none','not_specified','student_work','student_derived_deidentified','identifiable_student_data','own_personal_data','personal_sensitive','identifiable_third_party','confidential_third_party','research_participant_deidentified','restricted_institutional_data'],dis:['none_required','informal_acknowledgement','documented_log','formal_statement','anonymity_by_design','not_specified']};
const ids=new Set(D.acts.map(a=>a.id)), works=new Map(reg.works.map(w=>[w.id,w]));
assert.equal(ids.size,D.acts.length);assert.equal(works.size,reg.works.length);
for(const a of D.acts){
  for(const key of ['focus',...M.keys]){
    const values=Array.isArray(a[key])?a[key]:[a[key]], allowed=new Set(D.intake[key].map(o=>o[0]));
    if(key==='lvl'||key==='mod')allowed.add('any');if(key==='disc')allowed.add('');
    assert.ok(values.length,`${a.id}: empty ${key}`);
    for(const value of values)assert.ok(allowed.has(value),`${a.id}: unlabeled ${key}=${value}`);
    if(key==='task'||key==='lvl'||key==='mod')assert.ok(Array.isArray(a[key]),`${a.id}: ${key} must be an array`);
  }
  assert.ok(Array.isArray(a.cap)&&a.cap.length,`${a.id}: missing capability`);
  for(const cap of a.cap)assert.ok(knownCaps.has(cap),`${a.id}: unlabeled capability ${cap}`);
  for(const [key,values] of Object.entries(requirements))if(a[key]!=null)assert.ok(values.includes(a[key]),`${a.id}: unknown ${key}=${a[key]}`);
  for(const relation of a.rel||[])assert.ok(works.has(relation[0]),`${a.id}: missing source ${relation[0]}`);
}
for(const w of reg.works)for(const id of w.acts)assert.ok(ids.has(id),`${w.id}: dangling activity ${id}`);
for(const type of reg.types.types){
  const n=D.acts.filter(a=>type.caps.some(c=>a.cap.includes(c))||(type.ids||[]).includes(a.id)).length;
  assert.equal(type.n,n,`${type.key}: stale type count`);
}
assert.equal(reg.types.no_ai.n,D.acts.filter(a=>M.requirement(a,'noai')==='confirmed').length);
for(const tier of [...reg.policy.tiers,reg.policy.aside])assert.equal(tier.n,D.acts.filter(a=>a.pol===tier.key).length);
for(const origin of reg.origin)assert.equal(origin[3],D.acts.filter(a=>a.cls===origin[0]).length);
for(const tier of reg.tiers)assert.equal(tier[3],D.acts.filter(a=>a.tier===tier[0]).length);
assert.deepEqual(reg.tiers.map(t=>t[0]),['synthesis','remix']);assert.deepEqual(D.tiers.map(t=>t[0]),['synthesis','remix']);
const operators=D.operators.map(o=>o[0]);
assert.deepEqual(operators,['students','faculty_or_staff','optional','none','not_specified']);
assert.ok(D.operators.every(o=>o[1]&&o[2]));
for(const a of D.acts)assert.ok(operators.includes(a.op),`${a.id}: unlabeled operator ${a.op}`);
// Consistency: who uses AI, the AI tool needed, and the AI role agree on every published record.
for(const a of D.acts){
  if(a.op==='none')assert.deepEqual(a.cap,['none_required'],a.id+': no one uses AI, so no AI tool is needed');
  if(a.cap.includes('none_required'))assert.ok(a.cap.length===1&&a.op==='none',a.id+': no AI tool needed, so no one uses one');
  if(a.ar==='withheld')assert.notEqual(a.op,'students',a.id+': AI kept out is not AI that students operate');
}
assert.ok(reg.works.every(w=>w.acts.length),'no source is left without an activity');
for(const a of D.acts){
  const want=a.na?'confirmed':a.op==='students'?'excluded':['faculty_or_staff','optional','none'].includes(a.op)?'confirmed':'unknown';
  assert.equal(M.requirement(a,'noai'),want,a.id);
}
let combinations=0;const report=[];
for(const a of D.acts){
  assert.ok(!['active','passive'].includes(a.icap),`${a.id}: excluded by admission`);
  assert.ok(a.t&&a.sum&&a.cit&&a.lic&&a.rel.length,`${a.id}: missing provenance`);
  if(a.id.startsWith('CAN-L-'))assert.ok(a.licu&&a.attr&&a.url,`${a.id}: missing attribution or source link`);
  for(const relation of a.rel)assert.ok(works.get(relation[0]).acts.includes(a.id),`${a.id}: source does not link back`);
  const options={task:a.task,disc:[a.disc||'interdisciplinary'],depth:[a.depth],
    lvl:a.lvl.includes('any')?D.intake.lvl.map(o=>o[0]).filter(v=>v!=='scholarly'||a.focus==='research_own'):a.lvl,
    mod:a.mod.includes('any')?D.intake.mod.map(o=>o[0]):a.mod};
  let best;
  for(const task of options.task)for(const disc of options.disc)for(const depth of options.depth)for(const lvl of options.lvl)for(const mod of options.mod){
    const state={focus:a.focus,task,disc,depth,lvl,mod};
    for(const key of ['focus',...M.keys])assert.ok(M.viable(D.acts,state,key,D.intake[key])[state[key]],`${a.id}: unreachable ${key}=${state[key]}`);
    const p=M.search(D.acts,state), group=p.exact.some(r=>r.activity.id===a.id)?'exact':'compatible';
    const index=p[group].findIndex(r=>r.activity.id===a.id);
    assert.ok(index>=0,`${a.id}: no zero-mismatch result`);
    assert.equal(p[group][index].mismatch.length,0);assert.equal(p[group][index].unknown.length,0);
    combinations++;
    if(!best||index<best.rank-1)best={id:a.id,title:a.t,state,group,rank:index+1};
  }
  assert.ok(best);report.push(best);
}
assert.equal(report.length,D.acts.length);

const setRecords=D.acts.filter(a=>a.tier),byId=new Map(D.acts.map(a=>[a.id,a]));
for(const a of setRecords){
  assert.ok(['synthesis','remix'].includes(a.tier),`${a.id}: unknown set`);
  assert.ok(['hybrid_synthesis','original_synthesis','licensed_adaptation'].includes(a.cls),`${a.id}: class`);
  assert.ok(a.t&&a.sum&&a.cit&&a.lic&&a.licu&&a.licn&&a.chg&&a.dep&&a.chk&&a.gate&&a.rel.length,`${a.id}: missing provenance`);
  assert.equal(a.gr,0);assert.ok(!['active','passive'].includes(a.icap));
  const adapted=a.rel.filter(r=>r[1].startsWith('Adapted from'));
  assert.equal(a.cls==='original_synthesis',adapted.length===0,`${a.id}: class and adapted sources disagree`);
  if(adapted.length)assert.ok(a.attr,`${a.id}: adapted sources need attribution`);
  for(const r of a.rel){const w=works.get(r[0]);assert.ok(w.acts.includes(a.id),`${a.id}: source does not link back`);
    if(r[1].startsWith('Adapted from'))assert.ok(!/ND|NoDeriv/.test(w.lic),`${a.id}: adapts a NoDerivatives work`);}
  if(a.tier==='remix'){assert.ok(byId.has(a.par)&&!byId.get(a.par).tier,`${a.id}: builds on a published activity`);
    assert.ok(a.rel.some(r=>r[1]==='Adapted from (use-case idea structure)')&&a.rel.some(r=>r[1]==='Theoretical foundation'),`${a.id}: three parents`);}
}
assert.equal(D.acts.find(a=>a.id==='CAN-L-040').depth,'quick');
assert.ok(D.acts.find(a=>a.id==='CAN-L-034').sum.includes('not requirements of this free chatbot use-case idea'));
// Browser coverage includes the established catalog paths and every set/class combination.
const sampleIds=new Set(D.acts.filter(a=>a.id.startsWith('CAN-L-')).map(a=>a.id));
for(const a of setRecords)if(![...sampleIds].some(id=>byId.get(id).tier===a.tier&&byId.get(id).cls===a.cls))sampleIds.add(a.id);
const witnesses=report.filter(w=>sampleIds.has(w.id));
if(process.env.INTEGRATION_REPORT)fs.writeFileSync(process.env.INTEGRATION_REPORT,JSON.stringify({release:release.release,activities:D.acts.length,works:reg.works.length,combinations,witnesses:report},null,2)+'\n');
console.log(`PASS: all ${D.acts.length} public ideas and ${reg.works.length} sources have consistent labels, relationships, counts, and AI operators.`);
console.log(`PASS: ${setRecords.length} synthesis/remix records have valid source attribution, licenses, and parents.`);
console.log(`PASS: every public idea has a selectable zero-mismatch Finder path across ${combinations} supported combinations.`);
module.exports={witnesses,combinations};
