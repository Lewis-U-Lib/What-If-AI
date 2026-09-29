/* A release import must preserve the old corpus and give each addition a real,
   labeled, zero-mismatch route through the actual matching engine. */
const assert=require('assert/strict'), fs=require('fs'), path=require('path'), crypto=require('crypto');
const M=require('../src/js/matching'), D=require('./public-data'), raw=require('../data/acts.json');
const rawReg=require('../data/register.json'), review=require('../content/publication-review.json'), curation=require('../content/curation.json'), fixture=require('./fixtures/release-2026-09-28.json');
const root=path.join(__dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'_site/version.json'),'utf8'));
const reg=JSON.parse(fs.readFileSync(path.join(root,'_site',version.assets['data/register.json']),'utf8'));
const accepted=new Set(review.decisions.filter(d=>d.decision==='publish').map(d=>d.id));
const held=new Set(review.decisions.filter(d=>d.decision==='hold').map(d=>d.id));
const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(normalize(x))).digest('hex');
const added=new Set(fixture.added_ids), workIds=new Set(fixture.added_work_ids);
const oldActs=raw.acts.filter(a=>!added.has(a.id)), oldWorks=rawReg.works.filter(w=>!workIds.has(w.id));
assert.equal(oldActs.length,fixture.existing_activities.count);
assert.equal(hash(oldActs),fixture.existing_activities.sha256,'Existing activities changed or reordered');
assert.equal(oldWorks.length,fixture.existing_works.count);
assert.equal(hash(oldWorks),fixture.existing_works.sha256,'Existing bibliography changed or reordered');
assert.equal(D.acts.length,779);assert.equal(reg.works.length,309);
assert.equal(accepted.size,70);assert.equal(held.size,11);
assert.deepEqual(D.acts.filter(a=>added.has(a.id)).map(a=>a.id).sort(),[...accepted].sort());
assert.equal(reg.works.filter(w=>workIds.has(w.id)).length,66);
assert.equal(D.n,D.acts.length);assert.equal(D.stamp.live,D.acts.length);
assert.deepEqual(reg.counts,{activities:779,works:309});assert.equal(reg.stamp.live,779);
const withdrawn=new Set(curation.withdrawals.ids);assert.equal(withdrawn.size,36);
for(const id of withdrawn)assert.ok(!D.acts.some(a=>a.id===id)&&!reg.works.some(w=>w.acts.includes(id)),id+' is withdrawn');
assert.deepEqual(D.acts.filter(a=>!M.admitted(a)).map(a=>a.id),[],'every published activity can surface in What If AI');
for(const id of held)assert.ok(!D.acts.some(a=>a.id===id)&&!reg.works.some(w=>w.acts.includes(id)),id+' remains unpublished');
assert.deepEqual(raw.acts.filter(a=>added.has(a.id)).map(a=>a.id).sort(),[...added].sort());
assert.deepEqual(rawReg.works.filter(w=>workIds.has(w.id)).map(w=>w.id).sort(),[...workIds].sort());
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
assert.equal(reg.types.no_ai.n,D.acts.filter(a=>a.cap.includes('none_required')).length);
for(const tier of [...reg.policy.tiers,reg.policy.aside])assert.equal(tier.n,D.acts.filter(a=>a.pol===tier.key).length);
for(const origin of reg.origin)assert.equal(origin[3],D.acts.filter(a=>a.cls===origin[0]).length);
let combinations=0;const report=[];
for(const a of D.acts.filter(a=>accepted.has(a.id))){
  assert.ok(!['active','passive'].includes(a.icap),`${a.id}: excluded by admission`);
  assert.ok(a.t&&a.sum&&a.cit&&a.lic&&a.licu&&a.attr&&a.url&&a.rel.length,`${a.id}: missing provenance`);
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
assert.equal(report.length,70);
assert.equal(D.acts.find(a=>a.id==='CAN-L-040').depth,'quick');
assert.ok(D.acts.find(a=>a.id==='CAN-L-034').sum.includes('not requirements of this free chatbot activity'));
if(process.env.INTEGRATION_REPORT)fs.writeFileSync(process.env.INTEGRATION_REPORT,JSON.stringify({release:fixture.release,activities:D.acts.length,works:reg.works.length,added:accepted.size,held:[...held],combinations,witnesses:report},null,2)+'\n');
console.log(`PASS: imported release intact (745 prior activities, 249 sources); 70 additions / 66 sources published, 11 held, 36 unreachable activities withdrawn. All 779 labels, source links and summary counts agree.`);
console.log(`PASS: all 70 additions have valid, selectable zero-mismatch paths across ${combinations} supported combinations.`);
module.exports={witnesses:report,combinations};
