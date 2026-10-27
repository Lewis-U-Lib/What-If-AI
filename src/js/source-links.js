/* Shared, explicit source-link decisions. No requests, redirects or file loading. */
(function(root){
'use strict';
function safe(value){
  if(typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return '';
  try {
    var u = new URL(value);
    return /^(https?:)$/.test(u.protocol) && u.hostname && !u.username && !u.password ? u.href : '';
  } catch(_) { return ''; }
}
function key(value){ return safe(value).split('#')[0]; }
function create(data){
  var index = Object.create(null);
  (data.entries || []).forEach(function(e){
    e.urls.forEach(function(u){ index[key(u)] = e; });
  });
  function lookup(value){ return index[key(value)] || null; }
  function file(value){
    var e = lookup(value);
    if(!e || e.kind === 'page') return '';
    // DOI aliases use the recorded original file; source page fragments stay on that file.
    return key(value) === key(e.urls[0]) ? safe(value) : safe(e.urls[0]);
  }
  return {lookup:lookup, file:file, noticeURL:function(value){
    var u = file(value);
    return u ? 'source-file.html#' + encodeURIComponent(u) : '';
  }};
}
var api = {safe:safe, key:key, create:create};
if(typeof module === 'object' && module.exports) module.exports = api;
else root.SourceLinks = api;
})(typeof window === 'undefined' ? this : window);
