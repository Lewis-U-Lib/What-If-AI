/* ════════════════════════════════════════════════════════════
   BOOT · loads a page's data, then its scripts, in order.
   The page carries a manifest (<script id="site-manifest" type="application/json">) that
   the build writes: fingerprinted data files and scripts. The data is fetched in
   parallel; once all of it has arrived it is exposed as window.SITE_DATA and the scripts
   run one after another, exactly as the inline scripts of the single-file pages did.
   If anything fails, the loading message becomes an explanation and a way to retry.
   ES5 + fetch/Promise, no dependencies.
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var man = JSON.parse(document.getElementById('site-manifest').textContent);
var main = document.getElementById('main');
var msg = document.getElementById('boot-msg');
if(main) main.setAttribute('aria-busy', 'true');

function getJSON(url){
  return fetch(url, {credentials: 'same-origin'}).then(function(r){
    if(!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  });
}
function runScript(src){
  return new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = function(){ resolve(); };
    s.onerror = function(){ reject(new Error('script ' + src)); };
    document.body.appendChild(s);
  });
}
function fail(err){
  if(window.console) console.error('[boot]', err);
  if(main) main.removeAttribute('aria-busy');
  if(!msg) return;
  var local = location.protocol === 'file:';
  msg.className = 'boot-msg boot-msg--error';
  msg.setAttribute('role', 'alert');
  msg.innerHTML = '<strong>The activities could not be loaded.</strong> ' +
    (local ? 'This page reads its data over the web. Open it from the site, or run a local server (see README).'
           : 'Check your connection and try again.') +
    ' <button type="button" class="btn btn--sm" id="boot-retry">Try again</button>';
  var b = document.getElementById('boot-retry');
  if(b) b.addEventListener('click', function(){ location.reload(); });
}

var keys = Object.keys(man.data || {});
Promise.all(keys.map(function(k){ return getJSON(man.data[k]); }))
  .then(function(values){
    var d = {};
    keys.forEach(function(k, i){ d[k] = values[i]; });
    window.SITE_DATA = d;
    return (man.scripts || []).reduce(function(p, src){ return p.then(function(){ return runScript(src); }); }, Promise.resolve());
  })
  .then(function(){
    if(msg && msg.parentNode) msg.parentNode.removeChild(msg);
    if(main) main.removeAttribute('aria-busy');
    document.documentElement.setAttribute('data-ready', '');
  })
  .catch(fail);
})();
