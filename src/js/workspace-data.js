/* Portable, plain-text trial plans. No network or DOM access. */
(function(root, factory){
  if(typeof module==='object' && module.exports) module.exports=factory();
  else root.WorkspaceData=factory();
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var fields=['goal','trial','responsibility','preparation','verification','success','reconsider','alternative','duration','prepEffort','checkEffort','effortBasis','reviewDate'];
  var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
  function idOK(id){return typeof id==='string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(id) && ['__proto__','constructor','prototype'].indexOf(id)<0;}
  function object(v){return v!==null && typeof v==='object' && !Array.isArray(v);}
  function byteLength(text){
    var bytes=0;
    for(var i=0;i<text.length;i++){
      var c=text.charCodeAt(i), next=text.charCodeAt(i+1);
      if(c<128)bytes++;else if(c<2048)bytes+=2;
      else if(c>=55296&&c<=56319&&next>=56320&&next<=57343){bytes+=4;i++;}
      else bytes+=3;
    }
    return bytes;
  }
  function plan(v){
    if(!object(v)) throw new Error('A trial plan must be an object.');
    var out={};
    Object.keys(v).forEach(function(k){if(fields.indexOf(k)<0 && k!=='updatedAt') throw new Error('Unrecognized trial field: '+k);});
    fields.forEach(function(k){
      if(own(v,k) && (typeof v[k]!=='string' || v[k].length>5000)) throw new Error('Trial fields must be text of 5,000 characters or fewer.');
      out[k]=own(v,k)?v[k]:'';
    });
    if(out.reviewDate && (!/^\d{4}-\d{2}-\d{2}$/.test(out.reviewDate) || !isFinite(Date.parse(out.reviewDate)) || new Date(out.reviewDate).toISOString().slice(0,10)!==out.reviewDate)) throw new Error('The review date is invalid.');
    if(v.updatedAt && (typeof v.updatedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T/.test(v.updatedAt) || !isFinite(Date.parse(v.updatedAt)))) throw new Error('The trial timestamp is invalid.');
    out.updatedAt=v.updatedAt||'';
    return out;
  }
  function collection(v,canonical){
    if(!object(v) || v.format!=='what-if-ai-collection' || v.version!==1) throw new Error('Choose a What If AI collection download (version 1).');
    if(!Array.isArray(v.saved) || v.saved.length>2000 || !object(v.plans) || Object.keys(v.plans).length>2000) throw new Error('This collection is incomplete or too large.');
    var saved=[], plans=Object.create(null);
    function normalize(id){
      if(!idOK(id)) throw new Error('The collection contains an invalid idea ID.');
      var result=canonical?canonical(id):id;
      if(!idOK(result)) throw new Error('The collection contains an invalid idea ID.');
      return result;
    }
    v.saved.forEach(function(id){id=normalize(id);if(saved.indexOf(id)<0)saved.push(id);});
    Object.keys(v.plans).forEach(function(id){
      var key=normalize(id), p=plan(v.plans[id]);
      if(own(plans,key)) throw new Error('Two trial plans refer to the same idea. Resolve the duplicate before restoring.');
      plans[key]=p;
    });
    var result={format:'what-if-ai-collection',version:1,saved:saved,plans:plans};
    if(byteLength(JSON.stringify(result,null,2))>1950000) throw new Error('This collection exceeds the 2 MB transfer limit. Shorten trial notes before saving.');
    return result;
  }
  function parse(text,canonical){
    if(typeof text!=='string' || byteLength(text)>2000000) throw new Error('Choose a collection smaller than 2 MB.');
    var value;try{value=JSON.parse(text);}catch(_){throw new Error('This file is not valid JSON. Choose a collection download.');}
    return collection(value,canonical);
  }
  function merge(current,incoming){
    var a=collection(current), b=collection(incoming), kept=0;
    b.saved.forEach(function(id){if(a.saved.indexOf(id)<0)a.saved.push(id);});
    Object.keys(b.plans).forEach(function(id){
      if(own(a.plans,id)){kept++;return;}
      a.plans[id]=b.plans[id];
    });
    if(a.saved.length>2000 || Object.keys(a.plans).length>2000) throw new Error('The combined collection exceeds 2,000 ideas or plans.');
    return {collection:collection(a),kept:kept};
  }
  return {fields:fields,idOK:idOK,plan:plan,collection:collection,parse:parse,merge:merge};
});
