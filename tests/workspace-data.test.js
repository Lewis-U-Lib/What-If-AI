const assert=require('node:assert/strict');
const W=require('../src/js/workspace-data');
const empty=()=>({format:'what-if-ai-collection',version:1,saved:[],plans:{}});
const source=empty();source.saved=['OLD-1','A-2','A-2','MISSING-1'];source.plans['OLD-1']=W.plan({goal:'Compare independent source checking',trial:'<script>plain text</script>'});
const restored=W.parse(JSON.stringify(source),id=>id==='OLD-1'?'A-1':id);
assert.deepEqual(restored.saved,['A-1','A-2','MISSING-1']);assert.equal(restored.plans['A-1'].trial,'<script>plain text</script>');
assert.deepEqual(W.parse(JSON.stringify(restored)),restored);
const current=empty();current.saved=['A-1'];current.plans['A-1']=W.plan({goal:'Keep my current work'});
const merged=W.merge(current,restored);assert.equal(merged.collection.plans['A-1'].goal,'Keep my current work');assert.equal(merged.kept,1);assert.equal(current.saved.length,1);
for(const bad of ['{}','null','[]','bad JSON',JSON.stringify({...empty(),version:2}),JSON.stringify({...empty(),saved:['__proto__']}),'{"format":"what-if-ai-collection","version":1,"saved":[],"plans":{"__proto__":{"goal":"bad"}}}',JSON.stringify({...empty(),plans:{'A-1':{goal:7}}}),JSON.stringify({...empty(),plans:{'A-1':{reviewDate:'2026-02-31'}}}),JSON.stringify({...empty(),plans:{'A-1':{goal:'x'.repeat(5001)}}})])assert.throws(()=>W.parse(bad));
assert.throws(()=>W.parse(' '.repeat(2000001)));assert.throws(()=>W.collection({...empty(),saved:Array.from({length:2001},(_,i)=>'A-'+i)}));
assert.throws(()=>W.parse(JSON.stringify({...empty(),plans:{'OLD-1':{},'A-1':{}}}),id=>id==='OLD-1'?'A-1':id));
const large=empty(),other=empty();
for(let i=0;i<100;i++){
  large.plans['A-'+i]=W.plan({goal:'漢'.repeat(4000)});
  other.plans['B-'+i]=W.plan({goal:'😎'.repeat(2000)});
}
assert.deepEqual(W.parse(JSON.stringify(W.collection(large))),W.collection(large),'multibyte notes round-trip below the byte limit');
assert.throws(()=>W.merge(large,other),/2 MB/,'a combined collection must remain downloadable and restorable');
assert.equal(Object.keys(large.plans).length,100,'oversized merge preserves the current collection');
assert.throws(()=>W.parse('漢'.repeat(700000)),/2 MB/,'transfer limits count UTF-8 bytes');
console.log('PASS: collection round-trip, aliases, unavailable IDs, literal text, non-destructive merge, malformed files, limits, dates, and prototype keys.');
