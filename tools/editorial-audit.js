/* A repeatable review queue, not an effectiveness test or an automatic retagging tool. */
const fs=require('node:fs');
const path=require('node:path');
const M=require('../src/js/matching');
const D=require('../data/acts.json');
const scenarios=[
 ['Quick humanities activity, no payment',{focus:'teaching',task:'design',disc:'humanities',depth:'quick',limits:{nopaid:true}}],
 ['Feedback without uploading student work',{focus:'teaching',task:'feedback',limits:{nostudent:true}}],
 ['Introductory STEM assessment',{focus:'teaching',task:'assessment',disc:'stem',lvl:'firstyear',limits:{}}],
 ['Research literature review',{focus:'research_own',task:'litreview',depth:'litreview_phase',limits:{}}],
 ['Committee policy, no payment',{focus:'admin',task:'policy',limits:{nopaid:true}}],
 ['Humanities with no student AI operation',{focus:'teaching',disc:'humanities',limits:{noai:true}}]
];
function audit(){return {release:require('../data/release.json').release,scenarios:scenarios.map(([name,state])=>{
 const p=M.search(D.acts,state),groups=['exact','compatible','close','broader','unknown'];
 return {name,state,counts:Object.fromEntries(groups.map(k=>[k,p[k].length])),results:groups.flatMap(group=>p[group].slice(0,10).map(r=>({id:r.activity.id,title:r.activity.t,group,compatible:r.compatible,unknown:r.unknown,mismatch:r.mismatch,broadField:r.activity.disc==='interdisciplinary'})))};
})};}
module.exports={audit};
if(require.main===module){const text=JSON.stringify(audit(),null,2)+'\n';if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),text);else process.stdout.write(text);}
