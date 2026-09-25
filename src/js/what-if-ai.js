/* ════════════════════════════════════════════════════════════
   WHAT IF AI · questions → matching activities
   Matching uses the pure FINDER_MATCH rules: focus and known limits are gates.
   Exact, compatible, and close matches stay distinct; unknown requirements
   are shown separately and never counted as confirmed matches.

   Every view has an address, so the browser's Back and Forward move between
   questions and results:  (none) = first question · #q=task&a=focus:teaching
   = a question with the answers so far · #a=focus:teaching;task:design =
   results · #act=<id> opens an activity · #tour opens the walkthrough.
   Moving between views pushes a history entry; changing an answer only
   updates the current one.
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var S_ = window.SITE, D = S_.D, A = S_.A, IN = S_.IN, esc = S_.esc, icon = S_.icon;
var LIM = D.limits;
S_.init({page:'finder'});

function blank(){ return {focus:null, task:null, disc:null, lvl:null, mod:null, depth:null, limits:{}}; }
var S = blank();
var M = window.FINDER_MATCH;
var step = 0, shown = {exact:9,compatible:9,close:9,broader:6,unknown:6};
function resetShown(){ shown={exact:9,compatible:9,close:9,broader:6,unknown:6}; }
function results(){ return M.search(A,S); }
function viable(key){ return M.viable(A,S,key,IN[key]); }

/* ─────────── the questions ─────────── */
var STEPS = [
  {key:'focus', rail:'Your work', icon:'i-bulb', q:'What are you working on?',
   sub:'Describe your own work, not what an AI tool would do. Everything else follows from this.'},
  {key:'task', rail:'The task', icon:'i-gear', q:'What would you like to do?', two:true,
   sub:'Pick the closest match. You are describing a task, not choosing a technology.'},
  {key:'disc', rail:'Your field', icon:'i-cap', q:'What is your field?', two:true,
   sub:'Your field moves matching activities to the top. Activities recorded without a field still appear, because much of the pedagogy travels.'},
  {key:'depth', rail:'Scale', icon:'i-gauge', q:'How large a piece of work are you picturing?',
   sub:'Scale is described in units of academic work rather than minutes.'},
  {key:'limits', rail:'Limits', icon:'i-switch', q:'Is anything off the table?',
   sub:'Choose any that apply, or none.'}
];
var STEP_OF = {}; STEPS.forEach(function(st,i){ STEP_OF[st.key]=i; });
function opts(key){
  if(key==='task'){ var o=(D.task_labels||{})[S.focus]||{}; return IN.task.map(function(t){ return o[t[0]] ? [t[0],o[t[0]]] : t; }); }
  return IN[key];
}
function split(label){ var i=label.indexOf(' — '); return i>0 ? [label.slice(0,i), label.slice(i+3)] : [label,'']; }
/* a question with fewer than two live options is skipped: there is nothing to choose */
function isSkipped(i){
  var st=STEPS[i]; if(!st || st.key==='limits') return false;
  var can=viable(st.key);
  return opts(st.key).filter(function(o){ return can[o[0]]; }).length < 2;
}
function realSteps(){
  var out=[]; for(var i=0;i<STEPS.length;i++){ if(i===step || !isSkipped(i)) out.push(i); } return out;
}
function answerText(key){
  if(key==='limits'){ var n=Object.keys(S.limits).filter(function(k){return S.limits[k];}).length; return n ? n+' ruled out' : ''; }
  if(!S[key]) return '';
  var o=opts(key); for(var i=0;i<o.length;i++) if(o[i][0]===S[key]) return split(o[i][1])[0];
  return '';
}
function hasAnswer(){ return !!(S.focus||S.task||S.disc||S.depth||S.lvl||S.mod||Object.keys(S.limits).some(function(k){return S.limits[k];})); }
/* A changed work focus can invalidate a task. Limits never clear preferences;
   the results explain conflicts and let the reader decide what to adjust. */
var RAIL = {task:'The task', disc:'Your field', lvl:'Level', mod:'Setting', depth:'Scale'};
function prune(){
  var gone=[];
  ['task','disc','lvl','mod','depth'].forEach(function(k){
    if(S[k] && !viable(k)[S[k]]){ S[k]=null; gone.push(RAIL[k]); }
  });
  if(gone.length) S_.announce('Cleared '+gone.join(' and ')+', which no longer match'+(gone.length===1?'es':'')+' anything with your other answers.');
  return gone;
}

function drawRail(){
  var onPlan = step>=STEPS.length;
  var h = '<div class="rail__label">Your answers</div>';
  realSteps().forEach(function(i, n){
    var st=STEPS[i], ans=answerText(st.key);
    h += '<button type="button" class="railitem'+(ans?' is-done':'')+'" data-goto="'+i+'"'+(i===step&&!onPlan?' aria-current="step"':'')+'>'+
      '<span class="railitem__n" aria-hidden="true">'+(n+1)+'</span><span class="railitem__txt"><span>'+esc(st.rail)+'</span>'+
      '<span class="railitem__ans">'+(ans?esc(ans):'Not answered')+'</span></span></button>';
  });
  h += '<button type="button" class="railitem" data-goto="plan"'+(onPlan?' aria-current="step"':'')+'>'+
    '<span class="railitem__n" aria-hidden="true">✓</span><span class="railitem__txt"><span>Results</span>'+
    '<span class="railitem__ans">'+results().near+' matches to explore</span></span></button>';
  document.getElementById('rail').innerHTML = h;
}

function optionHTML(name, v, label, checked, type){
  var parts = split(label);
  return '<label class="opt'+(type==='checkbox'?' is-check':'')+'"><input type="'+(type||'radio')+'" name="'+name+'" value="'+esc(v)+'"'+(checked?' checked':'')+'>'+
    '<span class="opt__mark" aria-hidden="true"></span><span class="opt__main"><span class="opt__label">'+esc(parts[0])+'</span>'+
    (parts[1]?'<span class="opt__desc">'+esc(parts[1])+'</span>':'')+'</span></label>';
}
function group(key, legend, list, two, sr){
  var can = viable(key);
  var shown = list.filter(function(o){ return can[o[0]] || S[key]===o[0]; });
  var hidden = list.length - shown.length;
  var h = '<fieldset class="opts"><legend'+(sr?' class="sr-only"':'')+'>'+esc(legend)+'</legend><div class="optgrid'+(two?' two':'')+'">';
  h += shown.map(function(o){ return optionHTML('q-'+key, o[0], o[1], S[key]===o[0]); }).join('');
  h += '</div></fieldset>';
  if(hidden) h += '<p class="qnote">'+hidden+' option'+(hidden===1?' is':'s are')+' not represented in the current pool for your work and limits. Your other preferences affect the result groups.</p>';
  return h;
}
function drawWizard(focusTitle){
  var st = STEPS[step], real = realSteps(), at = real.indexOf(step)+1;
  var h = '<div class="panel qpanel"><div class="panel__head"><span class="lamps" aria-hidden="true"><span class="lamp lamp--on"></span><span class="lamp"></span><span class="lamp lamp--green"></span></span>'+
    '<div class="panel__icon" aria-hidden="true">'+icon(st.icon)+'</div><div>'+
    '<div class="qstep">Question '+at+' of '+real.length+'</div>'+
    '<h2 class="panel__title" id="qTitle" tabindex="-1">'+esc(st.q)+'</h2><p class="panel__sub">'+esc(st.sub)+'</p></div></div>';
  h += '<div class="panel__body">';
  if(step===0) h += '<p class="tour-cta no-print">New to What If AI? <button type="button" class="btn btn--sm" data-open-tour aria-haspopup="dialog">'+
    icon('i-manual')+' How to use What If AI</button></p>';
  h += '<div class="qbar" aria-hidden="true">'+real.map(function(i){
    return '<span class="'+(i===step?'on':(real.indexOf(i)<real.indexOf(step)?'done':''))+'"></span>'; }).join('')+'</div>';
  if(st.key==='limits'){
    h += '<fieldset class="opts"><legend class="sr-only">'+esc(st.q)+'</legend><div class="optgrid">';
    h += LIM.map(function(l){ return optionHTML('q-limits', l[0], l[1]+(l[2]?' — '+l[2]:''), !!S.limits[l[0]], 'checkbox'); }).join('');
    h += '</div></fieldset><p class="qnote">When a requirement is not established, the activity appears separately under “Check requirements before considering,” with what you need to confirm.</p>';
    h += '<p class="note noai"><strong>On the first option.</strong> Some activities are built so that no AI tool is used, and others describe a route that works without one. You can build a list entirely from those.</p>';
  } else {
    h += group(st.key, st.q, opts(st.key), st.two, true);
    if(st.key==='disc'){
      var open = S.lvl||S.mod;
      h += '<details class="qmore"'+(open?' open':'')+'><summary>Optional: level and setting</summary>'+
        '<p class="qnote">Activities without a specific level or setting remain possible fits, with a note to check suitability.</p>'+
        group('lvl','Who is in the room?', IN.lvl, true) + group('mod','Where does it happen?', IN.mod, false) + '</details>';
    }
  }
  var last = step===STEPS.length-1;
  h += '<div class="qnav">'+(at>1?'<button type="button" class="btn" id="back">← Back</button>':'')+
    '<span class="spacer"></span><button type="button" class="btn btn--quiet" id="skip">'+(st.key==='limits'?'Nothing is off the table':'Skip this question')+'</button>'+
    '<button type="button" class="btn btn--primary" id="next">'+(last?'Show activities':'Next →')+'</button></div></div></div>';
  var w = document.getElementById('wizard'); w.innerHTML = h;
  if(focusTitle){ var t=document.getElementById('qTitle'); if(t) t.focus(); }
}

/* ─────────── results ─────────── */
function answersHTML(){
  var h='<ul class="answers" aria-label="Your answers">';
  var any=false;
  STEPS.forEach(function(st,i){
    var t=answerText(st.key); if(!t) return; any=true;
    h+='<li><button type="button" class="answer" data-goto="'+i+'"><span class="k">'+esc(st.rail)+':</span> '+esc(t)+' <span class="ed">Change</span></button></li>';
  });
  ['lvl','mod'].forEach(function(k){
    if(!S[k]) return; any=true;
    h+='<li><button type="button" class="answer" data-goto="'+STEP_OF.disc+'"><span class="k">'+(k==='lvl'?'Level':'Setting')+':</span> '+
      esc(split(k==='lvl'?S_.lvlLabel(S[k]):S_.modLabel(S[k]))[0])+' <span class="ed">Change</span></button></li>';
  });
  return any ? h+'</ul>' : '<p class="qnote">No preferences selected. Explore the collection below.</p>';
}
var REQUIREMENT_LABELS={noai:'a usable route without AI',nostudent:'whether student-authored work goes into a tool',nopaid:'whether the activity can be completed without payment',noaccount:'whether personal account or phone verification is needed',nokit:'whether equipment, travel, or purchases are needed',nodisclose:'whether a formal disclosure statement is needed',noapproval:'whether ethics or institutional approval is needed'};
var PREFERENCE_LABELS={task:'task',disc:'field',depth:'scale',lvl:'level',mod:'setting'};
function preferenceLabel(k){ var v=S[k], list=opts(k); for(var i=0;i<list.length;i++) if(list[i][0]===v) return split(list[i][1])[0]; return v; }
function matchCard(row){
  var notes=[];
  if(row.unknown.length) notes.push('<strong>Check first:</strong> The record does not establish '+row.unknown.map(function(k){return esc(REQUIREMENT_LABELS[k]);}).join('; ')+'.');
  if(row.mismatch.length) notes.push('<strong>Different from your preferences:</strong> '+row.mismatch.map(function(k){return esc(PREFERENCE_LABELS[k]+' ('+preferenceLabel(k)+')');}).join('; ')+'.');
  if(row.compatible.length){
    var unspecified=row.compatible.filter(function(k){return k!=='disc';});
    notes.push('<strong>Check suitability:</strong> '+(row.compatible.indexOf('disc')>=0?'Consider how this activity fits your field. ':'')+
      (unspecified.length?'No specific '+unspecified.map(function(k){return esc(PREFERENCE_LABELS[k]);}).join(' or ')+' is recorded for this activity.':''));
  }
  var note=notes.length?'<div class="match-note">'+notes.map(function(n){return '<p>'+n+'</p>';}).join('')+'</div>':'';
  // Keep the explanation inside its activity card, before the existing controls.
  return S_.cardHTML(row.activity,{h:4}).replace('<div class="acard__foot',note+'<div class="acard__foot');
}
function band(key,title,note,list){
  if(!list.length) return '';
  var visible=list.slice(0,shown[key]);
  return '<section class="band" data-match-group="'+key+'" aria-labelledby="b-'+key+'"><h3 class="band__h" id="b-'+key+'">'+esc(title)+'</h3>'+
    '<p class="band__note">'+esc(note)+'</p><div class="cards">'+visible.map(matchCard).join('')+'</div>'+
    (list.length>visible.length?'<div class="more no-print"><button type="button" class="btn" '+(key==='exact'?'id="moreExact" ':'')+'data-more-matches="'+key+'">Show more '+(key==='unknown'?'activities to check':'matches')+' ('+(list.length-visible.length)+' more)</button></div>':'')+'</section>';
}
function recoveryHTML(){
  var h='<div class="empty"><strong>No close matches for those preferences</strong><p>Try adjusting a preference. Any broader starting points below keep your selected limits and name every preference they miss.</p><div class="ractions">';
  M.keys.forEach(function(k){
    if(!S[k]) return;
    h+='<button type="button" class="btn btn--sm" data-relax="'+k+'">Skip '+esc(PREFERENCE_LABELS[k])+': '+esc(preferenceLabel(k))+'</button>';
  });
  return h+'</div></div>';
}
function drawPlan(focusTitle){
  var p=results(), n=M.keys.filter(function(k){return S[k];}).length;
  var title=p.near?'Activities to explore':p.confirmed?'Broader starting points':p.unknown.length?'Some requirements need checking':'No activities meet these limits';
  var h='<div class="rhead"><div class="kicker">Your results</div><h2 id="rTitle" tabindex="-1">'+title+'</h2>'+answersHTML()+
    '<div class="ractions no-print"><button type="button" class="btn" id="redo">Change my answers</button>'+
    '<button type="button" class="btn" id="copylink">Copy a link to these results</button>'+
    '<button type="button" class="btn" data-open-saved aria-haspopup="dialog">View saved activities (<span data-saved-count>0</span>)</button></div></div>';
  h+='<p class="countline"><strong>'+p.exact.length+'</strong> '+(n?'exact matches':'activities to explore')+
    '; <strong>'+p.compatible.length+'</strong> possible fits to check; <strong>'+p.close.length+'</strong> close matches.'+
    (p.unknown.length?' <strong>'+p.unknown.length+'</strong> additional activities have requirements to check.':'')+'</p>';
  if(!p.confirmed){
    h+='<div class="empty"><strong>No activities have all selected limits confirmed.</strong><p>'+
      (p.unknown.length?'You can inspect the separate group below to see what needs checking. Those activities are not confirmed matches.':'The collection does not currently establish a fit for these limits. Review them if you want to change your selection.')+
      '</p><button type="button" class="btn" data-goto="'+STEP_OF.limits+'">Review the limits</button></div>';
  } else {
    h+=band('exact',n?'Matches your stated preferences':'Activities to explore','These match the recorded details'+(Object.keys(S.limits).some(function(k){return S.limits[k];})?' and have no unresolved selected limits.':'.'),p.exact);
    h+=band('compatible','Possible fits: check suitability','These have no known preference mismatch. Check the notes on each activity for details that need your judgment.',p.compatible);
    h+=band('close','Close matches: one preference to adjust','Each activity names the preference it misses. Selected limits remain in force.',p.close);
    if(!p.near){ h+=recoveryHTML();h+=band('broader','Broader starting points','These miss more than one preference. Review the differences before choosing an activity.',p.broader); }
  }
  if(p.unknown.length){
    h+='<details class="requirement-checks"><summary>Check requirements before considering ('+p.unknown.length+')</summary><div class="requirement-checks__body">'+
      band('unknown','Requirements not yet confirmed','These are outside the confirmed results. Each card names the requirement to verify and any preference differences. Known conflicts with your limits are excluded.',p.unknown)+'</div></details>';
  }
  h+='<div class="browse no-print"><p>Want to look further? <a href="register.html#activities">'+icon('i-crt')+' Browse all '+A.length+
    ' activities in The Register</a>, where you can search and filter the whole collection.</p></div>';
  document.getElementById('plan').innerHTML=h;afterDraw(focusTitle);
}
function afterDraw(focusTitle){
  if(focusTitle){ var t=document.getElementById('rTitle'); if(t) t.focus(); }
  [].forEach.call(document.querySelectorAll('#plan [data-saved-count]'),function(el){ el.textContent=S_.Saved.ids().length; });
}

/* ─────────── addresses ─────────── */
var KEYS=['focus','task','disc','depth','lvl','mod'];
function answersHash(){
  var parts=[]; KEYS.forEach(function(k){ if(S[k]) parts.push(k+':'+S[k]); });
  var l=Object.keys(S.limits).filter(function(k){return S.limits[k];});
  if(l.length) parts.push('lim:'+l.join('+'));
  return 'a='+parts.join(';');
}
function hashFor(){
  if(step>=STEPS.length) return '#'+answersHash();
  if(step===0 && !hasAnswer()) return '';
  return '#q='+STEPS[step].key+'&'+answersHash();
}
function known(k,v){ var L=IN[k]||[]; for(var i=0;i<L.length;i++) if(L[i][0]===v) return true; return false; }
/* read answers from an address into a fresh state; returns whether any were valid */
function parseAnswers(hsh, into){
  var m=/(?:^#|&)a=([^&]*)/.exec(hsh||''); if(!m) return false;
  var any=false;
  decodeURIComponent(m[1]).split(';').forEach(function(p){
    var kv=p.split(':'), k=kv[0], v=kv.slice(1).join(':');
    if(k==='lim'){ v.split('+').forEach(function(x){ if(M.limits.indexOf(x)>=0){ into.limits[x]=true; any=true; } }); }
    else if(KEYS.indexOf(k)>=0 && known(k,v)){ into[k]=v; any=true; }
  });
  return any;
}
var routed = null;                               /* the address the page currently shows */
function record(push){
  var h = hashFor(), here = location.hash || '';
  if(h === here){ routed = h; return; }
  try { history[push ? 'pushState' : 'replaceState']({wif:1}, '', h || (location.pathname + location.search)); } catch(_){}
  routed = location.hash || '';
}

/* ─────────── navigation ─────────── */
function advance(dir){
  var i = step;
  do { i += dir; } while(i >= 0 && i < STEPS.length && isSkipped(i));
  if(i >= 0) step = Math.min(i, STEPS.length);
}
function show(focus){
  var w=document.getElementById('wizard'), pl=document.getElementById('plan');
  if(step>=STEPS.length){ w.hidden=true; pl.hidden=false; drawPlan(focus); }
  else { w.hidden=false; pl.hidden=true; drawWizard(focus); }
  drawRail();
}
function go(push){
  show(true); record(push);
  var m=document.getElementById('main'); if(m && m.getBoundingClientRect().top<0) m.scrollIntoView({block:'start'});
}
function goto(target){
  step = target==='plan' ? STEPS.length : +target;
  resetShown();
  go(true);
}
document.addEventListener('change', function(e){
  var t=e.target; if(!t.name || t.name.indexOf('q-')!==0) return;
  var key=t.name.slice(2);
  if(key==='limits'){ S.limits[t.value]=t.checked; drawRail(); record(false); return; }
  S[key]=t.value;
  if(key==='focus') prune();
  /* later questions depend on this answer, so redraw them; keep focus on the option */
  var val=t.value;
  drawWizard(false); drawRail(); record(false);
  var again=document.querySelector('input[name="q-'+key+'"][value="'+val+'"]'); if(again) again.focus();
});
document.addEventListener('click', function(e){
  var t=e.target;
  if(t.closest('[data-open-tour]')){ openTour(t.closest('[data-open-tour]')); return; }
  var g=t.closest('[data-goto]'); if(g){ goto(g.getAttribute('data-goto')); return; }
  if(t.closest('#next')){ advance(1); resetShown(); go(true); return; }
  if(t.closest('#back')){ advance(-1); go(true); return; }
  if(t.closest('#skip')){
    var st=STEPS[step];
    if(st.key==='limits'){ S.limits={}; } else { S[st.key]=null; if(st.key==='disc'){ S.lvl=null; S.mod=null; } }
    advance(1); resetShown(); go(true); return;
  }
  if(t.closest('#redo')){ step=0; go(true); return; }
  var relax=t.closest('[data-relax]');
  if(relax){ S[relax.getAttribute('data-relax')]=null; resetShown(); go(true); return; }
  var more=t.closest('[data-more-matches]');
  if(more){
    var key=more.getAttribute('data-more-matches'), old=shown[key], pending=document.querySelector('.requirement-checks'), wasOpen=pending && pending.open;
    shown[key]+=9; drawPlan(false);
    var again=document.querySelector('.requirement-checks'); if(again) again.open=wasOpen;
    var cards=document.querySelectorAll('[data-match-group="'+key+'"] [data-open]');
    if(cards[old]) cards[old].focus();
    return;
  }
  if(t.closest('#copylink')){ S_.copyText(location.href.split('#')[0]+'#'+answersHash(), 'Link to these results copied.'); return; }
});

/* one router for load, Back/Forward (popstate) and typed or followed links (hashchange); it does nothing
   when the address already matches what is shown, so the two events never double-render */
function closeDialogs(except){
  ['actDialog','savedDrawer','tourDialog'].forEach(function(id){
    var d=document.getElementById(id); if(d && d.open && id!==except) S_.closeDialog(d);
  });
}
function route(first){
  var hsh = location.hash || '';
  if(hsh === routed) return;
  var m;
  if((m=/^#act=([^&]+)/.exec(hsh))){
    if(first){ show(false); }
    routed = hsh; S_.openActivity(decodeURIComponent(m[1])); return;
  }
  if(hsh === '#tour'){
    if(first){ show(false); }
    routed = hsh; openTour(null); return;
  }
  closeDialogs();
  var next = blank(), any = parseAnswers(hsh, next), q = /^#q=([a-z]+)/.exec(hsh);
  S = next; resetShown();
  if(q && STEP_OF[q[1]]!=null){ step = STEP_OF[q[1]]; if(isSkipped(step)) advance(1); }
  /* results: any valid answers, or an explicit empty answer set (#a=, "show everything"); a link whose
     answers are all unrecognized falls back to the first question */
  else step = (any || /^#a=$/.test(hsh)) ? STEPS.length : 0;
  routed = hsh;
  show(!first);
}
window.addEventListener('popstate', function(){ route(false); });
window.addEventListener('hashchange', function(){ route(false); });

/* ─────────── walkthrough (#tourDialog): optional, never opens by itself ─────────── */
var tour = document.getElementById('tourDialog');
var slides = tour ? [].slice.call(tour.querySelectorAll('[data-slide]')) : [];
var ti = 0;
function titleOf(i){ var h=slides[i].querySelector('h3'); return h ? h.textContent : ''; }
function drawTour(){
  slides.forEach(function(s,i){ s.hidden = i!==ti; });
  document.getElementById('tourPos').textContent = (ti+1)+' of '+slides.length;
  var prev=document.getElementById('tourPrev'), next=document.getElementById('tourNext');
  prev.setAttribute('aria-disabled', String(ti===0));
  next.querySelector('.tour__nextlabel').textContent = ti===slides.length-1 ? 'Finish' : 'Next';
  [].forEach.call(tour.querySelectorAll('.tour__dot'), function(d,i){
    if(i===ti) d.setAttribute('aria-current','step'); else d.removeAttribute('aria-current'); });
}
function tourTo(i){ if(i<0||i>=slides.length) return; ti=i; drawTour(); }
function openTour(opener){
  if(!tour) return;
  ti = 0; drawTour();
  S_.openDialog(tour, opener);
}
if(tour){
  tour.querySelector('.tour__dots').innerHTML = slides.map(function(s,i){
    return '<button type="button" class="tour__dot" data-dot="'+i+'" aria-label="Step '+(i+1)+': '+esc(titleOf(i))+'"><span class="lamp"></span></button>';
  }).join('');
  S_.wireDialog(tour);
  tour.addEventListener('click', function(e){
    var t=e.target;
    if(t.closest('#tourPrev')){ if(ti>0) tourTo(ti-1); return; }
    if(t.closest('#tourNext')){ if(ti<slides.length-1) tourTo(ti+1); else S_.closeDialog(tour); return; }
    var d=t.closest('[data-dot]'); if(d){ tourTo(+d.getAttribute('data-dot')); return; }
  });
  tour.addEventListener('keydown', function(e){
    var tag=(e.target.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'||tag==='select') return;
    var n=-1;
    if(e.key==='ArrowRight') n=ti+1; else if(e.key==='ArrowLeft') n=ti-1;
    else if(e.key==='Home') n=0; else if(e.key==='End') n=slides.length-1;
    if(n>=0 && n<slides.length){ e.preventDefault(); tourTo(n); }
  });
  /* a walkthrough opened from an address leaves the address clean when it closes */
  tour.addEventListener('close', function(){ if(location.hash==='#tour') record(false); });
}

/* an activity opened from an address leaves the address clean when it closes */
document.getElementById('actDialog').addEventListener('close', function(){ if(/^#act=/.test(location.hash)) record(false); });

route(true);
})();
