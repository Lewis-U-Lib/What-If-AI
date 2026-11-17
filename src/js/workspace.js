/* Faculty workspace shared by the Finder and Register. Plans stay on this device. */
(function(){
  'use strict';
  var S=window.SITE, W=window.WorkspaceData, esc=S.esc, KEY='lul-whatifai-trials-v1';
  var cache=null, persistent=true, selected=[], pending=null;
  var labels={goal:'What am I trying to improve?',trial:'What will I try?',responsibility:'What remains my responsibility?',preparation:'What preparation will this require?',verification:'What will I check, and against what?',success:'What would indicate that it helped?',reconsider:'When would I revise or abandon this approach?',alternative:'How would a route without AI compare?',duration:'Activity duration',prepEffort:'Preparation effort',checkEffort:'Verification effort',effortBasis:'Basis for these estimates',reviewDate:'When will I review the trial?'};
  function canonical(id){return S.ALIAS[id] || id;}
  function activity(id){return S.BYID[canonical(id)]||null;}
  function read(){
    if(cache)return cache;
    try{
      var raw=JSON.parse(localStorage.getItem(KEY)||'{}');
      cache=W.collection({format:'what-if-ai-collection',version:1,saved:[],plans:raw},canonical).plans;
    }catch(_){cache=Object.create(null);persistent=false;}
    return cache;
  }
  function write(plans){
    cache=plans;
    try{var text=JSON.stringify(plans);localStorage.setItem(KEY,text);persistent=localStorage.getItem(KEY)===text;}catch(_){persistent=false;}
    return persistent;
  }
  function snapshot(){return W.collection({format:'what-if-ai-collection',version:1,saved:S.Saved.ids(),plans:read()});}
  function planFor(id){return read()[canonical(id)]||null;}
  function localMessage(){return persistent && S.Saved.isPersistent()?'Saved in this browser. Download a collection to keep a backup.':'Temporary in this tab: browser storage is unavailable. Download the collection before leaving.';}
  function row(k,v){return '<dt>'+esc(k)+'</dt><dd>'+esc(v||'Unknown — check before planning')+'</dd>';}
  function reviewSource(label,value,print){
    if(!value||!/^https?:\/\//i.test(value))return '';
    return print?row(label,value):'<dt>'+esc(label)+'</dt><dd><a href="'+esc(value)+'" target="_blank" rel="noopener noreferrer">'+esc(value)+'<span class="sr-only"> (opens in a new tab)</span></a></dd>';
  }
  function judgment(value,labels,fallback){return value?(labels[value.kind]||'Not assessed')+'. '+value.note:fallback;}
  function review(a){return (window.SITE_DATA.editorial||{entries:{}}).entries[a.id]||{};}
  function effort(a){return review(a).effort||{};}
  function context(a){
    var e=effort(a);
    return '<dl class="facts">'+row('Activity scale',S.depthLabel(a.depth))+row('Activity duration',e.duration)+row('Preparation effort',e.preparation)+row('Verification effort',e.verification)+row('Estimate basis',e.basis||'No reviewed time estimate is published. Activity scale is not a preparation estimate.')+'</dl>';
  }
  function reviewHTML(a,print){
    var r=review(a), title='Relevance, review, and effort';
    var body='<p>Matching compares recorded attributes with your choices. It does not establish educational effectiveness.</p>'+
      '<dl class="facts">'+row('Disciplinary fit',judgment(r.relevance,{ready:'Ready for the stated discipline and setting',transferable:'Transferable method; adaptation required',unclear:'Relevance remains unclear'},a.disc==='interdisciplinary'?'Tagged for any course. This may be a transferable method; check subject knowledge, materials, and adaptation before using it in your field.':'Check the description and adaptation notes for your specific setting.'))+
      reviewSource('Relevance source',r.relevance && r.relevance.source,print)+
      row('Editorial review',r.reviewer?'Reviewed by '+r.reviewer+' on '+r.checkedOn+'. '+(r.scope||''):'No structured review record published yet. Existing source and limitation notes remain part of this entry.')+
      row('Reported use',judgment(r.use,{reported:'A specific report of use is documented',not_assessed:'Not separately assessed'},'Not independently assessed in a structured review record. A source may describe use; see its report and limitations.'))+
      reviewSource('Reported-use source',r.use && r.use.source,print)+
      row('Outcome evidence',judgment(r.evidence,{outcome_report:'A specific outcome claim has evidence to examine',not_assessed:'Not separately assessed'},'No separate outcome-evidence judgment is published here. A match, a source review, and a report of use are different claims.'))+
      reviewSource('Outcome-evidence source',r.evidence && r.evidence.source,print)+
      (r.uncertainty?row('Still uncertain',r.uncertainty):'')+'</dl>'+context(a);
    return print?'<section><h3>'+title+'</h3>'+body+'</section>':'<details class="use-case-accordion"><summary><h3>'+title+'</h3></summary><div class="use-case-accordion__body">'+body+'</div></details>';
  }
  function ensureDialog(id,title,wide){
    var d=document.getElementById(id);if(d)return d;
    d=document.createElement('dialog');d.id=id;d.className='dlg workspace-dialog'+(wide?' workspace-dialog--wide':'');
    d.setAttribute('aria-labelledby',id+'Title');
    d.innerHTML='<div class="dlg__head"><div><div class="kicker">Your working space</div><h2 id="'+id+'Title">'+esc(title)+'</h2></div><button type="button" class="dlg__close" data-close aria-label="Close '+esc(title.toLowerCase())+'">✕</button></div><div class="dlg__body"></div><div class="dlg__foot"><button type="button" class="btn btn--sm" data-close>Done</button></div>';
    document.body.appendChild(d);S.wireDialog(d);return d;
  }
  function openPlan(id,opener){
    var a=activity(id);if(!a)return;
    var d=ensureDialog('trialDialog','Plan a small trial'), p=planFor(a.id)||W.plan({});
    d.dataset.act=a.id;d.querySelector('h2').textContent='Plan a small trial';
    var h='<h3>'+esc(a.t)+'</h3><p>A working draft for your situation. No AI writes or assesses this plan. Avoid names, student work, or other sensitive information.</p><details><summary>Check the idea’s recorded requirements</summary>'+context(a)+'<p>'+esc(S.costLabel(a)||'Cost and access are not stated.')+'</p><p>'+esc(S.howItWorks(a))+'</p></details>';
    h+='<form id="trialForm"><div class="trial-fields">';
    W.fields.forEach(function(k){
      h+='<div class="trial-field"><label for="trial-'+k+'">'+esc(labels[k])+'</label>';
      if(k==='alternative')h+='<p class="field-help">'+esc(a.na||'No separate route is recorded. Describe an alternative you could compare.')+' Check this route’s requirements separately.</p>';
      if(k==='duration')h+='<p class="field-help">Separate participant time from your preparation and checking. Leave unknown estimates blank.</p>';
      if(k==='effortBasis')h+='<p class="field-help">For example: a source with a location, a previous trial, or your own provisional estimate. The site does not supply a time estimate.</p>';
      h+=(k==='reviewDate'?'<input type="date" id="trial-'+k+'" name="'+k+'" value="'+esc(p[k])+'"/>':'<textarea id="trial-'+k+'" name="'+k+'" rows="'+(/Effort|duration/.test(k)?2:3)+'" maxlength="5000">'+esc(p[k])+'</textarea>')+'</div>';
    });
    h+='</div><p id="trialState" class="workspace-state" role="status">'+esc(planFor(a.id)?localMessage():'Edits save automatically in this browser and add this idea to your saved collection.')+'</p></form><details class="trial-delete"><summary>Delete this trial plan</summary><p>This removes your notes for this idea from this browser. Download a backup first if you want to keep them.</p><button type="button" class="btn btn--sm" data-delete-trial>Delete trial notes</button></details>';
    d.querySelector('.dlg__body').innerHTML=h;
    d.querySelector('.dlg__foot').innerHTML='<button type="button" class="btn btn--sm" data-export-collection>Download collection</button><button type="button" class="btn btn--sm" data-print-trial="'+esc(a.id)+'">Print this trial</button><button type="button" class="btn btn--sm btn--primary" data-close>Done</button>';
    S.openDialog(d,opener);
  }
  function saveForm(){
    var d=document.getElementById('trialDialog'), p={};if(!d||!d.open)return;
    W.fields.forEach(function(k){p[k]=d.querySelector('[name="'+k+'"]').value;});
    p.updatedAt=new Date().toISOString();
    try{
      var plans=Object.assign(Object.create(null),read());plans[d.dataset.act]=W.plan(p);
      W.collection({format:'what-if-ai-collection',version:1,saved:S.Saved.ids(),plans:plans});
      write(plans);S.Saved.add(d.dataset.act);
      d.querySelector('#trialState').textContent=localMessage();
    }catch(e){d.querySelector('#trialState').textContent='These edits have not been saved: '+e.message;}
  }
  function toolsHTML(){return '<section class="collection-tools" aria-label="Collection transfer"><h3>Keep your working collection</h3><p>Saved ideas and trial notes stay in this browser. Downloads contain your notes as readable text. Store them somewhere appropriate.</p><div class="workspace-actions"><button type="button" class="btn btn--sm" data-export-collection>Download collection</button><label class="btn btn--sm import-label">Restore a collection<input type="file" accept=".json,application/json" data-import-collection aria-label="Choose a collection file to restore"/></label></div><div id="restorePreview" role="status"></div><p class="field-help">Restoring adds ideas and plans. If a trial already exists here, your current version is kept. Removing an idea from the saved list keeps its trial notes; downloads include those notes too.</p></section>';}
  function mountSaved(box){
    selected=selected.filter(function(id){return S.Saved.has(id)&&activity(id);});
    [].forEach.call(box.querySelectorAll('.saved-item'),function(item){
      var view=item.querySelector('[data-open]');if(!view)return;
      var id=view.dataset.open, a=activity(id), label=document.createElement('label');label.className='compare-choice';
      label.innerHTML='<input type="checkbox" data-compare-choice="'+esc(id)+'"'+(selected.indexOf(id)>=0?' checked':'')+'/> Compare<span class="sr-only"> '+esc(a.t)+'</span>';
      item.insertBefore(label,item.firstChild);
      var button=document.createElement('button');button.type='button';button.className='btn btn--sm';button.dataset.planTrial=id;button.textContent=planFor(id)?'Edit trial plan':'Plan a small trial';
      item.querySelector('.saved-item__a').appendChild(button);
    });
    var bar=document.createElement('div');bar.className='workspace-actions';bar.innerHTML='<button type="button" class="btn btn--sm btn--primary" data-compare-selected>Compare selected ideas</button><span id="compareHint">Select two or three ideas.</span>';
    if(box.querySelector('.saved-list'))box.insertBefore(bar,box.firstChild);
    box.insertAdjacentHTML('beforeend',toolsHTML());updateCompare();
    var foot=document.getElementById('savedFoot');
    if(foot&&!foot.querySelector('[data-print-brief]')){
      var b=document.createElement('button');b.type='button';b.className='btn btn--sm';b.dataset.printBrief='';b.textContent='Print brief plans';foot.insertBefore(b,foot.firstChild);
      var full=foot.querySelector('#printSaved');if(full)full.textContent='Print full references';
    }
    pending=null;
  }
  function updateCompare(){var b=document.querySelector('[data-compare-selected]');if(b)b.disabled=selected.length<2;var hint=document.getElementById('compareHint');if(hint)hint.textContent=selected.length+' selected. Choose two or three.';}
  function openCompare(opener){
    var acts=selected.map(activity).filter(Boolean);if(acts.length<2||acts.length>3)return;
    var d=ensureDialog('compareDialog','Compare ideas',true);
    var rows=[['Purpose',function(a){return (a.task||[]).map(function(t){return S.taskLabel(t,a.focus);}).join('; ');} ],['Participants',function(a){return (S.L.actor[a.ac]||'Not stated')+'; '+(a.sc||[]).map(function(k){return S.L.scale[k]||k;}).join(', ');}],['Activity scale',function(a){return S.depthLabel(a.depth);}],['Duration',function(a){return effort(a).duration||'Unknown — not a reviewed time estimate';}],['Preparation and checking',function(a){var e=effort(a);return 'Preparation: '+(e.preparation||'unknown')+'. Verification: '+(e.verification||'unknown')+'. Basis: '+(e.basis||'not recorded')+'.';}],['Access requirements',function(a){return (S.costLabel(a)||'Cost not stated')+'. '+(S.L.pc[a.pc]||'Accounts, equipment, and approvals need checking.')+(a.sa?' Source access: '+S.L.sa[a.sa]+'.':'');}],['Data',function(a){return S.L.sen[a.sen]?'Involves '+S.L.sen[a.sen]+'.':'Check the materials and data needed for your implementation.';}],['Human judgment',function(a){return a.gate||S.howItWorks(a)||'Not separately described';}],['Relevance',function(a){return review(a).relevance?review(a).relevance.note:(a.disc==='interdisciplinary'?'Broadly tagged; check subject-specific adaptation.':'Check the description against your setting.');}],['Route without AI',function(a){return a.na||'No separate route recorded.';}]];
    var h='<p>These are recorded descriptions, not scores or effectiveness rankings. Open the full details before choosing.</p><div class="compare-scroll" role="region" aria-label="Idea comparison table" tabindex="0"><table class="compare-table"><caption>Compare '+acts.length+' saved ideas</caption><thead><tr><th scope="col">Consideration</th>'+acts.map(function(a){return '<th scope="col">'+esc(a.t)+'</th>';}).join('')+'</tr></thead><tbody>';
    rows.forEach(function(r){h+='<tr><th scope="row">'+r[0]+'</th>'+acts.map(function(a){return '<td>'+esc(r[1](a))+'</td>';}).join('')+'</tr>';});
    h+='<tr><th scope="row">Next step</th>'+acts.map(function(a){return '<td><button type="button" class="btn btn--sm" data-open="'+esc(a.id)+'">Full details</button> <button type="button" class="btn btn--sm" data-plan-trial="'+esc(a.id)+'">Plan a trial</button></td>';}).join('')+'</tr></tbody></table></div>';
    d.querySelector('.dlg__body').innerHTML=h;S.openDialog(d,opener);
  }
  function download(){
    var data=snapshot();data.exportedAt=new Date().toISOString();data.release=window.SITE_DATA.acts.stamp||'';
    var blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download='what-if-ai-collection-'+data.exportedAt.slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
    S.announce('Collection download prepared, including saved ideas and trial notes.');
  }
  function previewImport(input){
    var file=input.files&&input.files[0], box=document.getElementById('restorePreview');pending=null;if(!file||!box)return;
    if(file.size>2000000){box.textContent='Choose a collection smaller than 2 MB.';input.value='';return;}
    var reader=new FileReader();reader.onload=function(){
      if(!document.contains(box))return;
      try{
        pending=W.parse(String(reader.result),canonical);var merge=W.merge(snapshot(),pending);
        var missing=pending.saved.filter(function(id){return !activity(id);}).length;
        box.innerHTML='<p>Ready to add '+pending.saved.length+' saved ideas and '+Object.keys(pending.plans).length+' trial plans. '+merge.kept+' existing trial plan(s) will be kept.'+(missing?' '+missing+' idea(s) are not in this release; their IDs and notes will be retained.':'')+'</p><button type="button" class="btn btn--sm btn--primary" data-confirm-restore>Add this collection</button> <button type="button" class="btn btn--sm" data-cancel-restore>Cancel</button>';
      }catch(e){box.textContent=e.message;pending=null;}
      input.value='';
    };reader.onerror=function(){box.textContent='The file could not be read. Nothing was restored.';input.value='';};reader.readAsText(file);
  }
  function restore(){
    if(!pending)return;var merged;
    try{merged=W.merge(snapshot(),pending);}catch(e){document.getElementById('restorePreview').textContent='Nothing was restored: '+e.message;pending=null;return;}
    var total=merged.collection.saved.length;
    write(merged.collection.plans);S.Saved.replace(merged.collection.saved);pending=null;
    var box=document.getElementById('restorePreview');if(box)box.textContent='Collection restored: '+total+' saved ideas. '+merged.kept+' existing trial plan(s) kept. '+localMessage();
    S.announce('Collection restored. '+localMessage());
  }
  function planPrint(id,blank){
    var p=planFor(id);if(!p&&!blank)return '';
    return '<section class="trial-print"><h3>Your small-trial plan</h3><p>Your planning notes, separate from the published idea. '+(p?'Last edited '+esc(p.updatedAt.slice(0,10))+'.':'No plan recorded yet.')+'</p><dl>'+W.fields.map(function(k){return row(labels[k],p&&p[k]||'Not recorded');}).join('')+'</dl></section>';
  }
  function briefHTML(ids){
    return '<h1>Small-trial planning sheets</h1><p>Brief planning presentation. Full descriptions and source information remain available in the full-reference printout and linked entries.</p>'+ids.map(function(id){var a=activity(id);return '<article><h2>'+esc(a.t)+'</h2><p>'+esc(S.kickerOf(a))+'</p>'+context(a)+planPrint(id,true)+'<h3>Reference and reuse</h3><p>'+esc(a.cit||'Source citation not stated')+'</p><p>'+esc(a.url||'')+'</p><p>'+S.licenseHTML(a.lic,a.licu,true)+'</p><p>'+esc(a.attr||'')+'</p><p>'+esc(a.chg||'')+'</p><p>Full entry: https://lewis-u-lib.github.io/What-If-AI/register.html#act='+encodeURIComponent(a.id)+'</p></article>';}).join('');
  }
  document.addEventListener('input',function(e){if(e.target.closest('#trialForm'))saveForm();});
  document.addEventListener('change',function(e){
    if(e.target.matches('[data-import-collection]'))previewImport(e.target);
    if(e.target.matches('[data-compare-choice]')){
      var id=e.target.dataset.compareChoice;
      if(e.target.checked&&selected.length>=3){e.target.checked=false;S.announce('Compare up to three ideas. Uncheck one to choose another.');return;}
      if(e.target.checked)selected.push(id);else selected=selected.filter(function(x){return x!==id;});updateCompare();
    }
  });
  document.addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;
    if(t.hasAttribute('data-plan-trial'))openPlan(t.dataset.planTrial,t);
    if(t.hasAttribute('data-compare-selected'))openCompare(t);
    if(t.hasAttribute('data-export-collection'))download();
    if(t.hasAttribute('data-confirm-restore'))restore();
    if(t.hasAttribute('data-cancel-restore')){pending=null;document.getElementById('restorePreview').textContent='Restore cancelled. Your collection has not changed.';}
    if(t.hasAttribute('data-print-brief'))S.printSaved(true);
    if(t.hasAttribute('data-print-trial'))S.printActivity(t.dataset.printTrial,true);
    if(t.hasAttribute('data-delete-trial')){var d=document.getElementById('trialDialog'), plans=read();delete plans[d.dataset.act];write(plans);S.closeDialog(d);S.announce('Trial notes deleted'+(persistent?'.':' in this tab only. Browser storage is unavailable; older notes may return.'));}
  });
  window.addEventListener('storage',function(e){
    if(e.key!==KEY&&e.key!==null)return;cache=null;read();
    var d=document.getElementById('trialDialog');
    if(d&&d.open){var p=planFor(d.dataset.act)||W.plan({});W.fields.forEach(function(k){d.querySelector('[name="'+k+'"]').value=p[k];});d.querySelector('#trialState').textContent='Trial notes changed in another tab. '+localMessage();}
  });
  window.FacultyWorkspace={mountSaved:mountSaved,reviewHTML:reviewHTML,planPrint:planPrint,briefHTML:briefHTML,planFor:planFor};
})();
