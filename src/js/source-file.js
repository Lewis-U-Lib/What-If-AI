(function(){
'use strict';
var policy = window.SourceLinks.create(window.SITE_DATA['source-links']);
var body = document.getElementById('file-details');
function render(){
  body.textContent = '';
  var url = '';
  try { url = decodeURIComponent(location.hash.slice(1)); } catch(_) {}
  var e = policy.lookup(url), file = policy.file(url);
  if(!e || !file){
    body.textContent = 'This file link is not recognized. Return to the source in What If AI or The Register.';
    return;
  }
  function text(tag, value){
    var node = document.createElement(tag);
    node.textContent = value; body.appendChild(node); return node;
  }
  function link(url, label){
    var a = document.createElement('a');
    a.href = url; a.textContent = label; a.target = '_blank';
    a.rel = 'noopener noreferrer'; a.className = 'btn';
    text('p','').appendChild(a);
  }
  text('h2', e.title);
  text('p','Opening this source may download a file instead of displaying it in your browser. The source website and your browser settings control what happens.');
  text('p','The source file has not been opened. Continue only if you are comfortable with a possible download.');
  text('p','Source host: ' + new URL(file).hostname);
  var address = text('p',file); address.className = 'source-file-address';
  if(e.page){
    link(window.SourceLinks.safe(e.page), 'Open source webpage (new tab)');
    if(e.note) text('p', e.note);
  }
  link(file, (e.kind === 'pdf' ? 'Open PDF' : 'Open source file') + ' — may download (new tab)');
}
render();
window.addEventListener('hashchange',render);
})();
