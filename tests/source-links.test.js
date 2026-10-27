/* Data-wide consistency, locator preservation and safe file choices. */
const assert = require('node:assert/strict');
const api = require('../src/js/source-links');
const data = require('../content/source-links.json');
const acts = require('../data/acts.json').acts;
const works = require('../data/register.json').works;
const policy = api.create(data);
const urls = acts.map(a => a.url).concat(works.map(w => w.link)).filter(Boolean);
let checked = 0;
for (const url of urls) {
  const e = policy.lookup(url);
  if (!e) continue;
  checked++;
  if (e.kind === 'page') { assert.equal(policy.noticeURL(url), ''); continue; }
  const route = policy.noticeURL(url);
  assert.ok(route.startsWith('source-file.html#'));
  const file = decodeURIComponent(route.split('#')[1]);
  assert.equal(policy.file(file), file);
  assert.equal(policy.lookup(file), e);
  if (api.key(url) === api.key(e.urls[0])) assert.equal(file, url);
  for (const alias of e.urls) assert.equal(policy.lookup(alias), e);
}
const jula = urls.find(u => u.endsWith('#page=14'));
assert.equal(decodeURIComponent(policy.noticeURL(jula).split('#')[1]), jula);
for (const bad of ['javascript:alert(1)', 'data:text/html,hi', '//example.org/x.pdf', 'https://evil.example/x.pdf', 'https://user:pass@example.org/x.pdf', 'https://example.org/\nx.pdf', null]) {
  assert.equal(policy.noticeURL(bad), '');
}
const github = urls.find(u => u.includes('github.com/') && u.includes('/blob/') && u.endsWith('.pdf'));
assert.equal(policy.lookup(github).kind, 'page');
assert.equal(policy.noticeURL(github), '');
const crl = urls.find(u => u.includes('/article/view/26102/34024'));
assert.equal(policy.lookup(crl).kind, 'page');
const arxiv = urls.find(u => u.includes('arxiv.org/pdf/'));
assert.equal(policy.lookup(arxiv).page, 'https://arxiv.org/abs/2302.08497');
const original = JSON.stringify(data);
urls.forEach(u => policy.noticeURL(u));
assert.equal(JSON.stringify(data), original);
console.log(`PASS source-link policy: ${checked} activity/reference occurrences; locators, aliases, HTML exceptions and invalid URLs`);
