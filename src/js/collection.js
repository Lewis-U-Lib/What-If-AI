/* Saved ideas are a browser-local list. Collection files carry identifiers, never a second catalog. */
(function () {
  'use strict';
  const S = window.SITE, E = window.IdeaExport, esc = S.esc;
  const compare = new Set();
  const format = 'what-if-ai-collection';
  const maxFile = TrialPlan.maxBytes;
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
  function ideaBlocks(a, includePlan) {
    const blocks = E.blocks(a, entryURL(a.id));
    return includePlan ? blocks.concat(TrialPlan.blocks(S.Saved.plan(a.id))) : blocks;
  }
  function word(ids) {
    const list = ids.map(lookup).filter(Boolean);
    if (!list.length) { S.announce('No available ideas to export.'); return; }
    download(IdeaWord.documentBlob(list.flatMap(a => ideaBlocks(a,true))),
      list.length === 1 ? 'what-if-ai-' + list[0].id + '.docx' : 'what-if-ai-ideas.docx');
  }
  function shareHTML(a) {
    return '<details class="idea-export no-print"><summary>Copy or export this idea</summary>' +
      (E.noDerivatives(a) ? '<p>' + esc(E.note) + '</p>' : '') +
      (S.Saved.plan(a.id) ? '<label class="compare-choice"><input type="checkbox" data-copy-plan> Include my trial notes in the copied text</label>' : '') +
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
      const actions = item.querySelector('.saved-item__a');
      actions.prepend(label);
      const plan = document.createElement('button');
      plan.type = 'button'; plan.className = 'btn btn--sm'; plan.dataset.planIdea = id;
      plan.textContent = 'Plan a small trial';
      actions.appendChild(plan);
    }
    if (items.length) {
      box.insertAdjacentHTML('afterbegin','<div class="saved-actions"><button type="button" class="btn btn--sm" data-compare-ideas>Compare ideas</button>' +
        '<span data-compare-count aria-live="polite"></span></div>');
      refreshCompare();
    }
    box.insertAdjacentHTML('beforeend','<section class="collection-files"><h3>Take your collection with you</h3>' +
      '<p>Your download includes saved ideas and your trial notes. Removing an idea keeps its notes for the next time you save it. Restore a file to add ideas and plans from another browser.</p>' +
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
  function canonical(id) { return Object.hasOwn(S.ALIAS,id) ? S.ALIAS[id] : id; }
  function validate(input) {
    if (!input || input.format !== format || input.version !== 1 || !Array.isArray(input.saved) || input.saved.length > 3000)
      throw Error('Choose a What If AI collection file (version 1).');
    const saved = new Set();
    for (const id of input.saved) {
      if (!TrialPlan.validId(id)) throw Error('An idea identifier in this file is invalid.');
      saved.add(canonical(id));
    }
    const plans = TrialPlan.planMap(input.plans === undefined ? {} : input.plans,canonical);
    TrialPlan.checkSize(Array.from(saved),plans);
    return TrialPlan.file(Array.from(saved),plans);
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
      const planIds = Object.keys(incoming.plans), existing = planIds.filter(id => S.Saved.plan(id)).length;
      pending = incoming;
      box.innerHTML = '<p>' + incoming.saved.length + ' saved ideas and ' + planIds.length + ' trial plans in this file. ' +
        (existing ? existing + ' existing local plans will be kept. ' : '') +
        (missing ? missing + ' unavailable IDs will be kept. ' : '') +
        'Your current collection will be kept.</p><button class="btn btn--sm" type="button" data-restore-confirm>Add to my collection</button>' +
        ' <button type="button" class="btn btn--sm" data-restore-cancel>Cancel</button>';
    } catch (error) {
      if (box.isConnected && pending === token) {box.textContent = error.message; pending = null;}
    } finally {input.value = '';}
  }
  function restore() {
    if (!pending || !pending.saved) return;
    let stored;
    try { stored = S.Saved.restore(pending); }
    catch (error) {document.querySelector('[data-restore-preview]').textContent = error.message; return;}
    const msg = stored ? 'Collection restored in this browser.' : 'Collection restored for this tab. Download a copy to keep it.';
    const status = document.querySelector('[data-restore-preview]'); if (status) status.textContent = msg;
    S.announce(msg);
  }
  function briefHTML(a) {
    // sum is also the full opening narrative. Use it as published and omit secondary sections in this format.
    if (E.noDerivatives(a)) return S.detailHTML(a,{print:true});
    return '<p>' + esc(a.sum) + '</p>' +
      '<dl class="facts">' + E.comparison(a,S).map(([label,value]) => '<dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>').join('') + '</dl>' +
      '<h3>Sources and attribution</h3>' + [a.cr,a.cit,a.loc,a.url,a.lic,a.licu,a.lics,a.licn,a.attr,a.chg,entryURL(a.id)].filter(Boolean)
        .map(line => '<p class="export-line">' + esc(line) + '</p>').join('');
  }
  function trialPrint(id) {
    const blocks = TrialPlan.blocks(S.Saved.plan(id));
    if (!blocks.length) return '';
    return '<section class="trial-print">' + blocks.map(block => {
      const tag = block.style === 'Heading1' ? 'h3' : block.style === 'Heading2' ? 'h4' : 'p';
      return '<' + tag + '>' + esc(block.text) + '</' + tag + '>';
    }).join('') + '</section>';
  }
  function openTrial(id,button) {
    const a = lookup(id), dlg = document.getElementById('trialDialog'), plan = S.Saved.plan(id) || {};
    if (!a) return;
    dlg.dataset.idea = id;
    dlg.querySelector('[data-trial-idea]').textContent = a.t;
    const route = dlg.querySelector('[data-trial-route]');
    const alternative = a.na || (a.op === 'none' ? 'This idea already runs without anyone using an AI tool.' :
      a.op === 'optional' ? 'The idea is complete without the optional AI step.' : '');
    route.hidden = !alternative; route.open = false;
    route.querySelector('p').textContent = alternative + (a.na ? ' Check the costs, materials, and permissions for this route separately.' : '');
    dlg.querySelector('.trial-fields').innerHTML = TrialPlan.questions.map(([field,prompt]) =>
      '<label for="trial-' + field + '">' + esc(prompt) + '</label><textarea id="trial-' + field +
        '" data-trial-field="' + field + '" rows="3" maxlength="5000"></textarea>').join('');
    for (const input of dlg.querySelectorAll('[data-trial-field]')) input.value = plan[input.dataset.trialField] || '';
    dlg.querySelector('[data-trial-state]').textContent = S.Saved.isPersistent() ? '' : 'Edits stay in this tab. Download your notes before leaving.';
    S.openDialog(dlg,button);
  }
  document.addEventListener('input', e => {
    const input = e.target;
    if (!input.matches('[data-trial-field]')) return;
    const dlg = input.closest('dialog'), status = dlg.querySelector('[data-trial-state]');
    try {
      const saved = S.Saved.editAnswer(dlg.dataset.idea,input.dataset.trialField,input.value);
      const msg = saved ? 'Saved in this browser.' : 'Saved in this tab. Download your notes before leaving.';
      if (status.textContent !== msg) status.textContent = msg;
    } catch (error) {status.textContent = 'This edit has not been saved. ' + error.message;}
  });
  window.addEventListener('storage', e => {
    if (e.key !== 'lul-whatifai-saved-v1' && e.key !== null) return;
    const dlg = document.getElementById('trialDialog');
    if (!dlg || !dlg.open || !S.Saved.isPersistent()) return;
    const plan = S.Saved.plan(dlg.dataset.idea) || {};
    for (const input of dlg.querySelectorAll('[data-trial-field]')) {
      const text = plan[input.dataset.trialField] || '';
      if (input.value !== text) input.value = text;
    }
  });
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
    if (b.hasAttribute('data-plan-idea')) openTrial(b.dataset.planIdea,b);
    if (b.hasAttribute('data-trial-word')) word([b.closest('dialog').dataset.idea]);
    if (b.hasAttribute('data-compare-ideas')) showComparison(b);
    if (b.hasAttribute('data-word')) word(b.dataset.word ? [b.dataset.word] : S.Saved.ids());
    if (b.hasAttribute('data-assignment')) {
      const a = lookup(b.dataset.assignment);
      S.copyText(E.text(ideaBlocks(a,!!b.closest('.idea-export').querySelector('[data-copy-plan]:checked'))), 'Idea and attribution copied.', b, 'Text to copy');
    }
    if (b.hasAttribute('data-collection-download'))
      download(new Blob([JSON.stringify(S.Saved.snapshot(),null,2) + '\n'],{type:'application/json'}), 'what-if-ai-collection.json');
    if (b.hasAttribute('data-restore-confirm')) restore();
    if (b.hasAttribute('data-restore-cancel')) {pending=null; document.querySelector('[data-restore-preview]').textContent='Restore cancelled.';}
  });
  window.IdeaCollection = {shareHTML, addControls, briefHTML, trialPrint};
})();
