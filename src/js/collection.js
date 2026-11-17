/* Saved ideas are a browser-local list. Collection files carry identifiers, never a second catalog. */
(function () {
  'use strict';
  const S = window.SITE, E = window.IdeaExport, esc = S.esc;
  const compare = new Set();
  const format = 'what-if-ai-collection';
  const maxFile = 2000000;
  let pending = null;
  function lookup(id) { return Object.hasOwn(S.BYID, id) ? S.BYID[id] : undefined; }
  function entryURL(id) {
    const canonical = document.querySelector('link[rel="canonical"]').href;
    return new URL('register.html#act=' + encodeURIComponent(id), canonical).href;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function ideaBlocks(a) { return E.blocks(a, entryURL(a.id)); }
  function word(ids) {
    const list = ids.map(lookup).filter(Boolean);
    if (!list.length) { S.announce('No available ideas to export.'); return; }
    download(IdeaWord.documentBlob(list.flatMap(ideaBlocks)),
      list.length === 1 ? 'what-if-ai-' + list[0].id + '.docx' : 'what-if-ai-ideas.docx');
  }
  function shareHTML(a) {
    return '<details class="idea-export no-print"><summary>Copy or export this idea</summary>' +
      (E.noDerivatives(a) ? '<p>' + esc(E.note) + '</p>' : '') +
      '<div class="saved-actions"><button type="button" class="btn btn--sm" data-assignment="' + esc(a.id) + '">' +
      (E.noDerivatives(a) ? 'Copy verbatim text' : 'Copy as assignment text') +
      '</button><button type="button" class="btn btn--sm" data-word="' + esc(a.id) + '">Download Word document</button></div></details>';
  }
  function refreshCompare() {
    const button = document.querySelector('[data-compare-ideas]');
    if (button) button.disabled = compare.size < 2;
    const count = document.querySelector('[data-compare-count]');
    if (count) count.textContent = compare.size + ' selected. Choose two or three.';
  }
  function addControls(box) {
    pending = null;
    for (const id of compare) if (!S.Saved.has(id)) compare.delete(id);
    const items = box.querySelectorAll('.saved-item [data-open]');
    for (const view of items) {
      const id = view.dataset.open, item = view.closest('.saved-item'), label = document.createElement('label');
      label.className = 'compare-choice';
      label.innerHTML = '<input type="checkbox" data-compare-id="' + esc(id) + '"' + (compare.has(id) ? ' checked' : '') +
        '> Compare<span class="sr-only"> ' + esc(lookup(id).t) + '</span>';
      item.querySelector('.saved-item__a').prepend(label);
    }
    if (items.length) {
      box.insertAdjacentHTML('afterbegin','<div class="saved-actions"><button type="button" class="btn btn--sm" data-compare-ideas>Compare ideas</button>' +
        '<span data-compare-count aria-live="polite"></span></div>');
      refreshCompare();
    }
    box.insertAdjacentHTML('beforeend','<section class="collection-files"><h3>Take your collection with you</h3>' +
      '<p>Download a collection file and restore it in another browser. Restoring adds ideas to your existing list.</p>' +
      '<div class="saved-actions"><button class="btn btn--sm" type="button" data-collection-download>Download collection</button>' +
      '<label class="btn btn--sm collection-input">Restore collection<input type="file" accept=".json,application/json" data-collection-file></label></div>' +
      '<div data-restore-preview role="status"></div></section>');
  }
  function showComparison(button) {
    if (compare.size < 2 || compare.size > 3) return;
    const dlg = document.getElementById('compareDialog'), records = Array.from(compare,lookup);
    const values = records.map(a => E.comparison(a,S));
    dlg.querySelector('tbody').innerHTML = values[0].map(([label], i) =>
      '<tr><th scope="row">' + esc(label) + '</th>' + values.map(fields => '<td>' + esc(fields[i][1]) + '</td>').join('') + '</tr>').join('');
    dlg.querySelector('thead').innerHTML = '<tr><th scope="col">Consideration</th>' +
      records.map(a => '<th scope="col">' + esc(a.t) + '</th>').join('') + '</tr>';
    S.openDialog(dlg,button);
  }
  function collection() { return {format, version:1, saved:S.Saved.ids(), plans:{}}; }
  function validate(input) {
    if (!input || input.format !== format || input.version !== 1 || !Array.isArray(input.saved) || input.saved.length > 3000)
      throw Error('Choose a What If AI collection file (version 1).');
    const saved = new Set();
    for (const id of input.saved) {
      if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id) || ['constructor','prototype','__proto__'].includes(id))
        throw Error('An idea identifier in this file is invalid.');
      saved.add(Object.hasOwn(S.ALIAS,id) ? S.ALIAS[id] : id);
    }
    if (input.plans && Object.keys(input.plans).length) throw Error('This file includes trial notes. Use a version of the site that supports trial plans to restore it.');
    return {format,version:1,saved:Array.from(saved),plans:{}};
  }
  async function preview(input) {
    const box = document.querySelector('[data-restore-preview]'), file = input.files[0];
    // Selecting another file or reopening the drawer invalidates the earlier read.
    const token = {}; pending = token;
    if (!file) return;
    try {
      if (file.size > maxFile) throw Error('Choose a collection file smaller than 2 MB.');
      const raw = await file.text();
      if (!box.isConnected || pending !== token) return;
      let data;
      try { data = JSON.parse(raw); } catch (_) { throw Error('This file does not contain a valid JSON collection.'); }
      const incoming = validate(data);
      const missing = incoming.saved.filter(id => !lookup(id)).length;
      pending = incoming;
      box.innerHTML = '<p>' + incoming.saved.length + ' saved ideas in this file. ' +
        (missing ? missing + ' unavailable IDs will be kept. ' : '') +
        'Your current collection will be kept.</p><button class="btn btn--sm" type="button" data-restore-confirm>Add to my collection</button>' +
        ' <button type="button" class="btn btn--sm" data-restore-cancel>Cancel</button>';
    } catch (error) {
      if (box.isConnected && pending === token) {box.textContent = error.message; pending = null;}
    } finally {input.value = '';}
  }
  function restore() {
    if (!pending || !pending.saved) return;
    const ids = Array.from(new Set([...S.Saved.ids(), ...pending.saved]));
    if (ids.length > 3000) { S.announce('The combined collection is too large.'); return; }
    const stored = S.Saved.replace(ids);
    const msg = stored ? 'Collection restored in this browser.' : 'Collection restored for this tab. Download a copy to keep it.';
    const status = document.querySelector('[data-restore-preview]'); if (status) status.textContent = msg;
    S.announce(msg);
  }
  function briefHTML(a) {
    // sum is also the full opening narrative. Use it as published and omit secondary sections in this format.
    return '<p>' + esc(a.sum) + '</p>' + (E.noDerivatives(a) ? '<p>' + esc(E.note) + '</p>' : '') +
      '<dl class="facts">' + E.comparison(a,S).map(([label,value]) => '<dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>').join('') + '</dl>' +
      '<h3>Sources and attribution</h3>' + [a.cr,a.cit,a.loc,a.url,a.lic,a.licu,a.lics,a.licn,a.attr,a.chg,entryURL(a.id)].filter(Boolean)
        .map(line => '<p class="export-line">' + esc(line) + '</p>').join('');
  }
  document.addEventListener('change', e => {
    if (e.target.matches('[data-collection-file]')) {preview(e.target); return;}
    if (!e.target.matches('[data-compare-id]')) return;
    const id = e.target.dataset.compareId;
    if (!e.target.checked) compare.delete(id);
    else if (compare.size < 3) compare.add(id);
    else {e.target.checked = false; S.announce('Choose up to three ideas. Uncheck one to compare another.');}
    refreshCompare();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-compare-ideas')) showComparison(b);
    if (b.hasAttribute('data-word')) word(b.dataset.word ? [b.dataset.word] : S.Saved.ids());
    if (b.hasAttribute('data-assignment')) {
      const a = lookup(b.dataset.assignment);
      S.copyText(E.text(ideaBlocks(a)), 'Idea and attribution copied.', b, 'Text to copy');
    }
    if (b.hasAttribute('data-collection-download'))
      download(new Blob([JSON.stringify(collection(),null,2) + '\n'],{type:'application/json'}), 'what-if-ai-collection.json');
    if (b.hasAttribute('data-restore-confirm')) restore();
    if (b.hasAttribute('data-restore-cancel')) {pending=null; document.querySelector('[data-restore-preview]').textContent='Restore cancelled.';}
  });
  window.IdeaCollection = {shareHTML, addControls, briefHTML};
})();
