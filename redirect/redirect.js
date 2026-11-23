/* Quidsima and The Register moved from /What-If-AI/ to /Quidsima/. Each page here sends its address to the
 * matching one there, keeping the query and the part after "#", so shared results and links to one use-case idea
 * still open the same thing. Unknown addresses (served through 404.html) go to the same file name at the new site. */
(function () {
  var NEW_SITE = 'https://lewis-u-lib.github.io/Quidsima/';
  var RENAMED = { 'what-if-ai.html': 'quidsima.html' };
  var KNOWN = { '': 1, 'index.html': 1, 'quidsima.html': 1, 'register.html': 1, 'source-file.html': 1 };
  function target(loc) {
    var rest = loc.pathname.replace(/^\/What-If-AI\/?/i, '');
    var file = rest.split('/').pop();
    file = RENAMED[file] || file;
    if (!Object.prototype.hasOwnProperty.call(KNOWN, file)) file = '';
    return NEW_SITE + file + loc.search + loc.hash;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = target; return; }
  var to = target(window.location);
  var link = document.getElementById('moved-link');
  if (link) { link.href = to; link.textContent = to.replace(/[?#].*$/, ''); }
  window.location.replace(to);
})();
