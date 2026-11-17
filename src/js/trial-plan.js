/* ════════════════════════════════════════════════════════════
   PLAN A SMALL TRIAL · an optional worksheet attached to a saved use-case idea
   Five questions a reader answers for themselves, in their own words, about trying one use-case
   idea in their own situation. The Library supplies the questions and, beside them, what the
   record already says (including its route without AI, for comparison); it suggests no answers.

   A plan belongs to a saved use-case idea and is kept the way the saved list is: in this
   browser only (localStorage), never sent anywhere. Removing the idea removes its plan. Plans
   travel with a downloaded list, print after their idea, and are added to its text or Word export.
   Loaded after src/js/saved-tools.js, which it extends through window.SITE_TOOLS.
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var S_ = window.SITE, T = window.SITE_TOOLS, D = S_.D, L = S_.L, esc = S_.esc, num = S_.num, Saved = S_.Saved;
if(!T) return;
var KEY = 'lul-whatifai-plans-v1', MAXLEN = 4000;
var QUESTIONS = [
  'What am I trying to improve?',
  'What will I try, and what remains my responsibility?',
  'What preparation and checking will this require?',
  'What would indicate that it helped?',
  'When would I revise or abandon the approach?'
];

/* ─────────── storage: {id: {answers: [five strings], updated: ISO date}} ─────────── */
var mem = null, storageOK = true;
function clean(plan){
  if(!plan || !Array.isArray(plan.answers)) return null;
  var answers = QUESTIONS.map(function(_, i){ return typeof plan.answers[i]==='string' ? plan.answers[i].slice(0, MAXLEN) : ''; });
  return answers.some(function(t){ return t.trim(); }) ? {answers: answers, updated: typeof plan.updated==='string' ? plan.updated : ''} : null;
}
function read(){
  if(mem) return mem;
  mem = {};
  try {
    var v = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    if(v && typeof v==='object' && !Array.isArray(v)) Object.keys(v).forEach(function(id){ var p = clean(v[id]); if(p) mem[id] = p; });
  } catch(_){ storageOK = false; }
  return mem;
}
function write(){
  try { var value = JSON.stringify(mem); if(value==='{}') window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, value); storageOK = true; }
  catch(_){ storageOK = false; }
  return storageOK;
}
function planOf(id){ return read()[id] || null; }
function setPlan(id, answers){
  var p = clean({answers: answers, updated: new Date().toISOString()});
  if(p) read()[id] = p; else delete read()[id];
  return write();
}
/* a plan belongs to a saved idea: when an idea leaves the list, here or in another tab, its plan goes too */
function prune(ids){
  var all = read(), gone = Object.keys(all).filter(function(id){ return ids.indexOf(id) < 0; });
  if(!gone.length) return;
  gone.forEach(function(id){ delete all[id]; }); write();
}
Saved.onChange(function(ids){ prune(ids); });
window.addEventListener('storage', function(e){ if(e.key === KEY) mem = null; });

/* ─────────── what the record already says, beside the questions ─────────── */
function recordHTML(a){
  var policy = (D.pol||{})[a.pol], rows = [];
  var noTool = a.op==='none' || (!a.op && (a.cap||[]).indexOf('none_required')>=0);
  function row(label, text){ if(text) rows.push('<dt>'+esc(label)+'</dt><dd>'+esc(text)+'</dd>'); }
  row('What is produced', a.dl);
  row(a.ac==='student' ? (a.ar==='withheld' ? 'What students produce' : 'What students produce that the tool did not') : 'The judgment that stays with you', a.gate);
  row('What the output is checked against', a.chk);
  row('Cost and access', a.eq && a.eq!=='not_specified' ? S_.costLabel(a) : '');
  row('Also required', L.pc[a.pc] || '');
  row('Data', S_.sensitive(a) ? 'Involves putting '+L.sen[a.sen]+' into '+S_.dataTool(a)+'.' : '');
  row('Course AI policy it assumes', policy ? policy.pill+' — '+policy.label : '');
  row('A route without AI, for comparison', typeof a.na==='string' && a.na.trim() ? a.na : noTool ? 'This use-case idea runs without any AI tool.' :
    a.op==='optional' ? 'The use-case idea as described is complete without an AI tool; the AI step it mentions is optional.' : 'The record describes no route without AI.');
  return '<details class="plan__record"><summary>What this use-case idea’s record says</summary><dl class="facts">'+rows.join('')+'</dl>'+
    '<p class="meta-line">Quoted from the record for reference. <a href="#" data-open="'+esc(a.id)+'">View the full details</a>.</p></details>';
}
function answered(plan){ return plan ? plan.answers.filter(function(t){ return t.trim(); }).length : 0; }
function when(plan){
  if(!plan || !plan.updated) return '';
  var d = new Date(plan.updated); if(isNaN(d)) return '';
  return d.toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
}
function statusText(id){
  var plan = planOf(id);
  if(!storageOK) return 'Browser storage is unavailable, so this plan is not being kept. Print it or copy your answers before you leave the page.';
  if(!plan) return 'Nothing written yet. Whatever you write is kept in this browser only and is not sent anywhere.';
  return 'Kept in this browser only'+(when(plan) ? ' (last changed '+when(plan)+')' : '')+'. Not sent anywhere.';
}

/* ─────────── the worksheet ─────────── */
var openId = null, timer = null;
function openPlan(id, opener){
  var a = T.act(id); if(!a) return;
  var dlg = document.getElementById('planDialog'); if(!dlg) return;
  var note = '';
  if(!Saved.has(a.id)){ Saved.add(a.id); note = '<p class="note">This use-case idea was added to your saved list, because a plan is kept with a saved use-case idea.</p>'; }
  openId = a.id;
  var plan = planOf(a.id);
  var h = '<p class="plan__for">For <strong>'+esc(a.t)+'</strong></p>'+note+
    '<p class="plan__intro">An optional worksheet for thinking through a small trial of this use-case idea in your own situation. Answer any of the questions, in any order, or none. '+
    'Your answers are saved as you type.</p>'+recordHTML(a)+'<form class="plan__form" id="planForm" novalidate>';
  QUESTIONS.forEach(function(q, i){
    h += '<div class="plan__q"><label for="plan-q'+i+'"><span class="plan__n" aria-hidden="true">'+(i+1)+'</span> '+esc(q)+'</label>'+
      '<textarea id="plan-q'+i+'" name="q'+i+'" rows="4" maxlength="'+MAXLEN+'" data-plan-answer="'+i+'">'+esc(plan ? plan.answers[i] : '')+'</textarea></div>';
  });
  h += '</form><p class="plan__status" id="planStatus">'+esc(statusText(a.id))+'</p>'+
    '<div class="confirm" id="planConfirm" hidden><p>Clear everything written in this plan?</p>'+
    '<button type="button" class="btn btn--sm" id="planClearYes">Clear it</button> <button type="button" class="btn btn--sm btn--quiet" id="planClearNo">Keep it</button></div>';
  document.getElementById('planBody').innerHTML = h;
  dlg.setAttribute('data-act', a.id);
  S_.openDialog(dlg, opener);
}
function answersNow(){
  return QUESTIONS.map(function(_, i){ var t = document.getElementById('plan-q'+i); return t ? t.value : ''; });
}
function save(){
  clearTimeout(timer); timer = null;
  if(!openId || !document.getElementById('plan-q0')) return;
  setPlan(openId, answersNow());
  var box = document.getElementById('planStatus'); if(box) box.textContent = statusText(openId);
  refreshMarks();
}
/* the saved drawer and an open idea show whether a plan exists */
function label(id){ var n = answered(planOf(id)); return n ? 'Edit trial plan' : 'Plan a small trial'; }
function refreshMarks(){
  [].forEach.call(document.querySelectorAll('[data-plan]'), function(b){
    var id = b.getAttribute('data-plan'), t = b.querySelector('.plan-btn__t'); if(t) t.textContent = label(id);
  });
}
function itemActionsHTML(a){
  return '<button type="button" class="btn btn--sm" data-plan="'+esc(a.id)+'"><span class="plan-btn__t">'+label(a.id)+'</span><span class="sr-only"> for '+esc(a.t)+'</span></button>';
}
function ctaHTML(a){
  return '<section class="trialcta no-print" aria-labelledby="trialTitle"><h3 id="trialTitle">Plan a small trial</h3>'+
    '<p>An optional worksheet: five questions to answer for yourself about trying this use-case idea in your own situation, with what the record says, including its route without AI, alongside for comparison. '+
    'A plan is kept with a saved use-case idea, in this browser only.</p>'+
    '<button type="button" class="btn btn--sm" data-plan="'+esc(a.id)+'"><span class="plan-btn__t">'+label(a.id)+'</span></button></section>';
}

/* ─────────── a plan on paper, in a downloaded list, and in an export ─────────── */
function planHTML(a, heading){
  var plan = planOf(a.id); if(!answered(plan)) return '';
  return '<section class="pr-plan"><h3>'+(heading || 'Your plan for a small trial')+'</h3>'+
    (when(plan) ? '<p class="meta-line">Your own notes, last changed '+esc(when(plan))+'. Not part of the use-case idea’s record.</p>' : '')+
    QUESTIONS.map(function(q, i){ return plan.answers[i].trim() ? '<h4>'+esc(q)+'</h4>'+plan.answers[i].trim().split(/\n+/).map(function(t){ return '<p>'+esc(t)+'</p>'; }).join('') : ''; }).join('')+'</section>';
}
function planBlocks(a){
  var plan = planOf(a.id); if(!answered(plan)) return [];
  var out = [{k:'h2', t:'Your plan for a small trial'}, {k:'small', t:'Your own notes'+(when(plan) ? ', last changed '+when(plan) : '')+'. Not part of the use-case idea’s record.'}];
  QUESTIONS.forEach(function(q, i){
    if(!plan.answers[i].trim()) return;
    out.push({k:'h3', t:q});
    plan.answers[i].trim().split(/\n+/).forEach(function(t){ out.push({k:'p', t:t.replace(/\s+/g, ' ').trim()}); });
  });
  return out;
}
function printPlan(){
  save();
  var a = T.act(openId); if(!a) return;
  var today = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
  var plan = planHTML(a, 'Your answers') || '<section class="pr-plan"><h3>Your answers</h3>'+QUESTIONS.map(function(q){ return '<h4>'+esc(q)+'</h4><p class="pr-blank">&nbsp;</p>'; }).join('')+'</section>';
  S_.printHTML('<h1>Plan for a small trial</h1><div class="pr-sub">'+esc(a.t)+' · '+S_.toolName()+' · Lewis University Library · printed '+esc(today)+'</div>'+
    plan+'<article><div class="kicker">The use-case idea</div><h2>'+esc(a.t)+'</h2>'+S_.detailHTML(a, {print:true, brief:true})+'</article>'+S_.printFooterHTML());
}
function fileExtra(){
  var all = read(), ids = Saved.ids(), out = {};
  Object.keys(all).forEach(function(id){ if(ids.indexOf(id) >= 0) out[id] = all[id]; });
  return Object.keys(out).length ? {plans: out} : null;
}
/* a plan in the file fills only the questions left empty here, so nothing written in this browser is overwritten */
function fileRestore(data){
  var plans = data && data.plans; if(!plans || typeof plans!=='object' || Array.isArray(plans)) return '';
  var added = 0, kept = 0;
  Object.keys(plans).slice(0, 2000).forEach(function(key){
    var a = T.act(key), incoming = clean(plans[key]); if(!a || !incoming || !Saved.has(a.id)) return;
    var mine = planOf(a.id), answers = QUESTIONS.map(function(_, i){ return mine && mine.answers[i].trim() ? mine.answers[i] : incoming.answers[i]; });
    if(mine && QUESTIONS.some(function(_, i){ return mine.answers[i].trim() && incoming.answers[i].trim() && mine.answers[i] !== incoming.answers[i]; })) kept++;
    if(!mine || answers.join('\u0000') !== mine.answers.join('\u0000')){ read()[a.id] = {answers: answers, updated: mine ? new Date().toISOString() : incoming.updated}; added++; }
  });
  if(added) write();
  return (added ? num(added)+' trial plan'+(added===1?' was':'s were')+' restored. ' : '')+
    (kept ? 'Where '+(kept===1?'a plan':'plans')+' in this browser already had an answer, that answer was kept.' : '');
}

/* ─────────── wiring ─────────── */
var baseInit = T.init, baseClick = T.click, baseExport = T.exportHTML;
T.init = function(){
  baseInit();
  var dlg = document.getElementById('planDialog'); if(!dlg) return;
  S_.wireDialog(dlg);
  dlg.addEventListener('close', save);
  prune(Saved.ids());
  document.addEventListener('input', function(e){
    if(!e.target || !e.target.matches || !e.target.matches('textarea[data-plan-answer]')) return;
    clearTimeout(timer); timer = setTimeout(save, 400);
  });
  /* answers typed just before leaving the page are still kept */
  window.addEventListener('pagehide', function(){ if(timer) save(); });
};
T.click = function(e){
  var t = e.target, b;
  if((b = t.closest('[data-plan]'))){ openPlan(b.getAttribute('data-plan'), b); return true; }
  if(t.closest('#printPlan')){ printPlan(); return true; }
  if(t.closest('#clearPlan')){ var c = document.getElementById('planConfirm'); if(c){ c.hidden = false; document.getElementById('planClearYes').focus(); } return true; }
  if(t.closest('#planClearNo')){ document.getElementById('planConfirm').hidden = true; document.getElementById('clearPlan').focus(); return true; }
  if(t.closest('#planClearYes')){
    QUESTIONS.forEach(function(_, i){ var el = document.getElementById('plan-q'+i); if(el) el.value = ''; });
    save(); document.getElementById('planConfirm').hidden = true; S_.announce('This trial plan was cleared.'); document.getElementById('plan-q0').focus(); return true;
  }
  /* removing a saved idea removes its plan: ask first when there is something written */
  if((b = t.closest('[data-unsave]')) && answered(planOf(b.getAttribute('data-unsave'))) && !b.hasAttribute('data-unsave-sure')){
    var item = b.closest('.saved-item'), id = b.getAttribute('data-unsave');
    if(item && !item.querySelector('.confirm')){
      var box = document.createElement('div'); box.className = 'confirm';
      box.innerHTML = '<p>Remove this use-case idea and the trial plan written for it?</p>'+
        '<button type="button" class="btn btn--sm" data-unsave="'+esc(id)+'" data-unsave-sure>Remove both</button> <button type="button" class="btn btn--sm btn--quiet" data-unsave-keep>Keep them</button>';
      item.appendChild(box); box.querySelector('button').focus();
    }
    return true;
  }
  if((b = t.closest('[data-unsave-keep]'))){ var it = b.closest('.saved-item'), box2 = b.closest('.confirm'); if(box2) box2.parentNode.removeChild(box2); var back = it && it.querySelector('[data-unsave]'); if(back) back.focus(); return true; }
  return baseClick(e);
};
T.exportHTML = function(a){ return baseExport(a) + ctaHTML(a); };
T.itemActionsHTML = itemActionsHTML;
T.clearNote = function(){ var n = Object.keys(read()).length; return n ? ' '+(n===1 ? 'The trial plan written for one of them is' : 'The '+num(n)+' trial plans written for them are')+' removed too.' : ''; };
T.printExtra = function(a){ return planHTML(a); };
T.planBlocks = planBlocks;
T.fileExtra = fileExtra;
T.fileRestore = fileRestore;
T.plans = {of: planOf, questions: QUESTIONS};
})();
