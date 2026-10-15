/* Typography and proofreading rules for the text readers see (October 15 proofreading pass).
   Source titles, quotations, citations, and license statements reproduce the source and are not checked
   for house style here, apart from quotation-mark pairing. */
const assert = require('assert/strict'), path = require('path');
const engines = require('playwright'), {createContext} = require('./browser'), {start} = require('./serve');
const D = require('./public-data');
const SITE = path.resolve(process.argv[2] || path.join(__dirname, '../_site'));
let count = 0; function pass(m){ count++; console.log('PASS ' + m); }

const PROSE = ['t', 'sum', 'gate', 'dl', 'rf', 'ad', 'na', 'evs', 'chg', 'risk', 'dep', 'chk'];
function prose(a){
  const out = [];
  for(const k of PROSE) if(a[k]) out.push([k, a[k]]);
  (a.srp || []).forEach((s, j) => out.push(['srp[' + j + ']', s[1]]));
  (a.pa || []).forEach((p, j) => out.push(['pa[' + j + ']', p[1]]));
  (a.miss || []).forEach((s, j) => out.push(['miss[' + j + ']', s]));
  (a.rel || []).forEach((r, j) => r[3] && out.push(['rel[' + j + ']', r[3]]));
  if(a.loc) out.push(['loc', a.loc]);
  if(a.attr) out.push(['attr', a.attr]);
  return out;
}

for(const a of D.acts){
  for(const [k, s] of prose(a)){
    const where = a.id + '.' + k;
    assert.ok(!/["']/.test(s.replace(/https?:\/\/\S+/g, '')), where + ': straight quotation mark or apostrophe');
    assert.equal((s.match(/“/g) || []).length, (s.match(/”/g) || []).length, where + ': unpaired double quotation marks');
    let depth = 0;
    for(const ch of s){ if(ch === '“') depth++; if(ch === '”') depth--; assert.ok(depth >= 0 && depth <= 1, where + ': double quotation marks nested inside double'); }
    assert.ok(!/(?<!\.)\.\.(?!\.)|,\s*,|\s[,;.](?=\s)/.test(s.replace(/ \. \. \./g, '…')), where + ': doubled or stray punctuation');
    // source titles in attribution lines keep their own punctuation; the "Changes:" sentence is ours
    const ours = k === 'attr' ? s.split(' Changes: ').slice(1).join(' ') : s;
    assert.ok(!/\S -{1,2} \S|[A-Za-z]--[A-Za-z]/.test(ours), where + ': hyphen used as a dash');
    if(k !== 'attr' && k !== 'loc' && !k.startsWith('rel')) assert.ok(!/(?<![?!])”,/.test(s), where + ': comma outside a closing quotation mark');
  }
  for(const k of ['sum', 'gate', 'dl', 'rf']){
    if(!a[k]) continue;
    const caps = (a[k].match(/;\s+[A-Z][a-z]+\b/g) || []).map(m => m.replace(/^;\s+/, ''));
    for(const w of caps) assert.ok(!/^(Generate|Obtain|Specify|Restate|Review|Draft|Create|Identify|Prohibit|Provide|Complete|Have|Use|Ask|Check|Write|List|Compare|Include|Define|Set|Add|Keep|Produce|Summarize|Flag|Map|Note|Build|Prepare|Confirm|Assess|Translate|Rank)$/.test(w), a.id + '.' + k + ': capital after a semicolon (' + w + ')');
  }
  if(a.cls === 'hybrid_synthesis' && a.attr) for(const part of a.attr.split('Changes: ').slice(1))
    assert.ok(/^(The |This |Recast|Re-composed|Drew|Put|Wrote|Took|Kept|Built|Applied|Added|(?!Detailed|Paired)[A-Z][a-z]+ed\b)/.test(part), a.id + '.attr: the Changes notice says what changed');
  for(const k of ['gate', 'dl', 'rf']) if(a[k]) assert.match(a[k].trim(), /[.?!]”?$/, a.id + '.' + k + ': ends with a period');
  for(const k of ['sum', 'gate', 'chg', 'na', 'dl']) if(a[k]) assert.ok(!/\b(during|planned learning|a starter|a classroom|a group) use-case idea/.test(a[k]), a.id + '.' + k + ': “use-case idea” standing for an activity');
}
pass('data: curly, paired, non-nested quotation marks; no doubled punctuation or hyphen dashes; lowercase after semicolons in step lists; final periods');

(async () => {
  const server = await start({dir: SITE}), browser = await engines.chromium.launch();
  try {
    const ctx = await createContext(browser, {viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'}), p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    const coded = D.acts.filter(a => !a.disc && /_/.test(a.fld || '')).slice(0, 4);
    assert.ok(coded.length > 0, 'there are ideas with field codes to check');
    for(const a of coded){
      await p.goto('about:blank'); await p.goto(server.url('register.html#act=' + encodeURIComponent(a.id)));
      await p.waitForSelector('#actDialog[open]');
      const disc = await p.evaluate(() => { const dt = [...document.querySelectorAll('#actDialog dt')].find(d => d.textContent === 'Discipline'); return dt ? dt.nextElementSibling.textContent : ''; });
      assert.ok(disc && !/_/.test(disc), a.id + ': Discipline shows words, not codes (' + disc + ')');
    }
    pass('the Discipline row shows words for ideas that carry only field codes (' + coded.length + ' checked)');

    await p.goto('about:blank'); await p.goto(server.url('register.html#activities'));
    await p.waitForSelector('#actCount');
    async function searchSnapshot(query){
      await p.locator('#gq').fill(query);
      await p.waitForFunction(q => {
        const chip = document.querySelector('#actResults [data-clear="q"]');
        return chip && chip.textContent.includes('Search: “' + q + '”');
      }, query);
      return p.evaluate(() => ({
        total: Number(document.querySelectorAll('#actCount strong')[1].textContent.replace(/,/g, '')),
        ideas: [...document.querySelectorAll('#actResults .acard [data-open]')].map(el => el.getAttribute('data-open')),
        sources: [...document.querySelectorAll('#sources .src')].map(el => el.id)
      }));
    }
    const curly = await searchSnapshot('student’s');
    assert.ok(curly.total > 0, 'the published collection has student’s matches');
    assert.deepEqual(await searchSnapshot("student's"), curly, 'keyboard apostrophes find the same published ideas and sources');
    pass('Register search preserves published matches for keyboard and curly apostrophes');

    // Exercise both query-to-data directions, single/double quotes, case, multiple words,
    // and source matches through the actual search input; mutations stay in this browser page.
    const fixtureIDs = await p.evaluate(() => {
      const a = window.SITE.A[0], w = window.SITE_DATA.register.works[0];
      a.t = 'Proofreadneedle student’s “curly” ‘single’';
      w.t = 'Proofreadneedle student’s “curly” ‘single’';
      return {idea: a.id, source: 'src-' + w.id};
    });
    for(const query of ['proofreadneedle student’s “curly” ‘single’', 'PROOFREADNEEDLE STUDENT\'S "CURLY" \'SINGLE\'']){
      const result = await searchSnapshot(query);
      assert.equal(result.total, 1);
      assert.deepEqual(result.ideas, [fixtureIDs.idea]);
      assert.deepEqual(result.sources, [fixtureIDs.source]);
    }
    await p.evaluate(() => {
      window.SITE.A[0].t = 'Proofreadneedle student\'s "straight" \'single\'';
      window.SITE_DATA.register.works[0].t = 'Proofreadneedle student\'s "straight" \'single\'';
    });
    for(const query of ['proofreadneedle student’s “straight” ‘single’', 'proofreadneedle student\'s "straight" \'single\'']){
      const result = await searchSnapshot(query);
      assert.equal(result.total, 1);
      assert.deepEqual(result.ideas, [fixtureIDs.idea]);
      assert.deepEqual(result.sources, [fixtureIDs.source]);
    }
    const missing = await searchSnapshot('proofreadneedle nonexistentterm');
    assert.equal(missing.total, 0, 'all search words still need to match');
    assert.deepEqual(missing.sources, []);
    pass('Register ideas and sources match straight/curly quotation marks in both directions');

    // counts read with a thousands separator; labels in a list read as one sentence
    await p.goto('about:blank'); await p.goto(server.url('register.html#activities'));
    await p.waitForSelector('#actCount');
    const total = D.acts.length.toLocaleString('en-US');
    assert.match(await p.locator('#actCount').innerText(), new RegExp('of ' + total + ' use-case ideas'));
    assert.match(await p.locator('#activities').innerText(), new RegExp('All ' + total + ' use-case ideas in the collection'));
    const multi = D.acts.find(a => (a.task || []).length > 1 && (a.lvl || []).length > 1);
    assert.ok(multi, 'an idea with several tasks and levels');
    await p.goto('about:blank'); await p.goto(server.url('register.html#act=' + encodeURIComponent(multi.id)));
    await p.waitForSelector('#actDialog[open]');
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#actDialog dt')].map(d => [d.textContent, d.nextElementSibling.textContent])));
    assert.ok(!/; [A-Z][a-z]/.test(rows['Area of work']), 'Area of work: ' + rows['Area of work']);
    assert.ok(!/, [A-Z][a-z]/.test(rows['Level']), 'Level: ' + rows['Level']);
    assert.match(rows['AI tool needed'], /^[A-Z]/);
    pass('counts use a thousands separator, and label lists read as one sentence (' + multi.id + ')');

    // The results plan and saved badges use the same count format as the Register.
    await p.evaluate(ids => localStorage.setItem('lul-whatifai-saved-v1', JSON.stringify(ids)), D.acts.map(a => a.id));
    await p.goto('about:blank'); await p.goto(server.url('what-if-ai.html#a='));
    await p.waitForSelector('#plan .browse a');
    assert.ok((await p.locator('#plan .browse a').innerText()).includes('Browse all ' + total + ' use-case ideas'));
    const visible = await p.locator('[data-match-group="exact"] [data-card]').count();
    assert.ok((await p.locator('#moreExact').innerText()).includes('(' + (D.acts.length - visible).toLocaleString('en-US') + ' more)'));
    const badges = await p.locator('[data-saved-count]').allTextContents();
    assert.ok(badges.length && badges.every(text => text === total), 'saved counts: ' + badges.join(', '));
    assert.ok((await p.locator('[data-saved-label]').allTextContents()).every(text => text === total + ' saved use-case ideas'));
    await p.evaluate(() => window.SITE.Saved.clear());
    pass('results browse link, remaining matches, and saved badges use thousands separators');


    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
  console.log(count + ' October 15 proofreading checks passed.');
})().catch(e => { console.error(e); process.exit(1); });
