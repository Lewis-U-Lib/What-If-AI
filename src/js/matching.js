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
    if(key==='disc' && !v) return 'compatible';
    return 'mismatch';
  }
  function requirement(a,key){
    var v;
    if(key==='noai') return has(a.cap,'none_required') || !!a.na ? 'confirmed':'excluded';
    if(key==='nostudent'){
      v=a.sen;
      if(!v || v==='not_specified') return 'unknown';
      return has(['none','student_derived_deidentified','research_participant_deidentified'],v)?'confirmed':'excluded';
    }
    if(key==='nopaid'){
      v=a.eq;
      if(has(['no_tool_needed','free_tier','institution_provided'],v)) return 'confirmed';
      return v==='paid_with_stated_alternative'?'excluded':'unknown';
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
  function rank(x,y){ return y.score-x.score || (y.activity.gr||0)-(x.activity.gr||0) || x.index-y.index; }
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
  return {keys:KEYS,limits:LIMITS,compare:compare,requirement:requirement,assess:assess,search:search,viable:viable};
});
