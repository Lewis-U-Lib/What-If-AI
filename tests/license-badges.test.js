const assert = require('assert/strict');
const {identify} = require('../src/js/license-badges');
const {acts} = require('../data/acts.json');

for (const family of ['BY','BY-SA','BY-ND','BY-NC','BY-NC-SA','BY-NC-ND']) {
  assert.deepEqual(identify('CC '+family+' 4.0'), {
    family:family.toLowerCase(), url:'https://creativecommons.org/licenses/'+family.toLowerCase()+'/4.0/'
  });
}
assert.deepEqual(identify('CC0 1.0'), {family:'zero',url:'https://creativecommons.org/publicdomain/zero/1.0/'});
assert.equal(identify('CC BY-SA 3.0 IGO').url, 'https://creativecommons.org/licenses/by-sa/3.0/igo/');
assert.equal(identify('Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)').url, 'https://creativecommons.org/licenses/by-sa/3.0/');
assert.equal(identify('This work is licensed under the Creative Commons Attribution-NonCommercial 3.0 (CC BY-NC 3.0) United States License.').url, 'https://creativecommons.org/licenses/by-nc/3.0/us/');
assert.equal(identify('Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)').family,'by-nc-sa');
assert.equal(identify('CC BY NC ND 4.0 license').family,'by-nc-nd');
for (const label of ['CC BY (version not stated)','CC BY-NC (version not stated)','Creative Commons Attribution (CC BY) license']) assert.equal(identify(label).url,'');
for (const label of ['MIT','Apache-2.0','Public Domain','none stated on item page','CC BY-SA-ND 4.0',
  'No license stated on this item; the site footer is CC BY 4.0',
  'All Rights Reserved [Once the project enters beta testing, license will change to a CC license]',
  'https://creativecommons.org.evil.example/licenses/by/4.0/',
  'Chapter: CC BY-SA 4.0; book: CC BY 4.0']) assert.equal(identify(label),null,label);

let count=0;
for (const a of acts) {
  const badge=identify(a.lic), match=/^CC (BY(?:-NC)?(?:-SA|-ND)?)(?: |$)/.exec(a.lic);
  const expected=a.lic.startsWith('CC0 ') ? 'zero' : match ? match[1].toLowerCase() : null;
  assert.equal(badge?.family || null,expected,a.id);
  if(badge) count++;
  if(a.lic.includes('version not stated')) assert.equal(badge.url,'',a.id);
  if(a.licu?.startsWith('https://creativecommons.org/')) assert.equal(badge.url,a.licu,a.id);
}
assert.equal(count,1016);
console.log('PASS: all 1,033 activity license families, 1,016 CC badges, precise deed versions, and ambiguous/non-CC exclusions.');
