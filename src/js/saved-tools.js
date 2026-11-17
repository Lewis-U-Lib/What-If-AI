/* ════════════════════════════════════════════════════════════
   SAVED TOOLS · compare, move, and export
   Three things a reader can do with use-case ideas after finding them. Everything runs in this
   browser: nothing here sends a saved list, a comparison, or an export anywhere.

   · Compare two or three saved use-case ideas side by side, by purpose, participants, preparation,
     access requirements, human judgment, and the route without AI. Each cell quotes the record;
     where a record says nothing, the cell says "Not stated" and nothing is inferred.
   · Download the saved list as a small file and restore it in another browser. No account.
   · Copy one use-case idea as text, or download it as a Word document. The text is the record's
     own, reproduced as written (detailHTML's planning summary), and always carries the source,
     license, attribution, and change notes.

   src/js/shared.js calls in through window.SITE_TOOLS and works without this file.
════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var S_ = window.SITE, D = S_.D, L = S_.L, BYID = S_.BYID, ALIAS = S_.ALIAS, esc = S_.esc, num = S_.num, Saved = S_.Saved;
var NOT = 'Not stated';
function act(id){ return BYID[id] || BYID[ALIAS[id]] || null; }
function today(){ return new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'}); }
function stamp(){ var d = new Date(), z = function(n){ return (n<10?'0':'')+n; }; return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }
function recordURL(a){ return location.href.split('#')[0].replace(/[^\/]*$/, '') + 'register.html#act=' + encodeURIComponent(a.id); }

/* ─────────── compare ─────────── */
var MAX = 3;
var picked = [];                       /* ids ticked for comparison, in the order ticked */
function pickedIds(){
  var saved = Saved.ids();
  picked = picked.filter(function(id){ return saved.indexOf(id) >= 0 && act(id); });
  return picked.slice();
}
function compareBarHTML(){
  var n = pickedIds().length, ready = n >= 2 && n <= MAX;
  return '<div class="saved-tools"><button type="button" class="btn btn--sm" id="compareSaved" aria-disabled="'+(ready?'false':'true')+'">Compare selected'+(n?' ('+n+')':'')+'</button>'+
    '<p class="saved-tools__hint" id="compareHint">'+(ready ? 'Opens the selected use-case ideas side by side.' : 'Tick <strong>Compare</strong> on two or three use-case ideas to see them side by side.')+'</p></div>';
}
function compareCheckHTML(a){
  return '<label class="check saved-item__cmp"><input type="checkbox" data-compare="'+esc(a.id)+'"'+(picked.indexOf(a.id)>=0?' checked':'')+'> Compare<span class="sr-only"> '+esc(a.t)+'</span></label>';
}
/* what each aspect draws on: the record's own fields, under the labels the details use */
function facets(a){
  var policy = (D.pol||{})[a.pol];
  var noTool = a.op==='none' || (!a.op && (a.cap||[]).indexOf('none_required')>=0);
  var also = L.pc[a.pc] ? (a.pc==='none' && a.eq==='no_tool_needed' && a.op==='faculty_or_staff' ? 'Instructor account and approval requirements need checking' : L.pc[a.pc]) : '';
  var gateLabel = a.ac==='student' ? (a.ar==='withheld' ? 'What students produce' : 'What students produce that the tool did not') : 'The judgment that stays with you';
  return [
    ['Purpose', [
      ['Area of work', (L.focus[a.focus]||S_.pretty(a.focus))+' · '+S_.labelList((a.task||[]).map(function(t){ return S_.taskLabel(t, a.focus); }))],
      ['What is produced', a.dl || NOT],
      ['Reflection or assessment', a.rf || '']]],
    ['Participants', [
      ['Who does it', L.actor[a.ac] || S_.pretty(a.ac)],
      ['Scale', S_.scaleText(a)],
      ['Level', S_.labelList((a.lvl||[]).map(S_.lvlLabel), ', ') || NOT],
      ['Setting', S_.labelList((a.mod||[]).map(S_.modLabel), ', ') || NOT],
      ['Who uses an AI tool', S_.OPERATOR[a.op] ? S_.OPERATOR[a.op].text : NOT]]],
    ['Preparation', [
      ['AI tool needed', S_.labelList((a.cap||[]).map(function(c){ return L.capLong[c] || S_.pretty(c); })) || NOT],
      ['What it depends on the AI tool for', a.dep || ''],
      ['Data', S_.sensitive(a) ? 'Involves putting '+L.sen[a.sen]+' into '+S_.dataTool(a)+'.' : ''],
      ['Disclosure built into the design', a.dis && L.dis[a.dis] && a.dis!=='none_required' ? L.dis[a.dis] : ''],
      ['Course AI policy it assumes', policy ? policy.pill+' — '+policy.label : NOT]]],
    ['Access requirements', [
      ['Cost and access', a.eq && a.eq!=='not_specified' ? S_.costLabel(a) : NOT],
      ['Also required', also],
      ['Source item', S_.sourceAccess(a) ? L.sa[a.sa] : '']]],
    ['Human judgment', [
      ['How the work is divided', S_.howItWorks(a) || NOT],
      [gateLabel, a.gate || ''],
      ['What the output is checked against', a.chk || '']]],
    ['A route without AI', [
      ['', typeof a.na==='string' && a.na.trim() ? a.na : noTool ? 'This use-case idea runs without any AI tool.' :
        a.op==='optional' ? 'The use-case idea as described is complete without an AI tool; the AI step it mentions is optional.' : 'The record describes no route without AI.']]]
  ];
}
function cellHTML(pairs){
  var shown = pairs.filter(function(p){ return p[1]; });
  if(!shown.length) return '<p>'+NOT+'</p>';
  if(shown.every(function(p){ return !p[0]; })) return shown.map(function(p){ return '<p>'+esc(p[1])+'</p>'; }).join('');   /* a list needs terms */
  return '<dl class="cmp__dl">'+shown.map(function(p){ return (p[0] ? '<dt>'+esc(p[0])+'</dt>' : '')+'<dd>'+esc(p[1])+'</dd>'; }).join('')+'</dl>';
}
function compareTableHTML(ids, print){
  var list = ids.map(act).filter(Boolean), all = list.map(facets);
  var h = '<table class="cmp"><caption class="sr-only">'+list.length+' saved use-case ideas compared by purpose, participants, preparation, access requirements, human judgment, and the route without AI</caption>'+
    '<thead><tr><th scope="col" class="cmp__corner"><span class="sr-only">Aspect</span></th>'+list.map(function(a){
      return '<th scope="col"><span class="kicker">'+esc(S_.kickerOf(a))+'</span><span class="cmp__t">'+esc(a.t)+'</span>'+
        (print ? '' : '<button type="button" class="btn btn--sm" data-open="'+esc(a.id)+'">View details<span class="sr-only"> of '+esc(a.t)+'</span></button>')+'</th>';
    }).join('')+'</tr></thead><tbody>';
  all[0].forEach(function(row, r){
    h += '<tr><th scope="row">'+esc(row[0])+'</th>'+all.map(function(f){ return '<td>'+cellHTML(f[r][1])+'</td>'; }).join('')+'</tr>';
  });
  return h+'</tbody></table>';
}
function sourcesHTML(ids){
  return '<h2>Sources, licenses, and attribution</h2>'+ids.map(act).filter(Boolean).map(function(a){
    return '<section><h3>'+esc(a.t)+'</h3>'+(a.cit ? S_.lines(a.cit).map(function(c){ return '<p>'+esc(c)+'</p>'; }).join('') : '')+
      (S_.safeURL(a.url) ? '<p>'+esc(a.url)+'</p>' : '')+
      '<p>License: '+S_.licenseHTML(a.lic, a.licu, true)+'</p>'+
      (a.attr ? '<p>Attribution to keep when reusing: '+S_.lines(a.attr).map(esc).join(' ')+'</p>' : '')+'</section>';
  }).join('');
}
function openCompare(opener){
  var ids = pickedIds();
  if(ids.length < 2 || ids.length > MAX){ S_.announce('Tick Compare on two or three saved use-case ideas first.'); return; }
  var dlg = document.getElementById('compareDialog'); if(!dlg) return;
  document.getElementById('compareBody').innerHTML =
    '<p class="cmp-note">Each cell quotes the use-case idea’s record. “Not stated” means the record does not say; nothing is inferred.</p>'+
    '<div class="cmp-wrap" role="region" aria-labelledby="compareTitle" tabindex="0">'+compareTableHTML(ids)+'</div>';
  dlg.setAttribute('data-ids', ids.join(' '));
  S_.openDialog(dlg, opener);
}
function printCompare(){
  var dlg = document.getElementById('compareDialog'), ids = (dlg.getAttribute('data-ids')||'').split(' ').filter(act);
  if(ids.length < 2) return;
  S_.printHTML('<h1>Use-case ideas compared</h1><div class="pr-sub">'+S_.toolName()+' · Lewis University Library · printed '+esc(today())+'</div>'+
    '<p class="pr-note">Each cell quotes the use-case idea’s record. “Not stated” means the record does not say.</p>'+
    compareTableHTML(ids, true)+sourcesHTML(ids)+S_.printFooterHTML());
}

/* ─────────── move a saved list between browsers ─────────── */
var FORMAT = 'what-if-ai-saved-list', lastMessage = '';
function transferHTML(hasItems){
  return '<div class="transfer"><h3 class="transfer__h">Move this list to another browser</h3>'+
    '<p>'+(hasItems ? 'Download the list as a small file, then restore it in another browser or on another device. ' : 'If you downloaded a list of saved use-case ideas, restore it here. ')+
    'The file is read in this browser and is not uploaded anywhere. There is still no account.</p><div class="transfer__actions">'+
    (hasItems ? '<button type="button" class="btn btn--sm" id="downloadSaved">Download this list</button>' : '')+
    '<button type="button" class="btn btn--sm" id="restoreSaved">Restore a list from a file</button></div>'+
    '<p class="transfer__status" id="transferStatus" role="status">'+esc(lastMessage)+'</p></div>';
}
function saveBlob(name, blob){
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.hidden = true; document.body.appendChild(a); a.click();
  setTimeout(function(){ if(a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 4000);
}
function say(msg){
  lastMessage = msg;
  var box = document.getElementById('transferStatus'); if(box) box.textContent = msg;
  S_.announce(msg);
}
function listFile(){
  var ideas = Saved.ids().map(function(id){ var a = act(id); return {id: a ? a.id : id, title: a ? a.t : ''}; });
  var extra = window.SITE_TOOLS.fileExtra ? window.SITE_TOOLS.fileExtra() : null;      /* e.g. trial plans */
  var data = {format: FORMAT, version: 1, exported: new Date().toISOString(), from: 'What If AI and The Register, Lewis University Library', ideas: ideas};
  if(extra) Object.keys(extra).forEach(function(k){ data[k] = extra[k]; });
  return data;
}
function downloadList(){
  var data = listFile();
  saveBlob('saved-use-case-ideas-'+stamp()+'.json', new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  say('Downloaded a list of '+num(data.ideas.length)+' saved use-case idea'+(data.ideas.length===1?'':'s')+'. Restore it from Saved use-case ideas in another browser.');
}
/* returns the message shown to the reader */
function restoreText(text){
  var data;
  try { data = JSON.parse(text); } catch(_){ return 'That file could not be read. Choose a list downloaded from Saved use-case ideas.'; }
  if(!data || data.format !== FORMAT || !Array.isArray(data.ideas)) return 'That file is not a list of saved use-case ideas from this site.';
  var added = 0, already = 0, gone = 0;
  data.ideas.slice(0, 2000).forEach(function(x){
    var id = typeof x==='string' ? x : (x && typeof x.id==='string' ? x.id : ''), a = id && act(id);
    if(!a){ gone++; return; }
    if(Saved.has(a.id)){ already++; return; }
    Saved.add(a.id); added++;
  });
  if(window.SITE_TOOLS.fileRestore) window.SITE_TOOLS.fileRestore(data);
  var parts = ['Added '+num(added)+' use-case idea'+(added===1?'':'s')+' from the file.'];
  if(already) parts.push(num(already)+(already===1?' was':' were')+' already saved.');
  if(gone) parts.push(num(gone)+(gone===1?' is':' are')+' no longer in the collection and '+(gone===1?'was':'were')+' left out.');
  if(!Saved.isPersistent()) parts.push('Browser storage is unavailable, so this list is temporary in this tab.');
  return parts.join(' ');
}
function restoreFile(file){
  if(!file) return;
  if(file.size > 2e6){ say('That file is too large to be a list of saved use-case ideas.'); return; }
  var reader = new FileReader();
  reader.onload = function(){ lastMessage = restoreText(String(reader.result||'')); S_.renderSaved(); say(lastMessage); var b = document.getElementById('restoreSaved'); if(b) b.focus(); };
  reader.onerror = function(){ say('That file could not be read.'); };
  reader.readAsText(file);
}

/* ─────────── one use-case idea as text or as a Word document ─────────── */
function copyLabel(a){ return a.focus==='teaching' ? 'Copy as assignment text' : 'Copy as text'; }
function exportHTML(a){
  return '<section class="takeaway no-print" aria-labelledby="takeawayTitle"><h3 id="takeawayTitle">Copy or export this use-case idea</h3>'+
    '<p>Take the use-case idea into an assignment sheet, a syllabus, or a planning document. The text is the record’s own, reproduced as written, and it carries the source, license, attribution, and change notes with it.</p>'+
    '<div class="takeaway__actions"><button type="button" class="btn btn--sm" data-copy-text="'+esc(a.id)+'">'+copyLabel(a)+'</button>'+
    '<button type="button" class="btn btn--sm" data-export-docx="'+esc(a.id)+'">Download as a Word document</button></div>'+
    '<p class="meta-line">License for this use-case idea: '+esc(a.lic || NOT)+'. Keep its attribution when you reuse it, and follow the license if you change the text. '+
    'Adaptation notes, what the source reports, and the list of works stay in the full details and the printout.</p>'+
    '<p class="takeaway__status" role="status"></p></section>';
}
/* the planning summary of the record as a flat list of blocks: {k: title|meta|h2|h3|p|fact|li|small, t, label} */
function blocks(a){
  var doc = new DOMParser().parseFromString(S_.detailHTML(a, {print:true, brief:true}), 'text/html');
  var out = [{k:'title', t:a.t}, {k:'meta', t:[S_.kickerOf(a), L.focus[a.focus]||''].filter(Boolean).join(' · ')}];
  function text(el){ return el.textContent.replace(/\s+/g, ' ').trim(); }
  function walk(el){
    [].forEach.call(el.children, function(c){
      var tag = c.tagName, cls = c.classList;
      if(tag==='SECTION' || (tag==='DIV' && cls.contains('detail'))) walk(c);
      else if(tag==='H3') out.push({k:'h2', t:text(c)});
      else if(tag==='H4') out.push({k:'h3', t:text(c)});
      else if(tag==='DL'){
        var label = '';
        [].forEach.call(c.children, function(x){ if(x.tagName==='DT') label = text(x); else if(x.tagName==='DD'){ out.push({k:'fact', label:label, t:text(x)}); label = ''; } });
      }
      else if(tag==='UL' || tag==='OL') [].forEach.call(c.children, function(li){ out.push({k:'li', t:text(li)}); });
      else if(tag==='DIV' && cls.contains('cite-block') && c.querySelector('p')) [].forEach.call(c.children, function(x){ if(text(x)) out.push({k:'p', t:text(x)}); });
      else if(text(c)) out.push({k: cls.contains('meta-line') ? 'small' : 'p', t:text(c)});
    });
  }
  walk(doc.body);
  out.push({k:'small', t:'Exported from What If AI and The Register, Lewis University Library, on '+today()+'. The text is reproduced from the record as written. '+
    'The complete record, with adaptation notes, what the source reports, and the works it draws on: '+recordURL(a)});
  return out;
}
function asText(a){
  return blocks(a).map(function(b){
    if(b.k==='title') return b.t+'\n';
    if(b.k==='meta') return b.t+'\n';
    if(b.k==='h2') return '\n'+b.t.toUpperCase()+'\n';
    if(b.k==='h3') return '\n'+b.t+'\n';
    if(b.k==='fact') return (b.label ? b.label+': ' : '')+b.t+'\n';
    if(b.k==='li') return '- '+b.t+'\n';
    return (b.k==='small' ? '\n' : '')+b.t+'\n';
  }).join('').replace(/\n{3,}/g, '\n\n').trim()+'\n';
}
function status(btn, msg){
  var box = btn && btn.closest('.takeaway') ? btn.closest('.takeaway').querySelector('.takeaway__status') : null;
  if(box) box.textContent = msg;
  S_.announce(msg);
  return box;
}
function copyIdea(id, btn){
  var a = act(id); if(!a) return;
  var text = asText(a), ok = function(){ status(btn, 'Copied “'+a.t+'” as text, with its source, license, and attribution.'); };
  var fallback = function(){
    var box = status(btn, 'Copying is not available here. The text is selected below; copy it from there.');
    if(!box) return;
    var area = document.createElement('textarea');
    area.className = 'takeaway__text'; area.readOnly = true; area.rows = 10; area.value = text; area.setAttribute('aria-label', 'Text of this use-case idea');
    box.parentNode.insertBefore(area, box.nextSibling); area.focus(); area.select();
  };
  try { navigator.clipboard.writeText(text).then(ok, fallback); } catch(_){ fallback(); }
}

/* a .docx is a ZIP of XML parts. This writes one with stored (uncompressed) entries. */
var CRC = (function(){ var t = [], c, n, k; for(n=0;n<256;n++){ c=n; for(k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(bytes){ var c = 0xFFFFFFFF; for(var i=0;i<bytes.length;i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; }
function zip(files){
  var enc = new TextEncoder(), chunks = [], central = [], offset = 0, d = new Date();
  var time = (d.getHours()<<11) | (d.getMinutes()<<5) | (d.getSeconds()>>1), date = ((d.getFullYear()-1980)<<9) | ((d.getMonth()+1)<<5) | d.getDate();
  function local(name, crc, size){
    var buf = new Uint8Array(30 + name.length), v = new DataView(buf.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true); v.setUint16(10, time, true); v.setUint16(12, date, true);
    v.setUint32(14, crc, true); v.setUint32(18, size, true); v.setUint32(22, size, true); v.setUint16(26, name.length, true); v.setUint16(28, 0, true);
    buf.set(name, 30);
    return buf;
  }
  files.forEach(function(f){
    var name = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
    var head = local(name, crc, data.length);
    chunks.push(head, data);
    var c = new Uint8Array(46 + name.length), v = new DataView(c.buffer);
    v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true);
    v.setUint16(12, time, true); v.setUint16(14, date, true); v.setUint32(16, crc, true); v.setUint32(20, data.length, true); v.setUint32(24, data.length, true);
    v.setUint16(28, name.length, true); v.setUint32(42, offset, true); c.set(name, 46);
    central.push(c);
    offset += head.length + data.length;
  });
  var size = central.reduce(function(n, c){ return n + c.length; }, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, size, true); ev.setUint32(16, offset, true);
  return new Blob(chunks.concat(central, [end]), {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function x(s){ return String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function run(t, bold){ return '<w:r>'+(bold?'<w:rPr><w:b/></w:rPr>':'')+'<w:t xml:space="preserve">'+x(t)+'</w:t></w:r>'; }
function para(style, runs){ return '<w:p>'+(style?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'')+runs+'</w:p>'; }
var STYLE = {title:'Title', meta:'Subtitle', h2:'Heading1', h3:'Heading2', small:'Small', li:'ListItem'};
function docxBlob(a){
  var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"', head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var body = blocks(a).map(function(b){
    if(b.k==='fact') return para('', (b.label ? run(b.label+': ', true) : '')+run(b.t));
    if(b.k==='li') return para(STYLE.li, run('• '+b.t));
    return para(STYLE[b.k]||'', run(b.t));
  }).join('');
  function style(id, name, ppr, rpr, based){
    return '<w:style w:type="paragraph" w:styleId="'+id+'"'+(id==='Normal'?' w:default="1"':'')+'><w:name w:val="'+name+'"/>'+(based?'<w:basedOn w:val="Normal"/>':'')+
      (id==='Heading1'||id==='Heading2'?'<w:next w:val="Normal"/>':'')+'<w:qFormat/>'+(ppr?'<w:pPr>'+ppr+'</w:pPr>':'')+(rpr?'<w:rPr>'+rpr+'</w:rPr>':'')+'</w:style>';
  }
  var styles = head+'<w:styles '+W+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>'+
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    style('Normal','Normal','','')+
    style('Title','Title','<w:spacing w:after="60"/>','<w:b/><w:sz w:val="40"/><w:szCs w:val="40"/>',true)+
    style('Subtitle','Subtitle','<w:spacing w:after="240"/>','<w:color w:val="595959"/>',true)+
    style('Heading1','heading 1','<w:keepNext/><w:spacing w:before="280" w:after="80"/><w:outlineLvl w:val="0"/>','<w:b/><w:sz w:val="28"/><w:szCs w:val="28"/>',true)+
    style('Heading2','heading 2','<w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="1"/>','<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/>',true)+
    style('ListItem','List Item','<w:ind w:left="360" w:hanging="240"/>','',true)+
    style('Small','Small','<w:spacing w:before="120"/>','<w:color w:val="595959"/><w:sz w:val="18"/><w:szCs w:val="18"/>',true)+'</w:styles>';
  return zip([
    ['[Content_Types].xml', head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
    ['_rels/.rels', head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/_rels/document.xml.rels', head+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['word/styles.xml', styles],
    ['word/document.xml', head+'<w:document '+W+'><w:body>'+body+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>']
  ]);
}
function fileName(a){ return (a.t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'use-case-idea') + '.docx'; }
function exportDocx(id, btn){
  var a = act(id); if(!a) return;
  saveBlob(fileName(a), docxBlob(a));
  status(btn, 'Downloaded “'+a.t+'” as a Word document, with its source, license, and attribution.');
}

/* ─────────── wiring ─────────── */
function init(){
  var cmp = document.getElementById('compareDialog'); if(cmp) S_.wireDialog(cmp);
  var input = document.getElementById('restoreFile');
  if(input) input.addEventListener('change', function(){ restoreFile(input.files && input.files[0]); input.value = ''; });
  document.addEventListener('change', function(e){
    var box = e.target && e.target.matches && e.target.matches('input[data-compare]') ? e.target : null; if(!box) return;
    var id = box.getAttribute('data-compare');
    if(box.checked){
      if(pickedIds().length >= MAX){ box.checked = false; S_.announce('Compare up to three use-case ideas at a time. Untick one to choose another.'); return; }
      if(picked.indexOf(id) < 0) picked.push(id);
    } else picked = picked.filter(function(v){ return v !== id; });
    var n = pickedIds().length, btn = document.getElementById('compareSaved'), hint = document.getElementById('compareHint');
    if(btn){ btn.setAttribute('aria-disabled', n>=2 && n<=MAX ? 'false' : 'true'); btn.textContent = 'Compare selected'+(n?' ('+n+')':''); }
    if(hint) hint.innerHTML = n>=2 ? 'Opens the selected use-case ideas side by side.' : 'Tick <strong>Compare</strong> on two or three use-case ideas to see them side by side.';
  });
}
/* called first by the page's click handler; returns true when the click was one of these controls */
function click(e){
  var t = e.target, b;
  if((b = t.closest('#compareSaved'))){ openCompare(b); return true; }
  if(t.closest('#printCompare')){ printCompare(); return true; }
  if(t.closest('#downloadSaved')){ downloadList(); return true; }
  if(t.closest('#restoreSaved')){ var input = document.getElementById('restoreFile'); if(input) input.click(); return true; }
  if((b = t.closest('[data-copy-text]'))){ copyIdea(b.getAttribute('data-copy-text'), b); return true; }
  if((b = t.closest('[data-export-docx]'))){ exportDocx(b.getAttribute('data-export-docx'), b); return true; }
  if(t.closest('[data-export-jump]')){
    var dlg = document.getElementById('actDialog'), block = dlg && dlg.querySelector('.takeaway');
    if(block){
      var body = getComputedStyle(dlg).overflowY==='auto' ? dlg : dlg.querySelector('.dlg__body'), zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
      body.scrollTop += (block.getBoundingClientRect().top - body.getBoundingClientRect().top) / zoom;
      block.querySelector('button').focus({preventScroll:true});
    }
    return true;
  }
  return false;
}

window.SITE_TOOLS = {init:init, click:click, compareBarHTML:compareBarHTML, compareCheckHTML:compareCheckHTML, transferHTML:transferHTML, exportHTML:exportHTML,
  /* for tests and for the trial plan (src/js/trial-plan.js) */
  facets:facets, blocks:blocks, asText:asText, docxBlob:docxBlob, listFile:listFile, restoreText:restoreText, saveBlob:saveBlob, act:act, para:para, run:run, zip:zip};
})();
