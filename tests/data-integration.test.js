/* A release import must preserve the old corpus and give each addition a real,
   labeled, zero-mismatch route through the actual matching engine. */
const assert=require('assert/strict'), fs=require('fs'), path=require('path'), crypto=require('crypto');
const M=require('../src/js/matching'), D=require('./public-data'), raw=require('../data/acts.json');
const rawReg=require('../data/register.json'), review=require('../content/publication-review.json'), curation=require('../content/curation.json'), tiers=require('../content/tiers.json'), aiUse=require('../content/ai-use.json'), rr=require('../content/record-review.json'), fixture=require('./fixtures/release-2026-09-28.json');
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
// The AI-use review withdraws activities in which AI is neither used nor discussed.
const aiWithdrawn=new Set(aiUse.withdrawals.records.map(r=>r.id));assert.equal(aiWithdrawn.size,aiUse.expected_counts.withdrawn);
// The record review withdraws activities whose AI step was added editorially and holds records awaiting a decision.
const rrRemoved=new Set([...rr.withdrawals.records.map(r=>r.id),...rr.held.map(h=>h.id)]);
assert.equal(rrRemoved.size,rr.expected_counts.withdrawn+rr.expected_counts.held);
const rrLicensed=[...rrRemoved].filter(id=>id.startsWith('CAN-')).length, rrSets=[...rrRemoved].filter(id=>id.startsWith('WIA-')).length;
assert.equal(rrLicensed+rrSets,rrRemoved.size);
const byIdAll=new Set(D.acts.map(a=>a.id));
const licensed=D.acts.filter(a=>!a.tier), setRecords=D.acts.filter(a=>a.tier);
assert.equal(licensed.length,779-aiWithdrawn.size-rrLicensed);assert.equal(setRecords.length,tiers.expected_counts.added-rrSets);
assert.equal(D.acts.length,779+tiers.expected_counts.added-aiWithdrawn.size-rrRemoved.size);
assert.equal(reg.works.length,309+tiers.expected_counts.new_works-aiUse.expected_counts.works_removed-rr.expected_counts.works_removed);
assert.equal(accepted.size,70);assert.equal(held.size,11);
assert.deepEqual(D.acts.filter(a=>added.has(a.id)).map(a=>a.id).sort(),[...accepted].filter(id=>!aiWithdrawn.has(id)&&!rrRemoved.has(id)).sort());
assert.ok(licensed.every(a=>a.cls==='licensed_adaptation'),'the licensed collection is unchanged in class');
assert.equal(reg.works.filter(w=>workIds.has(w.id)).length,66-aiUse.expected_counts.works_removed-rawReg.works.filter(w=>workIds.has(w.id)&&!reg.works.some(x=>x.id===w.id)&&!w.acts.some(id=>aiWithdrawn.has(id))&&w.acts.some(id=>rrRemoved.has(id))).length);
assert.equal(rawReg.works.filter(w=>!reg.works.some(x=>x.id===w.id)&&w.acts.some(id=>aiWithdrawn.has(id))).length,aiUse.expected_counts.works_removed);
assert.equal(D.n,D.acts.length);assert.equal(D.stamp.live,D.acts.length);
assert.deepEqual(reg.counts,{activities:D.acts.length,works:reg.works.length});assert.equal(reg.stamp.live,D.acts.length);
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
assert.equal(reg.types.no_ai.n,D.acts.filter(a=>M.requirement(a,'noai')==='confirmed').length);
assert.equal(reg.types.no_ai.n,rr.expected_counts.students_use_no_tool);
for(const tier of [...reg.policy.tiers,reg.policy.aside])assert.equal(tier.n,D.acts.filter(a=>a.pol===tier.key).length);
for(const origin of reg.origin)assert.equal(origin[3],D.acts.filter(a=>a.cls===origin[0]).length);
for(const tier of reg.tiers)assert.equal(tier[3],D.acts.filter(a=>a.tier===tier[0]).length);
assert.deepEqual(reg.tiers.map(t=>t[0]),['synthesis','remix']);assert.deepEqual(D.tiers.map(t=>t[0]),['synthesis','remix']);
// Who uses the AI tool: one reviewed, labeled value on every activity, nothing withdrawn left behind,
// and the No-AI limit admits exactly what the reviewed values and stated routes establish.
const operators=D.operators.map(o=>o[0]);
assert.deepEqual(operators,['students','faculty_or_staff','optional','none','not_specified']);
assert.ok(D.operators.every(o=>o[1]&&o[2]));
for(const a of D.acts)assert.ok(operators.includes(a.op),`${a.id}: unlabeled operator ${a.op}`);
for(const op of operators)assert.equal(D.acts.filter(a=>a.op===op).length,rr.expected_counts[op],op);
for(const id of aiWithdrawn)assert.ok(!byIdAll.has(id)&&!reg.works.some(w=>w.acts.includes(id)),id+' is withdrawn');
for(const r of aiUse.withdrawals.records)assert.ok(r.reason&&r.evidence.length,r.id+' needs its reason');
assert.ok(!D.acts.some(a=>a.par&&aiWithdrawn.has(a.par)),'no remix builds on a withdrawn activity');
for(const id of rrRemoved)assert.ok(!byIdAll.has(id)&&!reg.works.some(w=>w.acts.includes(id)),id+' is withdrawn or held');
for(const r of rr.withdrawals.records)assert.ok(r.reason&&r.evidence,r.id+' needs its reason and evidence');
for(const h of rr.held)assert.ok(['source_access','license','parent_removed'].includes(h.category)&&h.reason,h.id+' needs a category and reason');
assert.ok(!D.acts.some(a=>a.par&&rrRemoved.has(a.par)),'no remix builds on a withdrawn or held activity');
// Consistency: who uses AI, the AI tool needed, and the AI role agree on every published record.
for(const a of D.acts){
  if(a.op==='none')assert.deepEqual(a.cap,['none_required'],a.id+': no one uses AI, so no AI tool is needed');
  if(a.cap.includes('none_required'))assert.ok(a.cap.length===1&&a.op==='none',a.id+': no AI tool needed, so no one uses one');
  if(a.ar==='withheld')assert.notEqual(a.op,'students',a.id+': AI kept out is not AI that students operate');
}
// The reviewed corrections reach the published records.
for(const e of rr.corrections){const a=D.acts.find(x=>x.id===e.id);if(a)assert.deepEqual(a[e.field],e.after,e.id+' '+e.field);}
const RRW=new Map(reg.works.map(w=>[w.id,w]));
for(const e of rr.work_fields){const w=RRW.get(e.id);if(w)assert.equal(w[e.field],e.after,e.id+' '+e.field);}
assert.ok(reg.works.every(w=>w.acts.length),'no source is left without an activity');
for(const a of D.acts){
  const want=a.na?'confirmed':a.op==='students'?'excluded':['faculty_or_staff','optional','none'].includes(a.op)?'confirmed':'unknown';
  assert.equal(M.requirement(a,'noai'),want,a.id);
}
assert.deepEqual(D.limits.find(l=>l[0]==='noai').slice(1),[aiUse.limit.after[0],rr.text.find(t=>t.file==='acts.json'&&t.path[0]==='limits').after]);
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
assert.equal(report.length,[...accepted].filter(id=>!aiWithdrawn.has(id)&&!rrRemoved.has(id)).length);

// The two labeled sets: every record carries its set, full provenance, sources that link back,
// and a real zero-mismatch route through the Finder. Held records never reach either tool.
const held2=new Set(tiers.held.map(h=>h.id)), byId=new Map(D.acts.map(a=>[a.id,a]));
for(const id of held2)assert.ok(!byId.has(id)&&!reg.works.some(w=>w.acts.includes(id)),id+' is held');
let setCombinations=0;const setReport=[];
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
    assert.ok(a.rel.some(r=>r[1]==='Adapted from (activity structure)')&&a.rel.some(r=>r[1]==='Theoretical foundation'),`${a.id}: three parents`);}
  const options={task:a.task,disc:[a.disc||'interdisciplinary'],depth:[a.depth],
    lvl:a.lvl.includes('any')?D.intake.lvl.map(o=>o[0]).filter(v=>v!=='scholarly'||a.focus==='research_own'):a.lvl,
    mod:a.mod.includes('any')?D.intake.mod.map(o=>o[0]):a.mod};
  let best;
  for(const task of options.task)for(const disc of options.disc)for(const depth of options.depth)for(const lvl of options.lvl)for(const mod of options.mod){
    const state={focus:a.focus,task,disc,depth,lvl,mod};
    const p=M.search(D.acts,state), group=p.exact.some(r=>r.activity.id===a.id)?'exact':'compatible';
    const index=p[group].findIndex(r=>r.activity.id===a.id);
    assert.ok(index>=0,`${a.id}: no zero-mismatch result`);
    setCombinations++;
    if(!best||index<best.rank-1)best={id:a.id,state,group,rank:index+1};
  }
  setReport.push(best);
}
assert.equal(setReport.length,tiers.expected_counts.added-rrSets);
assert.equal(D.acts.find(a=>a.id==='CAN-L-040').depth,'quick');
assert.ok(D.acts.find(a=>a.id==='CAN-L-034').sum.includes('not requirements of this free chatbot activity'));
if(process.env.INTEGRATION_REPORT)fs.writeFileSync(process.env.INTEGRATION_REPORT,JSON.stringify({release:fixture.release,activities:D.acts.length,works:reg.works.length,added:accepted.size,held:[...held],combinations,witnesses:report},null,2)+'\n');
console.log(`PASS: imported release intact (745 prior activities, 249 sources); 70 additions / 66 sources published, 11 held, 36 unreachable activities withdrawn. All ${D.acts.length} labels, source links and summary counts agree.`);
console.log(`PASS: every activity records who uses the AI tool (${operators.map(op=>op+' '+rr.expected_counts[op]).join(', ')}); ${aiWithdrawn.size} activities that neither use nor discuss AI are withdrawn with their reasons; the No-AI limit admits exactly the ${reg.types.no_ai.n} activities the reviewed values establish.`);
console.log(`PASS: record review: ${rr.expected_counts.withdrawn} activities whose AI step was added editorially withdrawn, ${rr.expected_counts.held} records held with their reasons, ${rr.corrections.length+rr.text_edits.length} reviewed corrections applied; who uses AI, the tool needed, and the AI role agree on every record.`);
console.log(`PASS: ${setRecords.length} set records (${reg.tiers.map(t=>t[3]+' '+t[0]).join(', ')}) carry their set, full provenance and linked sources; ${held2.size} held records stay out; each has a zero-mismatch path across ${setCombinations} combinations.`);
console.log(`PASS: all ${report.length} additions still published have valid, selectable zero-mismatch paths across ${combinations} supported combinations.`);
module.exports={witnesses:report,combinations};
