/* Recognize explicit CC labels without assigning a license to ambiguous rights statements.
   Artwork is version-neutral; the original label and exact deed carry the version. */
(function(root){
'use strict';
var families = ['by','by-sa','by-nd','by-nc','by-nc-sa','by-nc-nd','zero'];
function identify(label){
  var s = String(label || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g,'-');
  var direct = /^https?:\/\/creativecommons\.org\/(?:licenses\/(by(?:-nc)?(?:-sa|-nd)?)\/([1-4]\.0|2\.5)(?:\/(igo|us))?\/?|publicdomain\/(zero)\/(1\.0)\/?)(?:deed(?:\.[a-z-]+)?)?$/.exec(s);
  if(direct) return {family:direct[1] || direct[4], url:s.replace(/^http:/,'https:')};
  // Only a leading license declaration qualifies. A site-footer mention inside a
  // longer rights statement must never turn an unlicensed item into a CC item.
  s = s.replace(/^["\u201c]+/,'').replace(/^license:\s*/, '')
    .replace(/^this work is licensed under (?:the |a )?/, '')
    .replace(/^creative commons\s+/, 'cc ')
    .replace(/^(cc\s+)?attribution/, 'cc by')
    .replace(/non[ -]?commercial/g,'nc').replace(/share[ -]?alike/g,'sa')
    .replace(/no[ -]?derivatives/g,'nd');
  var match = /^cc[ -]*(by(?:[ -]+nc)?(?:[ -]+(?:sa|nd))?|0)\b/.exec(s);
  if(!match) return null;
  var family = match[1]==='0' ? 'zero' : match[1].replace(/[ -]+/g,'-');
  if(families.indexOf(family)<0) return null;
  var tail = s.slice(match[0].length);
  // Do not silently accept an unsupported combination or version.
  if(/^[ -]*(?:nc|sa|nd)\b/.test(tail)) return null;
  var versions = tail.match(/\b\d+\.\d+\b/g) || [];
  if(versions.some(function(v){ return v!==versions[0]; })) return null;
  var version = versions[0] || '';
  var url = '';
  if(version && !/version not stated|jurisdiction differently/.test(tail)){
    if(family==='zero' && version==='1.0') url = 'https://creativecommons.org/publicdomain/zero/1.0/';
    if(family!=='zero' && /^(?:[1-4]\.0|2\.5)$/.test(version)){
      var jurisdiction = /\bigo\b/.test(tail) ? 'igo/' : /\bunited states\b/.test(tail) ? 'us/' : '';
      url = 'https://creativecommons.org/licenses/'+family+'/'+version+'/'+jurisdiction;
    }
  }
  return {family:family, url:url};
}
var api = {identify:identify};
if(typeof module!=='undefined' && module.exports) module.exports = api;
else root.LicenseBadges = api;
})(typeof window!=='undefined' ? window : this);
