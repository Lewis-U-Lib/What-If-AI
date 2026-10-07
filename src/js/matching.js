/* Shared, pure matching rules. Missing evidence is never a confirmed requirement. */
(function(root, factory){
  var api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.FINDER_MATCH=api;
})(typeof window!=='undefined'?window:this, function(){
  'use strict';
  var KEYS=['task','disc','depth','lvl','mod'];
  var LIMITS=['noai','nostudent','nopaid','noaccount','nokit','nodisclose','noapproval'];
  var WEIGHTS={task:8,disc:4,depth:3,lvl:2,mod:1};
  function has(list,value){ return (list||[]).indexOf(value)>=0; }
  function admitted(a){ return a.icap!=='active' && a.icap!=='passive'; }
  function compare(a,key,value){
    if(!value) return 'unasked';
    var v=a[key];
    if(Array.isArray(v)?has(v,value):v===value) return 'exact';
    if((key==='lvl'||key==='mod') && has(v,'any')) return 'compatible';
    /* no field recorded, or recorded for any course ("interdisciplinary"): a possible fit for every field;
       a reader who picks Cross-curricular gets the exact match above */
    if(key==='disc' && (!v || v==='interdisciplinary')) return 'compatible';
    return 'mismatch';
  }
  function requirement(a,key){
    var v;
    /* noai reads "My students won't use an AI tool themselves". A stated route without AI always
       qualifies. Otherwise the reviewed operator decides: only students operating a tool rules an
       activity out, and a record that does not say who operates it is never a confirmed fit. */
    if(key==='noai'){
      if(a.na) return 'confirmed';
      v=a.op;
      if(v==='students') return 'excluded';
      return has(['faculty_or_staff','optional','none'],v)?'confirmed':'unknown';
    }
    if(key==='nostudent'){
      v=a.sen;
      /* information derived from students' own writing, even de-identified, still needs checking */
      if(!v || v==='not_specified' || v==='student_derived_deidentified') return 'unknown';
      return has(['none','research_participant_deidentified'],v)?'confirmed':'excluded';
    }
    /* a source item that needs a purchase, membership, subscription, or permission first (sa:
       restricted) is never a confirmed fit for "nothing to pay for" or "no purchases" */
    var gated=a.sa==='restricted';
    if(key==='nopaid'){
      v=a.eq;
      if(['paid_required','paid_with_stated_alternative'].includes(v)) return 'excluded';
      return !gated && has(['no_tool_needed','free_tier','institution_provided'],v)?'confirmed':'unknown';
    }
    if(key==='nodisclose'){
      v=a.dis;
      if(v==='formal_statement') return 'excluded';
      return has(['none_required','informal_acknowledgement','documented_log','anonymity_by_design'],v)?'confirmed':'unknown';
    }
    /* pc is a single legacy category, not independent yes/no answers. Only an
       explicit 'none' establishes absence; a different requirement proves neither absence nor presence. */
    if(key==='noaccount'||key==='nokit'||key==='noapproval'){
      v=a.pc;
      var blocked=key==='noaccount'?['account_verification']:key==='nokit'?['equipment_required','travel_or_attendance','purchased_material']:['institutional_approval_required'];
      if(has(blocked,v)) return 'excluded';
      if(key==='nokit' && gated) return 'unknown';
      return v==='none'?'confirmed':'unknown';
    }
    return 'unknown';
  }
  function assess(a,s,index){
    var row={activity:a,index:index||0,score:0,exact:[],compatible:[],mismatch:[],unknown:[],excluded:[],status:'confirmed'};
    if(!admitted(a) || (s.focus && a.focus!==s.focus)) row.status='excluded';
    LIMITS.forEach(function(k){
      if(!(s.limits||{})[k]) return;
      var r=requirement(a,k);
      if(r==='excluded') row.excluded.push(k);
      if(r==='unknown') row.unknown.push(k);
    });
    if(row.excluded.length) row.status='excluded';
    else if(row.status!=='excluded' && row.unknown.length) row.status='unknown';
    KEYS.forEach(function(k){
      var c=compare(a,k,s[k]);
      if(c==='unasked') return;
      row[c].push(k);
      if(c==='exact') row.score+=WEIGHTS[k];
      else if(c==='compatible') row.score+=k==='disc'||k==='lvl'?1:0;
    });
    return row;
  }
  /* Order within a group: how well the record matches the reader's answers (score), then the corpus
     quality tier (gr), then evidence of use (a source that reports running the activity before one that
     only publishes it, or one written for the collection and not yet tried). Records equal on all three are ordered by a fixed hash of their identifier, so no
     import batch, source, or alphabetical position is favored. The top results are the best matches even
     when they share a source; nothing enforces source diversity. */
  /* No reported use: a published prompt or workflow nobody has reported running (use: unreported), or
     a record from the two sets written for the collection (tier), which are not yet taught or tried. */
  function used(a){ return a.use==='unreported' || a.tier ? 0 : 1; }
  function neutral(id){                       // FNV-1a, 32-bit: stable across releases and browsers
    var h=0x811c9dc5; for(var i=0;i<id.length;i++){ h^=id.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; }
    return h;
  }
  function rank(x,y){
    var a=x.activity, b=y.activity;
    return y.score-x.score || (b.gr||0)-(a.gr||0) || used(b)-used(a) ||
      neutral(a.id)-neutral(b.id) || (a.id<b.id?-1:a.id>b.id?1:0);
  }
  function search(activities,s){
    var plan={exact:[],compatible:[],close:[],broader:[],unknown:[],confirmed:0,excluded:0};
    activities.forEach(function(a,i){
      var r=assess(a,s,i);
      if(r.status==='excluded'){plan.excluded++;return;}
      if(r.status==='unknown'){plan.unknown.push(r);return;}
      plan.confirmed++;
      if(r.mismatch.length===0) plan[r.compatible.length?'compatible':'exact'].push(r);
      else plan[r.mismatch.length===1?'close':'broader'].push(r);
    });
    ['exact','compatible','close'].forEach(function(k){plan[k].sort(rank);});
    ['broader','unknown'].forEach(function(k){plan[k].sort(function(a,b){return a.mismatch.length-b.mismatch.length || rank(a,b);});});
    plan.near=plan.exact.length+plan.compatible.length+plan.close.length;
    return plan;
  }
  function viable(activities,s,key,options){
    var seen={},state={};Object.keys(s).forEach(function(k){state[k]=s[k];});state[key]=null;
    activities.forEach(function(a){
      if(assess(a,state).status==='excluded') return;
      options.forEach(function(o){
        var v=o[0];
        // 'Scholarly' describes the reader's own work, not a student course level.
        if(key==='lvl' && v==='scholarly' && s.focus && s.focus!=='research_own' && !has(a.lvl,v)) return;
        var c=key==='focus'?(a.focus===v?'exact':'mismatch'):compare(a,key,v);
        if(c==='exact'||c==='compatible') seen[v]=(seen[v]||0)+1;
      });
    });
    return seen;
  }
  return {keys:KEYS,limits:LIMITS,compare:compare,requirement:requirement,assess:assess,rank:rank,admitted:admitted,search:search,viable:viable};
});
