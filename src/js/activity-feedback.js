/* Optional activity feedback, shared by both tools. No names, contact details,
 * free text or visitor identifiers. A local receipt prevents repeat submissions;
 * a changed response is a separate update event, not another first response. */
(function(){
'use strict';
var KEY = 'lul-whatifai-feedback-v1', memory = {}, pending = {};
var RESPONSES = [
  ['exploring', 'Just exploring'],
  ['considering', 'Considering using or adapting it'],
  ['planning', 'Planning to use or adapt it'],
  ['used', 'Already used or adapted it'],
  ['not_fit', 'Not a fit for my needs']
];
var OUTCOMES = [['worked_well','Worked well'], ['mixed','Mixed results'], ['did_not_work','Didn’t work well']];
var REASONS = [['unclear','Unclear instructions'], ['time','Time required'], ['relevance','Not relevant to my needs'],
  ['access','Cost or access'], ['ai_concerns','Concerns about AI use'], ['other','Something else']];
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function allowed(list, value){ return list.some(function(row){ return row[0] === value; }); }
function clean(value){
  if(!value || !allowed(RESPONSES, value.response)) return null;
  return {response:value.response,
    outcome:value.response === 'used' && allowed(OUTCOMES, value.outcome) ? value.outcome : '',
    reason:value.response === 'not_fit' && allowed(REASONS, value.reason) ? value.reason : ''};
}
function receipt(id){
  if(memory[id]) return clean(memory[id]);
  try {
    var stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return clean(stored && stored[id]);
  } catch(_){ return null; }
}
window.addEventListener('storage', function(event){ if(event.key === KEY || event.key === null) memory = {}; });
function remember(id, value){
  memory[id] = value;
  try {
    var stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    if(!stored || typeof stored !== 'object' || Array.isArray(stored)) stored = {};
    stored[id] = value;
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch(_){ /* storage unavailable: keep the receipt for this page only */ }
}
function same(a, b){ return !!a && !!b && a.response === b.response && a.outcome === b.outcome && a.reason === b.reason; }
function radios(name, rows, selected){
  return '<div class="activity-feedback__choices">' + rows.map(function(row){
    return '<label class="activity-feedback__choice"><input type="radio" name="'+name+'" value="'+row[0]+'"'+
      (selected === row[0] ? ' checked' : '')+'><span>'+row[1]+'</span></label>';
  }).join('') + '</div>';
}
function render(id, surface){
  var saved = (pending[id] && pending[id].value) || receipt(id) || {};
  return '<form class="activity-feedback no-print" data-activity="'+esc(id)+'" data-surface="'+esc(surface)+'" aria-labelledby="activity-feedback-title">'+
    '<div class="activity-feedback__heading"><h3 id="activity-feedback-title">Share your experience</h3><span class="kicker">Optional</span></div>'+
    '<p class="activity-feedback__note" id="activity-feedback-privacy">Help us improve the collection. No name or email collected.</p>'+
    '<fieldset class="activity-feedback__main" aria-describedby="activity-feedback-privacy"><legend>Where are you with this activity?</legend>'+
    radios('activity-response', RESPONSES, saved.response)+'</fieldset>'+
    '<fieldset class="activity-feedback__followup" data-followup="used" hidden><legend>How did it go? <span>(Optional)</span></legend>'+
    radios('activity-outcome', OUTCOMES, saved.outcome)+'<button type="button" class="btn btn--sm btn--quiet" data-clear-followup>Clear optional answer</button></fieldset>'+
    '<fieldset class="activity-feedback__followup" data-followup="not_fit" hidden><legend>What was the main reason? <span>(Optional)</span></legend>'+
    radios('activity-reason', REASONS, saved.reason)+'<button type="button" class="btn btn--sm btn--quiet" data-clear-followup>Clear optional answer</button></fieldset>'+
    '<div class="activity-feedback__actions"><button type="submit" class="btn btn--sm btn--primary" disabled>Send feedback</button>'+
    '<p class="activity-feedback__status" role="status" aria-live="polite" aria-atomic="true"></p></div></form>';
}
function selection(form){
  function value(name){ var input = form.querySelector('input[name="'+name+'"]:checked'); return input ? input.value : ''; }
  return clean({response:value('activity-response'), outcome:value('activity-outcome'), reason:value('activity-reason')});
}
function status(form, text){ form.querySelector('.activity-feedback__status').textContent = text; }
function refresh(form){
  var id = form.getAttribute('data-activity'), value = selection(form), saved = receipt(id), busy = !!pending[id];
  [].forEach.call(form.querySelectorAll('[data-followup]'), function(group){
    var shown = !!value && value.response === group.getAttribute('data-followup');
    group.hidden = !shown;
    group.disabled = !shown || busy;
    if(!shown) [].forEach.call(group.querySelectorAll('input'), function(input){ input.checked = false; });
  });
  form.querySelector('.activity-feedback__main').disabled = busy;
  var button = form.querySelector('[type="submit"]');
  button.disabled = busy || !value || same(value, saved);
  button.textContent = busy ? 'Sending…' : saved ? 'Update feedback' : 'Send feedback';
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
}
function mount(form){
  refresh(form);
  var id = form.getAttribute('data-activity');
  if(pending[id]) status(form, 'Sending your feedback…');
  else if(receipt(id)) status(form, 'Your previous response is shown. You can update it whenever you like.');
}
function tracker(){
  var script = document.querySelector('script[data-website-id][data-host-url]');
  if(!script || !window.umami || typeof window.umami.track !== 'function') throw new Error('unavailable');
  var domains = (script.getAttribute('data-domains') || '').split(',').map(function(d){ return d.trim(); });
  if(domains.indexOf(location.hostname) < 0 || script.getAttribute('data-auto-track') === 'false') throw new Error('excluded');
  var optedOut = false;
  try { optedOut = !!localStorage.getItem('umami.disabled'); } catch(_){}
  var dnt = window.doNotTrack || navigator.doNotTrack || navigator.msDoNotTrack;
  if(optedOut || (script.getAttribute('data-do-not-track') === 'true' && /^(1|yes)$/.test(String(dnt)))) throw new Error('excluded');
  return script;
}
function send(id, surface, value, previous){
  var script;
  try { script = tracker(); } catch(error){ return Promise.reject(error); }
  var website = script.getAttribute('data-website-id');
  var data = {activity_id:id, response:value.response, surface:surface};
  if(value.outcome) data.outcome = value.outcome;
  if(value.reason) data.reason = value.reason;
  if(previous) data.previous_response = previous.response;
  var payload = {website:website, hostname:location.hostname, url:location.pathname,
    title:document.title, language:navigator.language, screen:screen.width+'x'+screen.height,
    referrer:'', tag:script.getAttribute('data-tag'),
    name:previous ? 'activity-feedback-updated' : 'activity-feedback', data:data};
  var headers = {'Content-Type':'application/json', 'x-umami-website-id':website, 'x-umami-hostname':location.hostname};
  if(typeof window.umami.getSession === 'function'){
    var session = window.umami.getSession();
    if(session && session.cache) headers['x-umami-cache'] = session.cache;
  }
  // The tracker intentionally swallows network failures. Use its configured intake
  // endpoint for this explicit form so a success message requires an acknowledgment.
  // Keep the same domain/opt-out guards; never route around a blocked tracker.
  var controller = new AbortController();
  var timeout = setTimeout(function(){ controller.abort(); }, 12000);
  return fetch(script.getAttribute('data-host-url').replace(/\/$/, '')+'/api/send', {
    method:'POST', credentials:'omit', headers:headers, signal:controller.signal,
    body:JSON.stringify({type:'event', payload:payload})
  }).then(function(response){
    if(!response.ok) throw new Error('unavailable');
    return response.json();
  }).then(function(reply){
    var accepted = reply && ((typeof reply.cache === 'string' && reply.cache.length > 0) ||
      (typeof reply.sessionId === 'string' && reply.sessionId.length > 0));
    if(!accepted || reply.disabled || reply.error) throw new Error('unavailable');
  }).then(function(){ clearTimeout(timeout); }, function(error){ clearTimeout(timeout); throw error; });
}
function currentForm(id){
  var form = document.querySelector('#actDialog .activity-feedback');
  return form && form.getAttribute('data-activity') === id ? form : null;
}
document.addEventListener('change', function(event){
  var form = event.target.closest('.activity-feedback'); if(!form) return;
  refresh(form);
  status(form, same(selection(form), receipt(form.getAttribute('data-activity'))) ? 'This response has already been sent.' : '');
});
document.addEventListener('click', function(event){
  var button = event.target.closest('[data-clear-followup]'); if(!button) return;
  var form = button.closest('.activity-feedback'); if(!form) return;
  [].forEach.call(button.closest('fieldset').querySelectorAll('input'), function(input){ input.checked = false; });
  refresh(form); status(form, 'Optional answer cleared.');
});
document.addEventListener('submit', function(event){
  var form = event.target.closest('.activity-feedback'); if(!form) return;
  event.preventDefault();
  var id = form.getAttribute('data-activity'), value = selection(form), previous = receipt(id);
  if(!value || pending[id] || same(value, previous)) return;
  pending[id] = {value:value}; refresh(form); status(form, 'Sending your feedback…');
  Promise.resolve().then(function(){ return send(id, form.getAttribute('data-surface'), value, previous); }).then(function(){
    remember(id, value); delete pending[id];
    var active = currentForm(id);
    if(active){ refresh(active); status(active, 'Thank you—your feedback was sent. You can update it later.'); }
  }, function(){
    delete pending[id];
    var active = currentForm(id);
    if(active){ refresh(active); status(active, 'Your feedback couldn’t be sent right now. Please try again later.'); }
  });
});
window.ActivityFeedback = {render:render, mount:mount};
})();
