/* ── LibGuide context links ──────────────────────────────────────────────
   Restored from the previous edition of the Reference page. A concept the
   Library already has a page about becomes a link to that page, so a reader
   who wants the background can leave for it and come back.

   Three properties the naive version does not have:
   · it runs over ALREADY-ESCAPED text, never over raw HTML, so a match can
     never straddle a tag or inject one;
   · every pattern is matched against the ORIGINAL string and the anchors are
     assembled in one pass at the end, so a later pattern cannot match inside
     an earlier pattern's href or title attribute;
   · overlapping matches are resolved in favour of the longer one, and each
     guide page is linked at most once per block, so a word repeated through a
     paragraph does not produce a row of identical links. */
var linkifyGuide = (function () {
  var L = null;
  function load() {
    /* data arrives through boot.js (window.SITE_DATA), fetched from data/guide.<hash>.json */
    var raw = (window.SITE_DATA && window.SITE_DATA.guide) || [];
    return raw.map(function (g) {
      var f = g.flags || '';
      if (f.indexOf('g') < 0) f += 'g';
      try { return { re: new RegExp(g.pattern, f), url: g.url, label: g.label }; }
      catch (_) { return null; }
    }).filter(Boolean);
  }
  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  return function (escaped) {
    if (L === null) L = load();
    if (!escaped || !L.length) return escaped || '';
    var s = String(escaped), hits = [], i, g, m;
    for (i = 0; i < L.length; i++) {
      g = L[i]; g.re.lastIndex = 0;
      while ((m = g.re.exec(s)) !== null) {
        if (m[0].length) hits.push({ a: m.index, b: m.index + m[0].length, url: g.url, label: g.label });
        if (g.re.lastIndex === m.index) g.re.lastIndex++;   /* zero-width guard */
      }
    }
    if (!hits.length) return s;
    /* longest first so an overlap keeps the more specific phrase */
    hits.sort(function (x, y) { return (y.b - y.a) - (x.b - x.a) || x.a - y.a; });
    var taken = [], seen = {};
    for (i = 0; i < hits.length; i++) {
      var h = hits[i], clash = false;
      if (seen[h.url]) continue;
      for (var j = 0; j < taken.length; j++) {
        if (h.a < taken[j].b && taken[j].a < h.b) { clash = true; break; }
      }
      /* never open a link inside an entity such as &amp; or &#39; */
      if (!clash && /&[a-z#0-9]*$/i.test(s.slice(0, h.a))) clash = true;
      if (clash) continue;
      taken.push(h); seen[h.url] = 1;
    }
    taken.sort(function (x, y) { return x.a - y.a; });
    var out = '', at = 0;
    for (i = 0; i < taken.length; i++) {
      var t = taken[i];
      out += s.slice(at, t.a) +
        '<a href="' + esc(t.url) + '" class="guide-link" target="_blank" rel="noopener" title="' +
        esc(t.label) + '">' + s.slice(t.a, t.b) + '</a>';
      at = t.b;
    }
    return out + s.slice(at);
  };
})();

/* Same thing for a string that already carries intentional markup (a <b>, an
   <a> the author wrote). Only the text between tags is offered to the linkifier,
   and anything inside an existing anchor is left alone, so a hand-written link is
   never nested inside a generated one. */
function linkifyGuideHTML(html) {
  if (!html) return '';
  var parts = String(html).split(/(<[^>]*>)/), depth = 0, out = '';
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i];
    if (t.charAt(0) === '<') {
      if (/^<a[\s>]/i.test(t)) depth++;
      else if (/^<\/a\s*>/i.test(t)) depth = Math.max(0, depth - 1);
      out += t;
    } else {
      out += depth ? t : linkifyGuide(t);
    }
  }
  return out;
}
