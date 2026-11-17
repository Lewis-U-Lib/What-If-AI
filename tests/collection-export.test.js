const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const E = require('../src/js/idea-export');
const W = require('../src/js/word');
const {acts} = require('../data/acts.json');
const site = {L:{actor:{},scale:{},pc:{},sa:{}},costLabel:() => ''};
const a = {id:'example',t:'A & B',sum:'Keep <every> word.\n  Including the second line.',gate:'My judgment.',
  cit:'Source one\nSource two',attr:'Original attribution.',chg:'Published change note.',lic:'CC BY-NC-ND 4.0',
  licu:'https://creativecommons.org/licenses/by-nc-nd/4.0/',evs:'A full evidence caveat.',
  pa:[['Setting','Exact adaptation text']],miss:['An exact missing detail'],srp:[['procedure','Exact source procedure.']],
  pr:'An exact quoted prompt.',rel:[['R1','Used unmodified','Referenced work','p. 3']]};
async function main() {
  assert.deepEqual(E.comparison({sc:[]},site).map(row => row[1]),Array(5).fill('Not stated'));
  assert.equal(E.comparison({...a,srp:[['goal','A recorded goal.']]},site)[0][1],'A recorded goal.');
  assert.equal(E.comparison(a,site)[4][1],a.gate);
  const withPreparation = acts.find(record => record.id === 'WIA-S-SOC-B-08');
  const quote = E.comparison(withPreparation,site)[2][1];
  assert.match(quote,/^Before the session/);
  assert.ok(withPreparation.sum.includes(quote));
  assert.equal(E.comparison({depth:'quick',sum:'In class, compare the two examples.'},site)[2][1],'Not stated');
  const url = 'https://example.org/register.html#act=example';
  const blocks = E.blocks(a,url), text = E.text(blocks);
  assert.ok(E.noDerivatives(a));
  assert.ok(E.noDerivatives({lic:'A license',licu:'https://creativecommons.org/licenses/by-nd/4.0/'}));
  assert.equal(E.noDerivatives({lic:'CC BY 4.0',sa:'unmodified'}),false);
  for (const field of [E.note,a.t,a.sum,a.gate,a.attr,a.cit,a.chg,a.lic,a.licu,url,a.evs,a.pa[0][1],a.miss[0],a.srp[0][1],a.pr,'Referenced work']) assert.ok(text.includes(field));
  for (const record of acts) {
    const exported = E.text(E.blocks(record,url));
    for (const field of ['sum','cit','attr','lic','lics','licu','licn','chg']) {
      if (record[field]) assert.ok(exported.includes(record[field]),record.id + ' ' + field);
    }
  }
  // Read the downloaded format using an independent ZIP/XML reader, including punctuation and multiple paragraphs.
  const doc = Buffer.from(await (await W.documentBlob(blocks)).arrayBuffer());
  const read = spawnSync('python3',['-c',
    'import io,sys,zipfile,xml.etree.ElementTree as E,json\nwith zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:\n assert z.testzip() is None\n root=E.fromstring(z.read("word/document.xml"))\n ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}\n print(json.dumps(["".join(p.itertext()) for p in root.findall(".//w:body/w:p",ns)]))'],{input:doc});
  assert.equal(read.status,0,read.stderr.toString());
  assert.deepEqual(JSON.parse(read.stdout),blocks.flatMap(b => b.text.split(/\r\n|\r|\n/)));
  console.log('PASS  All catalog narratives and attribution. Verbatim ND text and a readable Word package.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
