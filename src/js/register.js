/* ════════════════════════════════════════════════════════════
   THE REGISTER · the published collection
   Sections: activities (search + filters), types of AI systems, course AI
   policies, sources, how to use. Routing is by hash so every view has an
   address: #activities, #ai-types, #policies, #sources, #about,
   #act=<id> (opens an activity), #src=<id> (a source),
   #activities?cap=text_chat&pol=open (a filtered list).
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
document.documentElement.classList.add('js');
var S_ = window.SITE, D = S_.D, A = S_.A, IN = S_.IN, L = S_.L, esc = S_.esc, icon = S_.icon;
var R = window.SITE_DATA.register;   /* fetched by boot.js from data/register.<hash>.json */
/* History: an activity opened from the page gets its own history entry (#act=…), so Back closes it and
   the address it came from, filters included, comes back; one opened from inside another replaces it. */
var actPushed = false;
S_.init({page:'register', onOpen:function(id, wasOpen, byUser){
  var h = '#act='+encodeURIComponent(id);
  if(location.hash === h) return;
  try {
    if(byUser && !wasOpen){ history.pushState({reg:1}, '', h); actPushed = true; }
    else history.replaceState({reg:1}, '', h);
  } catch(_){}
  routed = location.hash;
}});

var SECTIONS = ['activities','ai-types','policies','sources','about'];
var TITLES = {activities:'Activities', 'ai-types':'Types of AI systems', policies:'Course AI policies', sources:'Sources', about:'How to use'};
/* addresses from earlier editions land somewhere sensible rather than nowhere */
var OLD = {platforms:'ai-types', tools:'ai-types', spectrum:'policies', provenance:'sources', biblio:'sources',
           method:'about', held:'about', crosswalk:'about', collection:'activities'};
var current = 'activities';
var routed = null;          /* the address the page currently shows */
var base = '#activities';   /* the address of the view under an open activity */

[].forEach.call(document.querySelectorAll('[data-count]'), function(el){
  var k = el.getAttribute('data-count'); el.textContent = (R.counts[k]||0).toLocaleString('en-US');
});

/* ═════════════ activities ═════════════ */
var F = {q:'', focus:'', task:'', theme:'', disc:'', cap:'', pol:'', role:'', move:'', cost:false, noai:false, nostudent:false, type:'', sort:'az'};
var PAGE = 24, shown = PAGE;
var TYPE_IDS = {};
R.types.types.forEach(function(t){ if(t.ids && t.ids.length) TYPE_IDS[t.key] = {name:t.name, ids:t.ids}; });

function opt(v, label, sel){ return '<option value="'+esc(v)+'"'+(sel===v?' selected':'')+'>'+esc(label)+'</option>'; }
function selectField(id, label, key, options){
  return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><select class="select" id="'+id+'" data-f="'+key+'">'+
    opt('', 'Any', F[key]) + options.map(function(o){ return opt(o[0], o[1], F[key]); }).join('') + '</select></div>';
}
function counted(list, key){
  var c = {}; A.forEach(function(a){ var v = a[key]; (Array.isArray(v)?v:[v]).forEach(function(x){ if(x) c[x]=(c[x]||0)+1; }); });
  return list.filter(function(o){ return c[o[0]]; }).map(function(o){ return [o[0], o[1]+' ('+c[o[0]]+')']; });
}
function filtersHTML(){
  var focus = [['teaching',L.focus.teaching],['research_own',L.focus.research_own],['admin',L.focus.admin]];
  var themes = (D.families||[]).map(function(f){ return [f[0], f[0]]; });
  var caps = Object.keys(L.cap).map(function(k){ return [k, L.cap[k]]; });
  var pols = Object.keys(D.pol||{}).map(function(k){ return [k, D.pol[k].pill+' — '+D.pol[k].label]; });
  var roles = Object.keys(L.role).map(function(k){ return [k, L.role[k]]; });
  var moves = Object.keys(L.move).map(function(k){ return [k, L.move[k]]; });
  var h = '<h3 id="filtersTitle">Filter activities</h3>';
  h += selectField('f-focus','Area of work','focus', counted(focus,'focus'));
  h += selectField('f-task','Task','task', counted(IN.task,'task'));
  h += selectField('f-theme','Theme','theme', counted(themes,'f'));
  h += selectField('f-disc','Discipline','disc', counted(IN.disc,'disc'));
  h += selectField('f-cap','Kind of AI tool','cap', counted(caps,'cap'));
  h += selectField('f-pol','Course AI policy it assumes','pol', counted(pols,'pol'));
  h += '<fieldset class="field field--bare"><legend class="label">Requirements</legend>'+
    '<label class="check"><input type="checkbox" data-fc="cost"'+(F.cost?' checked':'')+'> No cost to participants</label>'+
    '<label class="check"><input type="checkbox" data-fc="noai"'+(F.noai?' checked':'')+'> Works without AI</label>'+
    '<label class="check"><input type="checkbox" data-fc="nostudent"'+(F.nostudent?' checked':'')+'> Keeps student work out of AI tools</label></fieldset>';
  h += '<details'+((F.role||F.move)?' open':'')+'><summary>How the AI and people divide the work</summary>'+
    selectField('f-role','What the AI does','role', counted(roles,'ar'))+
    selectField('f-move','What people do','move', counted(moves,'hm'))+'</details>';
  h += '<button type="button" class="btn btn--sm" id="resetFilters">Clear all filters</button>';
  return h;
}
function matches(a){
  if(F.focus && a.focus!==F.focus) return false;
  if(F.task && a.task.indexOf(F.task)<0) return false;
  if(F.theme && a.f!==F.theme) return false;
  if(F.disc && a.disc!==F.disc) return false;
  if(F.cap && a.cap.indexOf(F.cap)<0) return false;
  if(F.pol && a.pol!==F.pol) return false;
  if(F.role && a.ar!==F.role) return false;
  if(F.move && a.hm!==F.move) return false;
  if(F.cost && ['no_tool_needed','free_tier','institution_provided'].indexOf(a.eq)<0) return false;
  if(F.noai && !(a.cap.indexOf('none_required')>=0 || a.na)) return false;
  if(F.nostudent && ['none','student_derived_deidentified','research_participant_deidentified'].indexOf(a.sen)<0) return false;
  if(F.type && TYPE_IDS[F.type] && TYPE_IDS[F.type].ids.indexOf(a.id)<0) return false;
  if(F.q){
    var hay = (a.t+' '+a.sum+' '+(a.cit||'')+' '+(a.cr||'')+' '+(a.fld||'')+' '+(a.f||'')+' '+a.id+' '+(a.al||[]).join(' ')).toLowerCase();
    var words = F.q.toLowerCase().split(/\s+/).filter(Boolean);
    for(var i=0;i<words.length;i++) if(hay.indexOf(words[i])<0) return false;
  }
  return true;
}
function filtered(){
  var list = A.filter(matches);
  if(F.sort==='theme') list.sort(function(x,y){ return S_.kickerOf(x).localeCompare(S_.kickerOf(y)) || x.t.localeCompare(y.t); });
  else list.sort(function(x,y){ return x.t.localeCompare(y.t); });
  return list;
}
function chipLabel(k){
  var v = F[k];
  switch(k){
    case 'q': return 'Search: “'+v+'”';
    case 'focus': return L.focus[v];
    case 'task': return S_.taskLabel(v);
    case 'theme': return v;
    case 'disc': return S_.discLabel(v);
    case 'cap': return L.cap[v];
    case 'pol': return (D.pol[v]||{}).pill;
    case 'role': return L.role[v];
    case 'move': return L.move[v];
    case 'cost': return 'No cost to participants';
    case 'noai': return 'Works without AI';
    case 'nostudent': return 'Keeps student work out of AI tools';
    case 'type': return (TYPE_IDS[v]||{}).name;
  }
  return v;
}
function worksMatching(q){
  if(!q) return [];
  var words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return R.works.filter(function(w){
    var hay = (w.cit+' '+w.t+' '+w.a+' '+w.y+' '+w.id).toLowerCase();
    return words.every(function(x){ return hay.indexOf(x)>=0; });
  });
}
function resultsHTML(){
  var list = filtered();
  var keys = ['q','focus','task','theme','disc','cap','pol','role','move','cost','noai','nostudent','type'].filter(function(k){ return F[k]; });
  var h = '';
  if(keys.length) h += '<ul class="activechips" aria-label="Active filters">'+keys.map(function(k){
    return '<li><button type="button" class="fchip" data-clear="'+k+'">'+esc(chipLabel(k))+' <span class="x" aria-hidden="true">✕</span><span class="sr-only"> — remove this filter</span></button></li>'; }).join('')+'</ul>';
  var ws = worksMatching(F.q);
  h += '<p class="countline" id="actCount">Showing <strong>'+Math.min(shown, list.length)+'</strong> of <strong>'+list.length+'</strong> '+
    (list.length===1?'activity':'activities')+(keys.length?' matching your filters':'')+'.'+
    (ws.length ? ' <a href="#sources" data-goto-sources>'+ws.length+' source'+(ws.length===1?' also matches':'s also match')+' your search</a>.' : '')+'</p>';
  if(!list.length){
    return h + '<div class="empty"><strong>No activities match these filters</strong><p>Try removing a filter, or use What If AI to describe what you are working on.</p>'+
      '<button type="button" class="btn" id="resetFilters2">Clear all filters</button></div>';
  }
  h += '<div class="cards">'+list.slice(0, shown).map(function(a){ return S_.cardHTML(a,{h:3}); }).join('')+'</div>';
  if(list.length > shown) h += '<div class="more"><button type="button" class="btn" id="moreActs">Show '+Math.min(PAGE, list.length-shown)+' more</button></div>';
  return h;
}
function drawActivities(){
  var sec = document.getElementById('activities');
  sec.innerHTML = '<div class="sec-head"><div class="sec-eyebrow">The collection</div><h2 id="h-activities" tabindex="-1">Activities</h2>'+
    '<p>All '+A.length+' activities in the collection. Each one lists its source, license and what to consider before using it. '+
    'Filter by the kind of work, the kind of AI tool, or the course AI policy an activity assumes; open any activity for the full description, or save it to print later.</p></div>'+
    '<div class="catalog"><div><button type="button" class="btn btn--sm filters-toggle" id="filtersToggle" aria-expanded="false" aria-controls="filters">Show filters</button>'+
    '<aside class="filters is-collapsed" aria-labelledby="filtersTitle" id="filters">'+filtersHTML()+'</aside></div>'+
    '<div><div class="toolbar"><div class="field"><label for="f-sort">Sort by</label><select class="select" id="f-sort" data-f="sort">'+
      opt('az','Title (A–Z)',F.sort)+opt('theme','Theme',F.sort)+'</select></div>'+
      '<a class="btn btn--sm" href="what-if-ai.html">'+icon('i-bulb')+' Not sure where to start? Try What If AI</a></div>'+
    '<div id="actResults" aria-live="off">'+resultsHTML()+'</div></div></div>';
}
var countTimer = null;
/* the filtered list's own address: #activities?cap=text_chat&pol=open */
function filterHash(){
  var q = [];
  Object.keys(F).forEach(function(k){
    var v = F[k];
    if(k==='sort' ? v!=='az' : (typeof v==='boolean' ? v : !!v)) q.push(encodeURIComponent(k)+'='+(typeof v==='boolean' ? '1' : encodeURIComponent(v)));
  });
  return '#activities' + (q.length ? '?'+q.join('&') : '');
}
function recordFilters(){
  var h = filterHash(); base = h;
  if(current!=='activities' || /^#act=/.test(location.hash) || location.hash===h) { routed = location.hash; return; }
  try { history.replaceState({reg:1}, '', h); } catch(_){}
  routed = location.hash;
}
function refreshResults(announceIt){
  document.getElementById('actResults').innerHTML = resultsHTML();
  recordFilters();
  if(announceIt){
    clearTimeout(countTimer);
    countTimer = setTimeout(function(){ var c=document.getElementById('actCount'); if(c) S_.announce(c.textContent); }, 350);
  }
}
function syncFilterControls(){
  [].forEach.call(document.querySelectorAll('#activities [data-f]'), function(s){ s.value = F[s.getAttribute('data-f')]; });
  [].forEach.call(document.querySelectorAll('#activities [data-fc]'), function(c){ c.checked = !!F[c.getAttribute('data-fc')]; });
  var gq = document.getElementById('gq'); if(gq && gq.value !== F.q) gq.value = F.q;
}
function resetF(){ var s = F.sort; F = {q:'', focus:'', task:'', theme:'', disc:'', cap:'', pol:'', role:'', move:'', cost:false, noai:false, nostudent:false, type:'', sort:s}; }

/* ═════════════ types of AI systems ═════════════ */
/* Compact type cards share one modal; the page grid stays in place. */
var TYPE_PREVIEWS = {
  conversational:'Text conversations for drafting, explaining, and exploring ideas.',
  grounded:'Questions and answers grounded in documents you supply.',
  search:'Web and scholarly search with synthesized, source-linked answers.',
  multimodal:'Systems that interpret photos, charts, scans, and other visual inputs.',
  image:'New images and visual variations from prompts or reference images.',
  video:'Generated video clips, animated scenes, and synthetic presenters.',
  audio:'Transcription, spoken narration, synthetic voices, and music.',
  code:'Help writing code, analyzing datasets, and producing charts.',
  agentic:'Multi-step tasks that connect tools, files, and applications.',
  institutional:'AI accessed through an institution or hosted on controlled infrastructure.',
  discipline:'Specialized models for research, prediction, and domain-specific analysis.',
  noai:'Activities for examining or discussing AI without using an AI tool.'
};
var typeDialog = document.getElementById('aiTypeDialog');
var typeReturn = null;
var typeNavigating = false;
S_.wireDialog(typeDialog);
typeDialog.addEventListener('keydown', function(e){
  if(e.key!=='Tab') return;
  var stops = [].filter.call(typeDialog.querySelectorAll('button:not([disabled]), a[href], summary, [tabindex="0"]'), function(n){return n.getClientRects().length>0;});
  var first = stops[0], last = stops[stops.length-1];
  if(e.shiftKey && (document.activeElement===first || document.activeElement.hasAttribute('data-dlg-title'))){e.preventDefault();last.focus();}
  else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
});
typeDialog.addEventListener('close', function(){
  document.documentElement.classList.remove('type-dialog-open');
  if(typeReturn && !typeNavigating){
    window.scrollTo({left:typeReturn.x,top:typeReturn.y,behavior:'instant'});
  }
  typeReturn = null;
  typeNavigating = false;
});

function typeActivityLink(t){
  if(t.key==='noai') return '<a class="btn btn--sm" data-type-activities href="#activities?noai=1">See activities that work without AI</a>';
  if(t.ids && t.ids.length) return '<a class="btn btn--sm" data-type-activities href="#activities?type='+t.key+'">See '+t.n+' related activit'+(t.n===1?'y':'ies')+'</a>';
  if(t.caps && t.caps.length && t.n) return '<a class="btn btn--sm" data-type-activities href="#activities?cap='+t.caps[0]+'">See '+t.n+' related activit'+(t.n===1?'y':'ies')+'</a>';
  return '';
}
function typeExampleDisclosure(t){
  var examples = window.REGISTER_TYPE_EXAMPLES;
  var items = examples.types[t.key] || [];
  if(!items.length) return '';
  var arrow = '<svg class="type-example__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<details class="type-example-disclosure"><summary><span class="lamp" aria-hidden="true"></span><span class="type-example-disclosure__title">Current examples</span><span class="type-example-disclosure__count">'+items.length+' tools</span>'+icon('i-chevron')+'</summary>'+
    '<div class="type-example-disclosure__content"><p class="type-example-disclosure__note">Examples may span several types. Inclusion does not indicate Lewis access or approval.</p><ul>'+items.map(function(x){
      return '<li><a class="type-example" href="'+esc(x[2])+'" target="_blank" rel="noopener noreferrer"><span class="type-example__name">'+esc(x[0])+'</span><span class="type-example__desc">'+esc(x[1])+'</span>'+arrow+'<span class="sr-only"> (opens in a new tab)</span></a></li>';
    }).join('')+'</ul><p class="type-example-disclosure__date">Official sources · Examples checked <time datetime="'+esc(examples.checked)+'">'+esc(examples.checkedLabel)+'</time></p></div></details>';
}
function openType(key, opener){
  var t = R.types.types.filter(function(x){return x.key===key;})[0];
  if(key==='noai') t = {key:'noai',name:R.types.no_ai.name,icon:'i-robot-off',what:R.types.no_ai.text};
  if(!t) return;
  typeReturn = {x:window.scrollX,y:window.scrollY};
  typeNavigating = false;
  document.documentElement.classList.add('type-dialog-open');
  typeDialog.setAttribute('data-type', key);
  typeDialog.querySelector('[data-type-icon]').innerHTML = icon(t.icon);
  typeDialog.querySelector('[data-dlg-title]').textContent = t.name;
  var h = '<p class="type-dialog__description">'+esc(t.what)+'</p>';
  if(key!=='noai'){
    h += '<section class="type-info" aria-labelledby="typeMoreHeading"><h3 id="typeMoreHeading">More about this type</h3><dl>'+
      [['What it does',t.does],['Inputs and outputs',t.io],['Where faculty encounter it',t.why],['Limitations and considerations',t.limits]].map(function(row){
        return '<div class="type-info__row"><dt>'+esc(row[0])+'</dt><dd>'+esc(row[1])+'</dd></div>';
      }).join('')+'</dl></section>'+typeExampleDisclosure(t);
  }
  typeDialog.querySelector('.dlg__body').innerHTML = h;
  typeDialog.querySelector('.dlg__foot').innerHTML = typeActivityLink(t)+'<button type="button" class="btn btn--sm btn--quiet" data-close>Back to types</button>';
  S_.openDialog(typeDialog, opener);
  typeDialog.querySelector('.dlg__body').scrollTop = 0;
}
document.addEventListener('click', function(e){
  var opener = e.target.closest('[data-open-type]');
  if(opener){ openType(opener.getAttribute('data-open-type'),opener); return; }
  if(e.target.closest('[data-type-activities]')){
    typeNavigating = true;
    S_.closeDialog(typeDialog);
  }
});

function typeCard(t){
  return '<article class="type type--compact" aria-labelledby="ty-'+t.key+'"><div class="type__head"><div class="type__icon" aria-hidden="true">'+icon(t.icon)+'</div>'+
    '<h3 id="ty-'+t.key+'"><button type="button" class="type-launch" data-open-type="'+t.key+'" aria-haspopup="dialog" aria-controls="aiTypeDialog" aria-describedby="ty-desc-'+t.key+'">'+esc(t.name)+'</button></h3></div>'+
    '<p id="ty-desc-'+t.key+'" class="type-preview">'+esc(TYPE_PREVIEWS[t.key] || t.what || '')+'</p><div class="type-launch-hint" aria-hidden="true">Explore this type <span>↗</span></div></article>';
}
function drawTypes(){
  var T = R.types;
  var h = '<div class="sec-head"><div class="sec-eyebrow">Platform-neutral</div><h2 id="h-ai-types" tabindex="-1">Types of AI systems</h2>'+
    T.intro.map(function(p){ return '<p>'+esc(p)+'</p>'; }).join('')+'</div>';
  h += '<p class="type-grid-guide">Choose a type to see what it does, where faculty encounter it, and current examples.</p>';
  h += '<div class="types types--compact">'+T.types.map(typeCard).join('');
  h += typeCard({key:'noai',name:T.no_ai.name,icon:'i-robot-off'});
  h += '</div>';
  h += '<section class="protocols" aria-labelledby="h-protocols"><span class="current current--console" aria-hidden="true"></span>'+
    '<div class="protocols__head">'+icon('i-bolt')+'<h3 id="h-protocols">Whatever the tool</h3><span class="protocols__tag">Applies to every type</span></div>'+
    '<div class="protocols__screen"><ul class="protocols__list">'+
    T.general.map(function(g){ return '<li><span class="lamp lamp--on" aria-hidden="true"></span><span>'+esc(g)+'</span></li>'; }).join('')+'</ul></div></section>';
  document.getElementById('ai-types').innerHTML = h;
}


/* ═════════════ course AI policies ═════════════ */
var polSel = null;
function drawPolicies(){
  var P = R.policy, tiers = P.tiers;
  if(!polSel) polSel = tiers[0].key;
  var h = '<div class="sec-head"><div class="sec-eyebrow">Syllabus policy spectrum</div><h2 id="h-policies" tabindex="-1">Course AI policies</h2>'+
    '<p>Published course policies on generative AI tend to cluster around four positions, from keeping AI out of submitted work to welcoming it with citation. '+
    'The examples below are openly licensed statements from real syllabi. They are starting points for your own language, not recommendations, and not a substitute for your program’s or institution’s policy.</p>'+
    '<p>The positions are not a ranking. Many courses combine them — permitting AI for some assignments and not others — and the right fit depends on your discipline, your students and what each assignment is for.</p></div>';
  h += '<div class="spectrum"><div class="spectrum__ends" aria-hidden="true"><span>← Keeps AI out of submitted work</span><span>Welcomes AI with citation →</span></div>'+
    '<ul class="spectrum__track" role="tablist" aria-label="Policy positions, from most restrictive to most open">';
  tiers.forEach(function(t, i){
    var on = t.key===polSel;
    h += '<li role="presentation"><button type="button" class="pos" role="tab" id="pt-'+t.key+'" aria-controls="pp" aria-selected="'+on+'" tabindex="'+(on?0:-1)+'" data-pol="'+t.key+'">'+
      '<span class="pos__dot" aria-hidden="true">'+(i+1)+'</span><span class="pos__txt"><span class="pos__pill">'+esc(t.pill)+'</span>'+
      '<span class="pos__label">'+esc(t.label)+'</span></span></button></li>';
  });
  h += '</ul></div>';
  var t = tiers.filter(function(x){ return x.key===polSel; })[0];
  h += '<div class="polpanel" role="tabpanel" id="pp" aria-labelledby="pt-'+t.key+'" tabindex="0">'+
    '<div class="kicker">'+esc(t.pill)+'</div><h3>'+esc(t.label)+'</h3><p class="gist">'+esc(t.gist)+'</p>'+
    '<p><strong>What an activity at this position assumes:</strong> '+esc(t.reads)+'</p>'+
    (t.n ? '<p><a href="#activities?pol='+t.key+'">'+t.n+' activities in the collection assume this position</a></p>' : '')+
    '<h4 class="pol-examples-h">Examples from published syllabi</h4><ul class="quotes">'+
    (t.items||[]).map(function(q){
      return '<li><blockquote><p>“'+esc(q.quote)+'”</p></blockquote><div class="who"><span><strong>'+esc(q.who)+'</strong> · '+esc(q.course)+' · '+esc(q.inst)+'</span>'+
        '<span>'+esc(q.lic)+'</span></div></li>'; }).join('')+'</ul></div>';
  var a = P.aside;
  h += '<div class="aside-card"><div class="kicker">'+esc(a.pill)+'</div><h3>'+esc(a.label)+'</h3><p>'+esc(a.gist)+'</p><p>'+esc(a.reads)+'</p>'+
    (a.n ? '<p><a href="#activities?pol=instructor_side">'+a.n+' activities in the collection are the instructor’s or staff member’s own work</a></p>' : '')+'</div>';
  h += '<p class="polsrc">Examples are drawn from <a href="'+esc(P.source.url)+'" target="_blank" rel="noopener noreferrer">'+esc(P.source.name)+
    '<span class="sr-only"> (opens in a new tab)</span></a>, '+esc(P.source.who)+'. Each quotation keeps the instructor, course, institution and the license its contributor chose; excerpts are condensed. '+
    'For guidance at Lewis, see <a href="'+esc(P.local.url)+'" target="_blank" rel="noopener noreferrer">'+esc(P.local.label)+'<span class="sr-only"> (opens in a new tab)</span></a>.</p>';
  document.getElementById('policies').innerHTML = h;
}
function selectPol(key, focus){
  polSel = key; drawPolicies();
  if(focus){ var b = document.getElementById('pt-'+key); if(b) b.focus(); }
}

/* ═════════════ sources ═════════════ */
/* order and letter come from the page store (scripts/corpus_pages.py sort_key): the citation's lead
   name filed under its surname, group authors under their own names */
function sortKey(w){ return w.sk || (w.cit||w.a||w.t||'').replace(/^[^A-Za-z]+/,'').toLowerCase(); }
function letterOf(w){ if(w.lt) return w.lt; var c = sortKey(w).replace(/^[^a-z]+/,'').charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }
function citeOf(w){ return w.cit || [w.a, w.y ? '('+w.y+').' : '', w.t].filter(Boolean).join(' '); }
function drawSources(){
  var q = F.q, list = (q ? worksMatching(q) : R.works.slice()).sort(function(x,y){ return (sortKey(x) < sortKey(y) ? -1 : sortKey(x) > sortKey(y) ? 1 : 0) || String(x.y).localeCompare(String(y.y)); });
  var h = '<div class="sec-head"><div class="sec-eyebrow">Works cited</div><h2 id="h-sources" tabindex="-1">Sources</h2>'+
    '<p>Every published work an activity in the collection draws on, with a link to the work or to the library catalog. Each activity also lists its own source, license and the changes made in adapting it.</p></div>';
  h += '<details class="card card--origins"><summary class="card--origins__sum">Where the activities come from</summary>'+
    '<dl class="legend">'+R.origin.filter(function(o){ return o[3]; }).map(function(o){
      var O = S_.ORIGIN[o[0]]||{label:o[1],text:o[2]};
      return '<div><dt>'+esc(O.label)+' <span class="tag">'+o[3]+'</span></dt><dd>'+esc(O.text)+'</dd></div>'; }).join('')+'</dl>'+
    '<p class="muted">The collection includes only activities whose sources are published under a Creative Commons license or another open license. '+
    'Activities adapted from those sources keep the original license, and any ShareAlike or NonCommercial terms, when they are reused.</p></details>';
  h += '<p class="countline">'+(q ? '<strong>'+list.length+'</strong> of '+R.works.length+' sources match “'+esc(q)+'”. <button type="button" class="btn btn--sm btn--quiet" id="clearSrcSearch">Show all sources</button>'
                                   : '<strong>'+list.length+'</strong> sources.')+'</p>';
  if(!list.length){ document.getElementById('sources').innerHTML = h + '<div class="empty"><strong>No sources match that search</strong></div>'; return; }
  var groups = {}, order = [];
  list.forEach(function(w){ var l = letterOf(w); if(!groups[l]){ groups[l]=[]; order.push(l); } groups[l].push(w); });
  order.sort();
  if(!q) h += '<ul class="letters" aria-label="Jump to a letter">'+order.map(function(l){ return '<li><a href="#sources" data-letter="'+l+'">'+l+'</a></li>'; }).join('')+'</ul>';
  order.forEach(function(l){
    h += '<h3 class="letterhead" id="letter-'+(l==='#'?'num':l)+'" tabindex="-1">'+l+'</h3><ul class="srclist">';
    groups[l].forEach(function(w){
      var link = w.link ? '<a href="'+esc(w.link)+'" target="_blank" rel="noopener noreferrer">'+(w.link.indexOf('doi.org')>=0?'Open via DOI':'Open the work')+'<span class="sr-only"> (opens in a new tab)</span> ↗</a>'
               : (w.search ? '<a href="'+esc(w.search)+'" target="_blank" rel="noopener noreferrer">Find it in the library catalog<span class="sr-only"> (opens in a new tab)</span> ↗</a>' : '');
      var acts = (w.acts||[]).filter(function(id){ return S_.BYID[id]; });
      h += '<li class="src" id="src-'+esc(w.id)+'"><div class="src__cit">'+esc(citeOf(w))+'</div><div class="src__meta">'+
        (link ? '<span>'+link+'</span>' : '')+(w.lic ? '<span>License: '+esc(w.lic)+'</span>' : '')+'</div>'+
        (acts.length ? '<details><summary>Used in '+acts.length+' activit'+(acts.length===1?'y':'ies')+'</summary><ul>'+acts.map(function(id){
            return '<li><button type="button" data-open="'+esc(id)+'">'+esc(S_.BYID[id].t)+'</button></li>'; }).join('')+'</ul></details>' : '')+'</li>';
    });
    h += '</ul>';
  });
  document.getElementById('sources').innerHTML = h;
}

/* ═════════════ how to use ═════════════ */
function drawAbout(){
  var h = '<div class="sec-head"><div class="sec-eyebrow">Getting oriented</div><h2 id="h-about" tabindex="-1">How to use The Register</h2>'+
    '<p>The Register is the reference companion to <a href="what-if-ai.html">What If AI</a>. What If AI asks a few questions and suggests activities; The Register lets you browse and search everything in the collection directly.</p>'+
    '<p><a class="btn btn--sm" href="what-if-ai.html#tour">'+icon('i-manual')+' How to use What If AI: a short walkthrough</a></p></div>';
  h += '<div class="about">';
  h += '<div class="card"><h3>What is here</h3><p><strong>Activities</strong> — teaching, research and administrative activities that use generative AI or deliberately leave it out, each with its source and license.</p>'+
    '<p><strong>Types of AI systems</strong> — what different kinds of AI tools do, described without reference to particular products.</p>'+
    '<p><strong>Course AI policies</strong> — a spectrum of positions with openly licensed examples from published syllabi.</p>'+
    '<p><strong>Sources</strong> — the published works the activities draw on.</p></div>';
  h += '<div class="card"><h3>Reading an activity</h3><dl class="gloss">'+
    '<dt>Who does it</dt><dd>Whether students carry out the activity, or you do it as part of your own teaching, research or service work.</dd>'+
    '<dt>Scale</dt><dd>The size of the piece of work, from a single class to a term-long project or a recurring process.</dd>'+
    '<dt>AI use</dt><dd>The kind of tool needed, described by capability rather than product. See <a href="#ai-types">Types of AI systems</a>.</dd>'+
    '<dt>How the work is divided</dt><dd>What the AI tool does, and what people do with its output — the judgment that stays with people.</dd>'+
    '<dt>Course AI policy</dt><dd>The course policy position the activity assumes. See <a href="#policies">Course AI policies</a>.</dd>'+
    '<dt>Before you use it</dt><dd>Cautions about data, disclosure, cost, access and accessibility.</dd>'+
    '<dt>Source and license</dt><dd>Where the activity comes from, its license, the attribution to keep, and how this version differs from the source.</dd></dl></div>';
  h += '<div class="card"><h3>How the collection was assembled</h3><p>The activities come from openly licensed teaching and research literature, open educational resources and published prompt and workflow libraries. '+
    'Each is described in the library’s own words and classified with a shared set of descriptors, so the collection can be searched by the kind of work rather than by product name. '+
    'Descriptions of what a source reports are kept separate from the library’s editorial additions, and suggested adaptations are labeled as suggestions.</p>'+
    '<p>Only activities whose sources are published under a Creative Commons license or another open license are included. The library keeps a full record of sources, licenses and editorial decisions for the collection.</p></div>';
  h += '<div class="card"><h3>Saving and printing</h3><p>Use <strong>Save</strong> on any activity, here or in What If AI, to collect it. Open <strong>Saved activities</strong> from the top of the page to review your selection, remove items, or print the set or save it as a PDF.</p>'+
    '<p>Your saved selection stays in this browser and is not sent to the library.</p></div>';
  h += '<div class="card"><h3>Activity feedback</h3><p>Open an activity and choose <strong>Give feedback</strong> to share whether you are exploring it, considering it, planning to use it, have used it, or find it unsuitable for your needs. '+
    'A short follow-up lets you say how it went or why it was not a fit. Every response is optional, and no name or email is collected.</p>'+
    '<p>Choose <strong>Send feedback</strong> when you are ready. This browser remembers your submitted answer, and you can update it later.</p></div>';
  h += '<div class="card"><h3>Corrections and questions</h3><p>If a link has broken, a license or attribution looks wrong, or you have used an activity and want to share how it went, please '+
    '<a href="https://lewisu.libwizard.com/f/Faculty-AI-Eval-Tool-feedback" target="_blank" rel="noopener noreferrer">send feedback<span class="sr-only"> (opens in a new tab)</span></a>. '+
    'For help finding sources or planning an activity, use <strong>Ask Us</strong> from the ✦ help button.</p></div>';
  h += '</div>';
  document.getElementById('about').innerHTML = h;
}

/* ═════════════ routing ═════════════ */
function show(sec, focus){
  if(SECTIONS.indexOf(sec)<0) sec = 'activities';
  current = sec;
  SECTIONS.forEach(function(s){ document.getElementById(s).classList.toggle('is-on', s===sec); });
  [].forEach.call(document.querySelectorAll('#secnav a'), function(a){
    if(a.getAttribute('data-sec')===sec) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  document.title = TITLES[sec] + ' · The Register | Lewis University Library';
  if(focus){ var h = document.getElementById('h-'+sec); if(h){ h.focus({preventScroll:true}); var nav=document.getElementById('secnav'); if(nav) nav.scrollIntoView({block:'start'}); } }
}
function applyQuery(qs){
  resetF();
  qs.split('&').forEach(function(p){
    var kv = p.split('='), k = decodeURIComponent(kv[0]||''), v = decodeURIComponent(kv[1]||'');
    if(!k || !(k in F)) return;
    if(typeof F[k]==='boolean') F[k] = v==='1'||v==='true'; else F[k] = v;
  });
  shown = PAGE;
}
/* one router for load, Back/Forward (popstate) and followed links (hashchange); it does nothing when the
   address already matches what is shown, so the two events never double-render and closing an activity
   never re-renders (or steals focus from) the list underneath */
function route(first){
  if(!first && location.hash === routed) return;
  if(typeDialog.open && location.hash !== '#ai-types'){
    typeNavigating = true; S_.closeDialog(typeDialog);
  }
  routed = location.hash;
  var hsh = (location.hash||'').replace(/^#/,'');
  var m, dlg = document.getElementById('actDialog');
  if(dlg && dlg.open && !/^act=/.test(hsh)){ actPushed = false; S_.closeDialog(dlg); }
  if(!first && '#'+hsh === base && !/^act=/.test(hsh)) return;      /* back to the view under the activity */
  if((m = /^act=(.+)$/.exec(hsh))){
    var id = decodeURIComponent(m[1]);
    if(first) show('activities', false);
    if(!S_.openActivity(id)){
      show('activities', false); base = filterHash();
      var old = document.getElementById('missingAct'); if(old) old.parentNode.removeChild(old);
      S_.announce('No activity with the identifier '+id+' is in the published collection.');
      var box = document.getElementById('actResults');
      if(box) box.insertAdjacentHTML('afterbegin','<div class="note" id="missingAct"><strong>That activity is not in the published collection.</strong> '+
        'The identifier '+esc(id)+' may belong to an earlier edition. Try searching for its title.</div>');
    }
    return;
  }
  if((m = /^src=(.+)$/.exec(hsh))){
    var sid = decodeURIComponent(m[1]); base = '#sources';
    if(F.q){ F.q=''; syncFilterControls(); drawSources(); }
    show('sources', false);
    var el = document.getElementById('src-'+sid);
    if(el){ [].forEach.call(document.querySelectorAll('.srclist .is-target'),function(x){x.classList.remove('is-target');});
      el.classList.add('is-target'); el.setAttribute('tabindex','-1'); el.scrollIntoView({block:'center'}); el.focus({preventScroll:true}); }
    return;
  }
  if((m = /^activities\?(.*)$/.exec(hsh))){
    applyQuery(m[1]); syncFilterControls(); show('activities', !first); refreshResults(false); drawSources(); return;
  }
  var sec = OLD[hsh] || hsh || 'activities';
  if(SECTIONS.indexOf(sec)<0) sec = 'activities';
  show(sec, !first && SECTIONS.indexOf(OLD[hsh] || hsh)>=0);
  base = sec==='activities' ? filterHash() : '#'+sec;
  if(OLD[hsh]){ try { history.replaceState({reg:1}, '', '#'+sec); } catch(_){} routed = location.hash; }
}

/* ═════════════ events ═════════════ */
document.addEventListener('change', function(e){
  var t = e.target;
  if(t.hasAttribute && t.hasAttribute('data-f')){ F[t.getAttribute('data-f')] = t.value; shown = PAGE; refreshResults(true); return; }
  if(t.hasAttribute && t.hasAttribute('data-fc')){ F[t.getAttribute('data-fc')] = t.checked; shown = PAGE; refreshResults(true); return; }
});
var gqTimer = null;
document.getElementById('gq').addEventListener('input', function(e){
  var v = e.target.value.trim();
  clearTimeout(gqTimer);
  gqTimer = setTimeout(function(){
    F.q = v; shown = PAGE;
    refreshResults(true); drawSources();
    if(current!=='activities' && current!=='sources'){ show('activities', false); recordFilters(); }
  }, 180);
});
document.addEventListener('click', function(e){
  var t = e.target;
  var c = t.closest('[data-clear]');
  if(c){ var k = c.getAttribute('data-clear'); F[k] = (typeof F[k]==='boolean') ? false : ''; shown = PAGE; syncFilterControls(); refreshResults(true); if(k==='q') drawSources();
         var next = document.querySelector('#actResults .fchip') || document.getElementById('h-activities'); if(next) next.focus(); return; }
  var ft = t.closest('#filtersToggle');
  if(ft){ var fl=document.getElementById('filters'), open = fl.classList.toggle('is-collapsed')===false;
          ft.setAttribute('aria-expanded', String(open)); ft.textContent = open ? 'Hide filters' : 'Show filters'; return; }
  if(t.closest('#resetFilters') || t.closest('#resetFilters2')){ resetF(); shown = PAGE; syncFilterControls(); refreshResults(true); drawSources(); return; }
  if(t.closest('#moreActs')){
    var before = shown; shown += PAGE; refreshResults(false);
    var cards = document.querySelectorAll('#actResults .acard'); var nb = cards[before] && cards[before].querySelector('[data-open]'); if(nb) nb.focus();
    return;
  }
  if(t.closest('#clearSrcSearch')){ F.q=''; syncFilterControls(); refreshResults(false); drawSources(); return; }
  if(t.closest('[data-goto-sources]')){ e.preventDefault(); try { history.pushState({reg:1}, '', '#sources'); } catch(_){} routed = location.hash; base = '#sources'; show('sources', true); return; }
  var pb = t.closest('[data-pol]'); if(pb){ selectPol(pb.getAttribute('data-pol'), true); return; }
  var lt = t.closest('[data-letter]');
  if(lt){ e.preventDefault(); var l = lt.getAttribute('data-letter'), hd = document.getElementById('letter-'+(l==='#'?'num':l));
          if(hd){ hd.scrollIntoView({block:'start'}); hd.focus({preventScroll:true}); } return; }
});
document.addEventListener('keydown', function(e){
  var t = e.target; if(!t.closest || !t.closest('[role="tab"][data-pol]')) return;
  var keys = R.policy.tiers.map(function(x){ return x.key; }), i = keys.indexOf(polSel), n = -1;
  if(e.key==='ArrowRight'||e.key==='ArrowDown') n = (i+1)%keys.length;
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp') n = (i-1+keys.length)%keys.length;
  else if(e.key==='Home') n = 0; else if(e.key==='End') n = keys.length-1;
  if(n>=0){ e.preventDefault(); selectPol(keys[n], true); }
});
window.addEventListener('hashchange', function(){ route(false); });
window.addEventListener('popstate', function(){ route(false); });

/* closing an activity returns to the address underneath: by going back when opening it made an entry,
   otherwise (it arrived by link) by replacing the address */
document.getElementById('actDialog').addEventListener('close', function(){
  if(!/^#act=/.test(location.hash)) return;
  if(actPushed){ actPushed = false; routed = base; history.back(); }
  else { try { history.replaceState({reg:1}, '', base); } catch(_){} routed = location.hash; }
});

/* ═════════════ start ═════════════ */
drawActivities(); drawTypes(); drawPolicies(); drawSources(); drawAbout();
route(true);
})();
