/* ════════════════════════════════════════════════════════════
   WHAT IF AI + THE REGISTER · SHARED BEHAVIOR
   One renderer for an activity (card, full detail, print), one saved-activities
   store, the dialogs, and status announcements. Both pages read the same
   activity store (data/acts.<hash>.json, fetched once), so an activity reads identically everywhere.
   ES5, no dependencies.
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var D = window.SITE_DATA.acts;   /* fetched by boot.js from data/acts.<hash>.json */
var A = D.acts, IN = D.intake, TOOL_LICENSE = window.TOOL_LICENSE;
var BYID = {}, ALIAS = {};
A.forEach(function(a){ BYID[a.id] = a; (a.al||[]).forEach(function(x){ if(!ALIAS[x]) ALIAS[x] = a.id; }); });

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function pretty(s){ return String(s||'').replace(/_/g,' '); }
function G(s){ return (typeof linkifyGuide==='function') ? linkifyGuide(esc(s)) : esc(s); }
function lab(list, v){ for(var i=0;i<(list||[]).length;i++) if(list[i][0]===v) return list[i][1]; return ''; }

/* ─────────── plain-language labels ─────────── */
var L = {
  focus: {teaching:'Teaching', research_own:'Your own research or writing', admin:'Program, committee, or administrative work'},
  actor: {'student':'Students', 'instructor-pedagogical':'You, as the instructor', 'instructor-scholarly':'You, as a researcher',
          'instructor-service':'You, in a service or committee role', 'library-staff':'Library staff'},
  scale: {individual:'individually', pair:'in pairs', small_group:'in small groups', whole_class:'as a whole class',
          committee_or_team:'as a committee or team', program_or_cohort:'across a program or cohort'},
  stakes:{formative:'Low stakes (formative)', summative:'Graded (summative)', ungraded:'Ungraded'},
  cap:   {text_chat:'Text chat', image_generation:'Image generation', audio_or_voice:'Speech or audio',
          code_execution:'Code or data analysis', retrieval_grounded:'Works from documents you supply',
          image_understanding:'Reads images', external_retrieval:'Searches for current information',
          workflow_automation:'Multi-step automation', video_generation:'Video generation', none_required:'No AI tool'},
  capLong:{text_chat:'a conversational AI tool that reads and writes text',
          image_generation:'a tool that generates images', audio_or_voice:'a speech, transcription, or audio tool',
          code_execution:'a tool that writes or runs code', retrieval_grounded:'a tool that answers from documents you supply',
          image_understanding:'a tool that can read an image you supply', external_retrieval:'a tool that searches for current information',
          workflow_automation:'a tool that carries out steps across applications', video_generation:'a tool that generates video',
          none_required:'no AI tool'},
  capType:{text_chat:'conversational', retrieval_grounded:'grounded', external_retrieval:'search', image_understanding:'multimodal',
          image_generation:'image', video_generation:'video', audio_or_voice:'audio', code_execution:'code', workflow_automation:'agentic'},
  eq:    {no_tool_needed:'No tool needed', free_tier:'A free version is enough', institution_provided:'Provided by the institution',
          paid_required:'Paid tool required',
          paid_with_stated_alternative:'Paid tool, with a free alternative described', not_specified:'Not stated'},
  pc:    {human_checking_required:'A person needs to check the output', institutional_approval_required:'Needs ethics or institutional approval first',
          equipment_required:'Needs special equipment', purchased_material:'Needs purchased materials',
          travel_or_attendance:'Needs travel or in-person attendance', account_verification:'Participants need to create or verify an account'},
  sen:   {student_work:'students’ own work', student_derived_deidentified:'de-identified information derived from students',
          identifiable_student_data:'identifiable student information', own_personal_data:'your own personal information',
          personal_sensitive:'sensitive personal information', identifiable_third_party:'information about identifiable people',
          confidential_third_party:'confidential information belonging to others',
          research_participant_deidentified:'de-identified research participant data',
          restricted_institutional_data:'restricted institutional data'},
  dis:   {none_required:'No disclosure step', informal_acknowledgement:'An informal acknowledgment of AI use',
          documented_log:'A documented record of AI use', formal_statement:'A formal disclosure statement',
          anonymity_by_design:'Anonymous by design'},
  role:  {generator:'AI produces material to work with', interlocutor:'AI as a conversation partner',
          evaluator:'AI comments on existing work', instrument:'AI does one bounded task',
          specimen:'AI output is examined as the object of study', withheld:'AI is deliberately left out'},
  /* source access: a source item used as published, by link, that is not openly
     licensed. Absent means every work the use-case idea adapts or uses is openly licensed. */
  sa:    {not_open:'No clear open license', unmodified:'Use only as published', restricted:'Access or permission needed'},
  saLong:{not_open:'The source item it uses states no clear open license for the item itself. Use the item from its own page as published, and ask its owner before copying or adapting it.',
          unmodified:'The source item it uses may be shared as published but not changed (a NoDerivatives license or a reproduce-only permission).',
          restricted:'Using the source item needs a purchase, membership, subscription, or permission before classroom use.'},
  move:  {produce_first:'Produce your own version first', verify:'Check against sources', critique:'Critique against a standard',
          revise:'Revise your own work', analyze_as_data:'Analyze the output as evidence', constrain:'Set limits, or decide not to use it'}
};
var ORIGIN = {};
(D.origin||[]).forEach(function(o){ ORIGIN[o[0]] = {label:o[1], text:o[2]}; });
/* the two sets written for the collection (synthesis, remix); records without a set are the licensed collection */
var TIER = {};
(D.tiers||[]).forEach(function(t){ TIER[t[0]] = {label:t[1], text:t[2]}; });
function tierOf(a){ return a.tier && TIER[a.tier]; }
/* who operates an AI tool in the use-case idea */
var OPERATOR = {};
(D.operators||[]).forEach(function(o){ OPERATOR[o[0]] = {label:o[1], text:o[2]}; });
function operatorLabel(v){ return (OPERATOR[v]||{}).label || pretty(v); }
/* the Register's copy of FINDER_MATCH.requirement(a,'noai'): "My students won't use an AI tool themselves" */
function noToolForStudents(a){
  if(a.na) return 'confirmed';
  if(a.op==='students') return 'excluded';
  return ['faculty_or_staff','optional','none'].indexOf(a.op)>=0 ? 'confirmed' : 'unknown';
}
function lines(s){ return String(s||'').split('\n').filter(function(x){ return x.trim(); }); }

function taskLabel(v, focus){ var o=(D.task_labels||{})[focus]||{}; return o[v] || lab(IN.task, v) || pretty(v); }
function depthLabel(v){ return lab(IN.depth, v) || pretty(v); }
function discLabel(v){ return lab(IN.disc, v) || ''; }
function lvlLabel(v){ return v==='any' ? 'Any level' : (lab(IN.lvl, v) || pretty(v)); }
function modLabel(v){ return v==='any' ? 'Any setting' : (lab(IN.mod, v) || pretty(v)); }
function capsShort(a){ return (a.cap||[]).map(function(c){ return L.cap[c]||pretty(c); }).join(', '); }
// Keep theme filter values stable while applying the site's punctuation style to labels.
var FAMILY_LABELS = {
  "Auditing AI Outputs for Bias, Defaults and Influence": "Auditing AI Outputs for Bias, Defaults, and Influence",
  "AI Ethics, Governance, Privacy and Public Discourse": "AI Ethics, Governance, Privacy, and Public Discourse",
  "Academic Integrity, Authorship and Course AI Policy": "Academic Integrity, Authorship, and Course AI Policy",
  "Using AI to Read, Explain and Understand": "Using AI to Read, Explain, and Understand",
  "Simulations, Personas and AI Role-Play": "Simulations, Personas, and AI Role-Play",
  "Study Support, Tutoring and Practice": "Study Support, Tutoring, and Practice",
  "Style, Genre and Language Through AI Imitation": "Style, Genre, and Language Through AI Imitation",
  "Verifying AI Output: Facts, Sources and Fabrication": "Verifying AI Output: Facts, Sources, and Fabrication",
  "Visual, Multimodal and Performance Making": "Visual, Multimodal, and Performance Making",
  "AI in the Writing Process: Invention, Feedback and Revision": "AI in the Writing Process: Invention, Feedback, and Revision"
};
function familyLabel(key){ return FAMILY_LABELS[key] || key; }
function kickerOf(a){ return a.f ? familyLabel(a.f) : taskLabel((a.task||[])[0], a.focus); }
function scaleText(a){
  var d = depthLabel(a.depth), g = (a.sc||[]).filter(function(v){return L.scale[v];}).map(function(v){return L.scale[v];});
  return d + (g.length ? ' · done ' + g.join(' or ') : '');
}
function howItWorks(a){
  var role={generator:'The AI tool produces something that people then work on',
   interlocutor:'The AI tool holds up its end of a conversation',
   evaluator:'The AI tool comments on work that already exists',
   instrument:'The AI tool does one bounded job inside a process a person runs',
   specimen:'What the AI tool produces is itself the thing being examined',
   withheld:'The AI tool is deliberately kept out of the use-case idea'}[a.ar]||'';
  var move={produce_first:'participants commit to their own version before they see the tool’s.',
   verify:'participants check what it said against real sources.',
   critique:'participants judge what came back against a standard they already hold.',
   revise:'participants change their own work in light of what came back.',
   analyze_as_data:'participants treat what it produced as evidence about the tool.',
   constrain:'participants set the limits of its use, or decide not to use it.'}[a.hm]||'';
  /* with the tool kept out, nothing "comes back" from it: these moves describe the work without it */
  if(a.ar==='withheld'){
    var without={produce_first:'participants produce their own version without it.',
     verify:'participants check claims about AI against real sources.',
     critique:'participants judge claims about AI against a standard they already hold.',
     revise:'participants revise their own work without it.',
     analyze_as_data:'participants examine evidence about AI rather than output from a tool.',
     constrain:'participants decide where its use should stop, or that it should not be used.'}[a.hm]||'';
    return role && without ? role + '; ' + without : '';
  }
  return role && move ? role + ', and ' + move : '';
}
function sensitive(a){ return a.sen && L.sen[a.sen]; }
/* the source items an activity uses as published, by link ("Used unmodified" in its list of works) */
function usedItems(a){ return (a.rel||[]).filter(function(r){ return /^Used unmodified/.test(r[1]); }); }
function sourceAccess(a){ return a.sa && L.sa[a.sa] ? a.sa : ''; }
/* where the data goes: an AI tool when someone operates one, otherwise the activity's other tools */
function dataTool(a){ return a.op==='none' ? 'a third-party tool' : 'an AI tool'; }

/* ─────────── saved activities (this browser only) ─────────── */
var KEY = 'lul-whatifai-saved-v1';
var mem = null, listeners = [];
function readIds(){
  if(mem) return mem.slice();
  try { var v = JSON.parse(window.localStorage.getItem(KEY)||'[]'); mem = Array.isArray(v) ? v.filter(function(x){return typeof x==='string';}) : []; }
  catch(_){ mem = []; }
  return mem.slice();
}
function writeIds(ids){
  mem = ids.slice();
  try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch(_){ /* private mode: session memory only */ }
  listeners.forEach(function(fn){ try{ fn(ids.slice()); }catch(_){} });
}
var Saved = {
  ids: readIds,
  has: function(id){ return readIds().indexOf(id) >= 0; },
  add: function(id){ var ids=readIds(); if(ids.indexOf(id)<0){ ids.push(id); writeIds(ids); } },
  remove: function(id){ writeIds(readIds().filter(function(x){return x!==id;})); },
  toggle: function(id){ if(Saved.has(id)){ Saved.remove(id); return false; } Saved.add(id); return true; },
  clear: function(){ writeIds([]); },
  onChange: function(fn){ listeners.push(fn); }
};
window.addEventListener('storage', function(e){
  if(e.key !== KEY) return;
  mem = null; var ids = readIds(); listeners.forEach(function(fn){ try{ fn(ids); }catch(_){} });
});

/* ─────────── status announcements ─────────── */
function announce(msg){
  var el = document.getElementById('srStatus'); if(!el) return;
  el.textContent = ''; setTimeout(function(){ el.textContent = msg; }, 40);
}

/* ─────────── addresses ─────────── */
/* A pasted or truncated link can carry a broken %-escape. decodeURIComponent would throw and leave the
   page blank, so a part that cannot be decoded is treated as unrecognized (null) instead. */
function decode(s){ try { return decodeURIComponent(s); } catch(_){ return null; } }

/* ─────────── icons ─────────── */
/* line icons from the shared sprite (templates/partials/icons.svg); always decorative, the control carries the name */
function icon(name, cls){ return '<svg class="ico'+(cls?' '+cls:'')+'" aria-hidden="true" focusable="false"><use href="#'+name+'"/></svg>'; }
var ICON_BOOKMARK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="fill" d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

function saveButton(a, cls){
  var on = Saved.has(a.id);
  return '<button type="button" class="btn btn--sm save '+(cls||'')+'" data-save="'+esc(a.id)+'" aria-pressed="'+on+'">'+
    ICON_BOOKMARK+'<span class="save__txt">'+(on?'Saved':'Save')+'</span><span class="sr-only"> use-case idea: '+esc(a.t)+'</span></button>';
}

/* ─────────── activity card ─────────── */
function cardHTML(a, opts){
  opts = opts || {}; var h = opts.h || 3;
  var on = Saved.has(a.id);
  var s = '<article class="acard'+(on?' is-saved':'')+'" data-card="'+esc(a.id)+'" aria-labelledby="t-'+esc(a.id)+(opts.suffix||'')+'">';
  s += '<div class="acard__kicker">'+esc(kickerOf(a))+'</div>';
  s += '<h'+h+' class="acard__title" id="t-'+esc(a.id)+(opts.suffix||'')+'">'+esc(a.t)+'</h'+h+'>';
  s += fieldTags(a);
  s += '<p class="acard__sum">'+esc(a.sum)+'</p>';
  s += '<dl class="acard__facts">';
  s += '<dt>Who</dt><dd>'+esc(L.actor[a.ac]||pretty(a.ac))+'</dd>';
  s += '<dt>Scale</dt><dd>'+esc(depthLabel(a.depth))+'</dd>';
  s += '<dt>AI use</dt><dd>'+esc(capsShort(a)||'Not stated')+'</dd>';
  if(OPERATOR[a.op]) s += '<dt>Who uses AI</dt><dd>'+esc(OPERATOR[a.op].label)+'</dd>';
  if(a.eq && a.eq!=='not_specified') s += '<dt>Cost</dt><dd>'+esc(L.eq[a.eq]||pretty(a.eq))+'</dd>';
  if(sourceAccess(a)) s += '<dt>Source item</dt><dd>'+esc(L.sa[a.sa])+'</dd>';
  var T = tierOf(a);
  if(T) s += '<dt>Origin</dt><dd>'+esc(T.label)+' · not yet tried</dd>';
  s += '</dl>';
  if(sensitive(a)) s += '<p class="acard__note"><span aria-hidden="true">⚠</span><span>Involves putting '+esc(L.sen[a.sen])+' into '+dataTool(a)+'.</span></p>';
  s += '<div class="acard__foot no-print">'+
       '<button type="button" class="btn btn--sm" data-open="'+esc(a.id)+'">View details<span class="sr-only">: '+esc(a.t)+'</span></button>'+
       saveButton(a)+'</div>';
  return s + '</article>';
}

/* fields the activity's own metadata supports (see scripts/corpus_pages.py field_tags) */
function fieldTags(a){
  var ft = a.ft || [];
  if(!ft.length) return '<ul class="ftags" aria-label="Field"><li><span class="ftag ftag--none">Field not specified</span></li></ul>';
  return '<ul class="ftags" aria-label="'+(ft.length===1?'Field':'Fields')+'">'+ft.map(function(f){ return '<li><span class="ftag">'+esc(f)+'</span></li>'; }).join('')+'</ul>';
}

/* ─────────── full activity detail (screen dialog and print) ─────────── */
function sec(title, body){ return body ? '<section><h3>'+title+'</h3>'+body+'</section>' : ''; }
function p(t, cls){ return t ? '<p'+(cls?' class="'+cls+'"':'')+'>'+G(t)+'</p>' : ''; }
function detailHTML(a, opts){
  opts = opts || {};
  var reg = opts.registerHref || 'register.html';
  var h = '';

  /* 1 · the activity */
  h += sec('The use-case idea', p(a.sum, 'lead'));

  /* 2 · at a glance */
  var f = '<dl class="facts">';
  f += '<dt>Who does it</dt><dd>'+esc(L.actor[a.ac]||pretty(a.ac))+'</dd>';
  f += '<dt>Area of work</dt><dd>'+esc(L.focus[a.focus]||pretty(a.focus))+' · '+esc((a.task||[]).map(function(t){return taskLabel(t,a.focus);}).join('; '))+'</dd>';
  f += '<dt>Scale</dt><dd>'+esc(scaleText(a))+'</dd>';
  if(a.st && L.stakes[a.st]) f += '<dt>Stakes</dt><dd>'+esc(L.stakes[a.st])+'</dd>';
  if(a.dl) f += '<dt>What is produced</dt><dd>'+esc(a.dl)+'</dd>';
  if(a.rf) f += '<dt>Reflection or assessment</dt><dd>'+esc(a.rf)+'</dd>';
  var disc = discLabel(a.disc) || a.fld;
  if(disc) f += '<dt>Discipline</dt><dd>'+esc(disc)+'</dd>';
  f += '<dt>Level</dt><dd>'+esc((a.lvl||[]).map(lvlLabel).join(', ')||'Not stated')+'</dd>';
  f += '<dt>Setting</dt><dd>'+esc((a.mod||[]).map(modLabel).join(', ')||'Not stated')+'</dd>';
  if(OPERATOR[a.op]) f += '<dt>Who uses an AI tool</dt><dd>'+esc(OPERATOR[a.op].text)+'</dd>';
  f += '<dt>AI tool needed</dt><dd>'+esc((a.cap||[]).map(function(c){return L.capLong[c]||pretty(c);}).join('; ')||'Not stated')+'</dd>';
  if(a.eq && a.eq!=='not_specified') f += '<dt>Cost and access</dt><dd>'+esc(L.eq[a.eq]||pretty(a.eq))+'</dd>';
  if(a.pc && L.pc[a.pc]) f += '<dt>Also required</dt><dd>'+esc(L.pc[a.pc])+'</dd>';
  if(sourceAccess(a)) f += '<dt>Source item</dt><dd>'+esc(L.sa[a.sa])+'</dd>';
  f += '</dl>';
  h += sec('At a glance', f);

  /* 3 · how people and the tool divide the work */
  var how = '';
  var hw = howItWorks(a); if(hw) how += '<p>'+esc(hw)+'</p>';
  if(a.gate) how += '<h4>'+(a.ac==='student'?(a.ar==='withheld'?'What students produce':'What students produce that the tool did not'):'The judgment that stays with you')+'</h4>'+p(a.gate);
  if(a.dep) how += '<h4>What it depends on the AI tool for</h4>'+p(a.dep);
  if(a.chk) how += '<h4>What the output is checked against</h4>'+p(a.chk);
  h += sec('How people and the AI tool divide the work', how);

  /* 4 · before you use it */
  var b = '';
  if(sensitive(a)) b += '<div class="note note--caution"><strong>Data.</strong> This use-case idea involves putting '+esc(L.sen[a.sen])+
    ' into '+dataTool(a)+'. Before using it, consider your institution’s guidance on data and approved tools, whether consent is needed, and whether a de-identified or institutionally provided option is available.</div>';
  if(sourceAccess(a)){
    var items = usedItems(a), named = items.map(function(r){ return '“'+esc(r[2])+'”'; }).join(' and ');
    var where = opts.print ? 'Its terms are recorded with the source in The Register.' :
      'Its terms are in '+items.map(function(r){ return '<a href="'+reg+'#src='+encodeURIComponent(r[0])+'">The Register’s entry for '+esc(r[2])+'</a>'; }).join(' and ')+'.';
    b += '<div class="note'+(a.sa==='restricted'?' note--caution':'')+'"><strong>Source item: '+esc(L.sa[a.sa].toLowerCase())+'.</strong> '+
      'This use-case idea uses '+(named||'its source item')+' as published, by link; the item is not copied into the use-case idea. '+
      esc(L.saLong[a.sa])+' '+where+' The use-case idea’s own license is shown in its Source and license section.</div>';
  }
  var PL = (D.pol||{})[a.pol];
  if(PL){
    b += '<h4>Course AI policy it assumes</h4><p><strong>'+esc(PL.pill)+' — '+esc(PL.label)+'.</strong> '+esc(PL.reads)+
      (opts.print ? '' : ' <a href="'+reg+'#policies">About the policy spectrum</a>')+'</p>';
  }
  if(a.dis && L.dis[a.dis] && a.dis!=='none_required') b += '<h4>Disclosure built into the design</h4><p>'+esc(L.dis[a.dis])+'.</p>';
  if(a.risk) b += '<h4>Risks and accessibility</h4>'+p(a.risk);
  if(tierOf(a)) b += '<div class="note"><strong>Written for this collection, not yet tried.</strong> '+
    'This use-case idea is part of the '+esc(tierOf(a).label.toLowerCase())+'. No one has reported teaching or running it yet. Consider treating it as a starting design rather than a tested one.</div>';
  if(a.use==='unreported') b +='<div class="note"><strong>A published prompt or workflow.</strong> '+
    'It is openly licensed and cited, but no results from using it have been reported. Consider treating it as a starting design rather than a tested one.</div>';
  h += sec('Before you use it', b);

  /* 5 · without AI */
  var na = '';
  if(a.na) na = p(a.na);
  else if(a.op==='none') na = '<p>This use-case idea runs without any AI tool.</p>';
  else if(a.op==='optional') na = '<p>The use-case idea as described is complete without an AI tool; the AI step it mentions is optional.</p>';
  else if(!a.op && (a.cap||[]).indexOf('none_required')>=0) na = '<p>This use-case idea runs without any AI tool.</p>';
  h += sec('A route without AI', na);

  /* 6 · adapting it */
  var ad = '';
  if(a.ad) ad += p(a.ad);
  if(a.pa && a.pa.length){
    ad += '<h4>A possible adaptation</h4><p class="meta-line">Suggested by the compilers of this collection; not from the source and not yet tried.</p><dl class="facts">'+
      a.pa.map(function(x){ return (x[0]?'<dt>'+esc(x[0])+'</dt>':'<dt>Suggestion</dt>')+'<dd>'+G(x[1])+'</dd>'; }).join('')+'</dl>';
  }
  if(a.miss && a.miss.length) ad += '<h4>Details the source leaves open</h4><ul>'+a.miss.map(function(m){return '<li>'+esc(m)+'</li>';}).join('')+'</ul>';
  if(a.ev && a.ev.length) ad += '<h4>Also described for</h4><ul>'+a.ev.map(function(v){return '<li>'+esc(v[0])+(v[1]?' ('+esc(v[1])+')':'')+'</li>';}).join('')+'</ul>';
  if(a.var && BYID[a.var]) ad += '<h4>Related use-case idea</h4><p>A variation of '+
      (opts.print ? '“'+esc(BYID[a.var].t)+'”' : '<a href="#" data-open="'+esc(a.var)+'">'+esc(BYID[a.var].t)+'</a>')+'.</p>';
  h += sec('Adapting it', ad);

  /* 7 · what the source reports */
  var sr = '';
  if(a.srp && a.srp.length){
    var SRL={goal:'Goal',procedure:'Procedure',expected_output:'Expected output',verification_step:'How results are checked'};
    sr += '<dl class="facts">'+a.srp.map(function(x){return '<dt>'+esc(SRL[x[0]]||pretty(x[0]))+'</dt><dd>'+G(x[1])+'</dd>';}).join('')+'</dl>';
  }
  if(a.pr) sr += '<h4>A prompt the source provides</h4><p>“'+G(a.pr)+'”</p>';
  if(a.tool) sr += '<p class="meta-line">Tool named in the source: '+esc(a.tool)+'. Recorded as reported, not as a recommendation.</p>';
  h += sec('What the source reports', sr);

  /* 8 · source, license, attribution */
  var o = ORIGIN[a.cls], T = tierOf(a);
  var src = '';
  if(o) src += '<p><strong>'+esc(o.label)+'.</strong> '+esc(o.text)+'</p>';
  if(T) src += '<p><strong>'+esc(T.label)+'.</strong> '+esc(T.text)+'</p>';
  if(a.par && BYID[a.par]) src += '<h4>Builds on</h4><p>The use-case idea '+
    (opts.print ? '“'+esc(BYID[a.par].t)+'”' : '<a href="#" data-open="'+esc(a.par)+'">'+esc(BYID[a.par].t)+'</a>')+' in this collection.</p>';
  if(T && a.cit){
    src += '<h4>Sources</h4><div class="cite-block">'+lines(a.cit).map(function(c){ return '<p>'+esc(c)+'</p>'; }).join('')+
      (a.url && !opts.print ? '<p><a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">Open the primary source<span class="sr-only"> (opens in a new tab)</span> ↗</a></p>' : (a.url ? '<p>'+esc(a.url)+'</p>' : ''))+'</div>';
  } else if(a.cit){
    src += '<h4>Source</h4><div class="cite-block">'+esc(a.cit)+
      (a.url && !opts.print ? ' <a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">Open the source<span class="sr-only"> (opens in a new tab)</span> ↗</a>' : (a.url ? ' '+esc(a.url) : ''))+'</div>';
    if(a.loc) src += '<p class="meta-line">Location in the source: '+esc(a.loc)+'</p>';
  }
  src += '<h4>License for this use-case idea</h4><p data-entry-license>'+(a.licu && !opts.print ? '<a href="'+esc(a.licu)+'" target="_blank" rel="noopener noreferrer">'+esc(a.lic)+'</a>' : esc(a.lic||'Not stated'))+
    (a.lics ? ' <span class="meta-line">— as stated by the source: '+esc(a.lics)+'</span>' : '')+'</p>';
  src += '<p class="meta-line" data-entry-license-scope>'+esc(TOOL_LICENSE.entry_notice)+'</p>';
  if(a.licn) src += '<p class="meta-line">'+esc(a.licn)+'</p>';
  if(a.attr) src += '<h4>Attribution to keep when reusing</h4>'+lines(a.attr).map(function(x){ return '<p>'+esc(x)+'</p>'; }).join('');
  if(a.chg) src += '<h4>'+(T ? 'How it was put together' : 'How this version differs from the source')+'</h4>'+p(a.chg);
  if(a.rel && a.rel.length){
    src += '<h4>Works it draws on</h4><ul>'+a.rel.map(function(r){
      var t = esc(r[2]);
      var link = opts.print ? t : '<a href="'+reg+'#src='+encodeURIComponent(r[0])+'">'+t+'</a>';
      return '<li>'+esc(r[1])+': '+link+(r[3]?' <span class="meta-line">('+esc(r[3])+')</span>':'')+'</li>';
    }).join('')+'</ul>';
  }
  /* the identifier stays internal (deep links, saving, sources); only the way into The Register is shown */
  if(!opts.print && !opts.inRegister)
    src += '<p class="idline"><a href="'+reg+'#act='+encodeURIComponent(a.id)+'">'+icon('i-crt')+' Open in The Register</a></p>';
  h += sec('Source and license', src);

  return '<div class="detail">'+h+'</div>';
}

/* ─────────── dialogs ─────────── */
/* each dialog remembers the control that opened it, so two open at once (an activity opened from
   the saved drawer) each hand focus back to the right place; a dialog re-filled while open keeps
   its original opener */
function resetDialogScroll(dlg){
  dlg.scrollTo({top:0,left:0,behavior:'instant'});
  [].forEach.call(dlg.querySelectorAll('.dlg__body'), function(body){
    body.scrollTo({top:0,left:0,behavior:'instant'});
  });
}
function openDialog(dlg, opener){
  if(!dlg.open) dlg._opener = opener || document.activeElement;
  if(typeof dlg.showModal === 'function'){ if(!dlg.open) dlg.showModal(); }
  else { dlg.setAttribute('open',''); }
  var t = dlg.querySelector('[data-dlg-title]'); if(t){ t.setAttribute('tabindex','-1'); t.focus({preventScroll:true}); }
  // Reset only after showModal and focus: a hidden dialog has no usable scroll layout.
  resetDialogScroll(dlg);
}
function closeDialog(dlg){
  if(typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
}
function wireDialog(dlg){
  dlg.addEventListener('click', function(e){
    if(e.target === dlg) closeDialog(dlg);                        /* backdrop */
    if(e.target.closest('[data-close]')) closeDialog(dlg);
  });
  dlg.addEventListener('close', function(){
    var op = dlg._opener; dlg._opener = null;
    var closedHost = op && op.closest ? op.closest('dialog') : null;
    if(op && document.contains(op) && (!closedHost || closedHost.open)) { try{ op.focus({preventScroll:true}); }catch(_){} }
  });
}

var CTX = {page:'finder'};
function openActivity(id, opener){
  var a = BYID[id] || BYID[ALIAS[id]]; if(!a) return false;
  var dlg = document.getElementById('actDialog'); if(!dlg) return false;
  dlg.querySelector('[data-dlg-kicker]').textContent = kickerOf(a);
  dlg.querySelector('[data-dlg-title]').textContent = a.t;
  dlg.querySelector('.dlg__body').innerHTML = detailHTML(a, {inRegister: CTX.page==='register'}) + ActivityFeedback.render(a.id, CTX.page);
  ActivityFeedback.mount(dlg.querySelector('.activity-feedback'));
  var foot = dlg.querySelector('.dlg__foot');
  foot.innerHTML = saveButton(a) +
    '<button type="button" class="btn btn--sm" data-give-feedback>Give feedback</button>'+
    (CTX.page==='register'
      ? '<button type="button" class="btn btn--sm" data-copy-act="'+esc(a.id)+'">Copy a link to this use-case idea</button>'
      : '<a class="btn btn--sm" href="register.html#act='+encodeURIComponent(a.id)+'">'+icon('i-crt')+' Open in The Register</a>') +
    '<button type="button" class="btn btn--sm btn--quiet" data-close>Close</button>';
  var wasOpen = dlg.open;
  dlg.setAttribute('data-act', a.id);
  openDialog(dlg, opener);
  if(CTX.onOpen) CTX.onOpen(a.id, wasOpen, !!opener);
  return true;
}

/* ─────────── saved drawer ─────────── */
function savedMeta(a){ return [kickerOf(a), L.actor[a.ac]||'', depthLabel(a.depth)].filter(Boolean).join(' · '); }
function renderSaved(){
  var box = document.getElementById('savedBody'); if(!box) return;
  var ids = Saved.ids();
  var head = document.getElementById('savedTitle');
  if(head) head.textContent = 'Saved use-case ideas' + (ids.length ? ' ('+ids.length+')' : '');
  var foot = document.getElementById('savedFoot');
  if(!ids.length){
    box.innerHTML = '<div class="saved-empty"><p><strong>No saved use-case ideas yet.</strong></p>'+
      '<p>Use the Save button on any use-case idea to keep it here while you browse. You can then review your selection and print it or save it as a PDF.</p></div>'+
      '<p class="privacy">Your selection is kept in this browser only. There is no account, and nothing is sent anywhere.</p>';
    if(foot) foot.hidden = true;
    return;
  }
  var h = '<ol class="saved-list">';
  ids.forEach(function(id){
    var a = BYID[id];
    if(!a){
      h += '<li class="saved-item"><div class="saved-item__t">A use-case idea that is no longer in the collection</div>'+
        '<div class="saved-item__m">ID '+esc(id)+'</div><div class="saved-item__a">'+
        '<button type="button" class="btn btn--sm" data-unsave="'+esc(id)+'">Remove<span class="sr-only"> '+esc(id)+'</span></button></div></li>';
      return;
    }
    h += '<li class="saved-item"><div class="saved-item__t">'+esc(a.t)+'</div><div class="saved-item__m">'+esc(savedMeta(a))+'</div>'+
      '<div class="saved-item__a"><button type="button" class="btn btn--sm" data-open="'+esc(a.id)+'">View<span class="sr-only"> '+esc(a.t)+'</span></button>'+
      '<button type="button" class="btn btn--sm btn--quiet" data-unsave="'+esc(a.id)+'">Remove<span class="sr-only"> '+esc(a.t)+'</span></button></div></li>';
  });
  h += '</ol><p class="privacy">Your selection is kept in this browser only. There is no account, and nothing is sent anywhere.</p>';
  h += '<div class="confirm" id="clearConfirm" hidden><p>Remove all '+ids.length+' saved use-case idea'+(ids.length===1?'':'s')+'?</p>'+
       '<button type="button" class="btn btn--sm" id="clearYes">Remove all</button> '+
       '<button type="button" class="btn btn--sm btn--quiet" id="clearNo">Keep them</button></div>';
  box.innerHTML = h;
  if(foot) foot.hidden = false;
}
function syncSaveUI(){
  var ids = Saved.ids();
  [].forEach.call(document.querySelectorAll('[data-saved-count]'), function(el){ el.textContent = ids.length; });
  [].forEach.call(document.querySelectorAll('[data-saved-label]'), function(el){
    el.textContent = ids.length===1 ? '1 saved use-case idea' : ids.length+' saved use-case ideas'; });
  [].forEach.call(document.querySelectorAll('button[data-save]'), function(b){
    var on = ids.indexOf(b.getAttribute('data-save')) >= 0;
    b.setAttribute('aria-pressed', String(on));
    var t = b.querySelector('.save__txt'); if(t) t.textContent = on ? 'Saved' : 'Save';
  });
  [].forEach.call(document.querySelectorAll('[data-card]'), function(c){
    c.classList.toggle('is-saved', ids.indexOf(c.getAttribute('data-card')) >= 0); });
  var dr = document.getElementById('savedDrawer'); if(dr && dr.open) renderSaved();
}

/* ─────────── print the saved collection ─────────── */
function printSaved(){
  var ids = Saved.ids().filter(function(id){ return BYID[id]; });
  if(!ids.length){ announce('There are no saved use-case ideas to print.'); return; }
  var root = document.getElementById('printRoot');
  var today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  var h = '<h1>Saved use-case ideas</h1><div class="pr-sub">What If AI · Lewis University Library · '+ids.length+
    ' use-case idea'+(ids.length===1?'':'s')+' · printed '+esc(today)+'</div>';
  ids.forEach(function(id){
    var a = BYID[id];
    h += '<article><div class="kicker">'+esc(kickerOf(a))+'</div><h2>'+esc(a.t)+'</h2>'+detailHTML(a,{print:true})+'</article>';
  });
  h += '<div class="pr-foot">Tool credit: What If AI and The Register, Lewis University Library. '+
    esc(TOOL_LICENSE.scope)+' are licensed '+esc(TOOL_LICENSE.label)+' ('+esc(TOOL_LICENSE.url)+'). '+
    esc(TOOL_LICENSE.exceptions)+' Retain each entry’s own attribution, license, and change notices.</div>';
  root.innerHTML = h;
  var dr = document.getElementById('savedDrawer'); if(dr && dr.open) closeDialog(dr);
  document.body.classList.add('print-saved');
  /* the print copy is hidden from assistive technology on screen, but a saved PDF needs its headings
     and reading order, so it is exposed while printing (as the Register walkthrough's print is) */
  root.removeAttribute('aria-hidden');
  var done = function(){ document.body.classList.remove('print-saved'); root.setAttribute('aria-hidden','true'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(function(){ window.print(); setTimeout(done, 1500); }, 60);
}

/* ─────────── wiring ─────────── */
function init(ctx){
  CTX = ctx || CTX;
  var ad = document.getElementById('actDialog'), sd = document.getElementById('savedDrawer');
  if(ad) wireDialog(ad);
  if(sd) wireDialog(sd);
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.closest('[data-give-feedback]')){
      var feedback = ad.querySelector('.activity-feedback');
      if(feedback){
        var input = feedback.querySelector('.activity-feedback__main input:checked') || feedback.querySelector('.activity-feedback__main input');
        input.focus({preventScroll:true});
        var body = ad.querySelector('.dlg__body'), zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
        body.scrollTop += (feedback.getBoundingClientRect().top - body.getBoundingClientRect().top) / zoom;
      }
      return;
    }
    var sv = t.closest('button[data-save]');
    if(sv){
      var id = sv.getAttribute('data-save'), a = BYID[id];
      var on = Saved.toggle(id);
      announce((on ? 'Saved: ' : 'Removed from saved: ') + (a ? a.t : id) + '. ' +
        Saved.ids().length + ' saved use-case idea'+(Saved.ids().length===1?'':'s') + '.');
      return;
    }
    var op = t.closest('[data-open]');
    if(op){ e.preventDefault(); openActivity(op.getAttribute('data-open'), op); return; }
    var un = t.closest('[data-unsave]');
    if(un){
      var uid = un.getAttribute('data-unsave'), ua = BYID[uid];
      Saved.remove(uid); announce('Removed from saved: ' + (ua ? ua.t : uid) + '.');
      var first = document.querySelector('#savedBody [data-unsave], #savedDrawer [data-close]'); if(first) first.focus();
      return;
    }
    if(t.closest('[data-open-saved]')){ renderSaved(); openDialog(sd, t.closest('[data-open-saved]')); return; }
    if(t.closest('#printSaved')){ printSaved(); return; }
    if(t.closest('#clearSaved')){ var c=document.getElementById('clearConfirm'); if(c){ c.hidden=false; document.getElementById('clearYes').focus(); } return; }
    if(t.closest('#clearNo')){ var c2=document.getElementById('clearConfirm'); if(c2) c2.hidden=true; var cs=document.getElementById('clearSaved'); if(cs) cs.focus(); return; }
    if(t.closest('#clearYes')){ Saved.clear(); announce('All saved use-case ideas removed.'); var cl=sd.querySelector('[data-close]'); if(cl) cl.focus(); return; }
    var cp = t.closest('[data-copy-act]');
    if(cp){ copyText(location.href.split('#')[0]+'#act='+encodeURIComponent(cp.getAttribute('data-copy-act')), 'Link to this use-case idea copied.'); return; }
  });
  Saved.onChange(syncSaveUI);
  syncSaveUI();
  [].forEach.call(document.querySelectorAll('.current'), function(el, i){
    el.style.setProperty('--cur-dur', (15 + Math.random()*16).toFixed(1) + 's');
    el.style.setProperty('--cur-delay', (2 + i*3.5 + Math.random()*9).toFixed(1) + 's');
  });
  /* the footer's "Updated" date is written at build time from the latest reviewed data stage */
}
function copyText(text, okMsg){
  function fallback(){ announce('Copying is not available here. The address is: ' + text); }
  try{
    navigator.clipboard.writeText(text).then(function(){ announce(okMsg || 'Copied.'); }, fallback);
  }catch(_){ fallback(); }
}

window.SITE = {D:D, A:A, IN:IN, BYID:BYID, ALIAS:ALIAS, L:L, ORIGIN:ORIGIN, TIER:TIER, tierOf:tierOf, OPERATOR:OPERATOR, operatorLabel:operatorLabel, noToolForStudents:noToolForStudents, usedItems:usedItems, esc:esc, pretty:pretty, G:G, icon:icon, fieldTags:fieldTags,
  taskLabel:taskLabel, depthLabel:depthLabel, discLabel:discLabel, lvlLabel:lvlLabel, modLabel:modLabel, familyLabel:familyLabel,
  cardHTML:cardHTML, detailHTML:detailHTML, openActivity:openActivity, openDialog:openDialog, closeDialog:closeDialog, wireDialog:wireDialog, resetDialogScroll:resetDialogScroll,
  Saved:Saved, announce:announce, decode:decode, printSaved:printSaved, copyText:copyText, howItWorks:howItWorks, init:init, kickerOf:kickerOf};
})();
