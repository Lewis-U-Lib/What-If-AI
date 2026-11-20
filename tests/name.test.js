/* The tool's name. Quidsima was named What If AI until November 2026: the new name is on every page, the motto and
 * the former name appear where a returning reader will look, and the addresses and storage keys that existing links
 * and saved lists depend on are unchanged.
 * Run after `python3 tools/build.py`:  node tests/name.test.js [site-dir] */
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site'));
const read = name => fs.readFileSync(path.join(SITE_DIR, name), 'utf8');
const pass = message => console.log('PASS  ' + message);
const text = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const tool = read('what-if-ai.html'), landing = read('index.html'), register = read('register.html'), missing = read('404.html');

assert.match(tool, /<title>Quidsima \| Lewis University Library<\/title>/);
const heading = tool.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1];
const mark = heading.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="Quidsima"/);
assert.ok(mark, 'the wordmark names the tool in its heading');
assert.match(mark[1], /^assets\/img\/quidsima-wordmark\.[\da-f]+\.svg$/);
assert.ok(fs.existsSync(path.join(SITE_DIR, mark[1])), 'the build publishes the wordmark');
assert.match(heading, /Quid<span>sima<\/span>/, 'the original text heading is available in reading and print modes');
assert.match(landing, /<title>Quidsima &amp; The Register \| Lewis University Library<\/title>/);
assert.match(text(register), /Every use-case idea in Quidsima,/);
assert.match(text(tool), /A context-driven tool for exploring whether and how generative AI could assist given your goals and constraints\. Start with a task from your teaching, research, or administrative work\. No AI experience needed\./);
assert.match(text(tool), /Lewis University Library · AI Use-Case Explorer for Faculty Quid/);
pass('the name is Quidsima in the page titles, the header, and The Register');

/* the tool's header spells out the Latin words behind the name, marked as Latin for screen readers, then gives the question in English */
assert.match(tool, /<p class="hdr__origin" lang="la">\(Quid \+ si \+ machina\)<\/p>\s*<p class="hdr__motto">What if a machine\?<\/p>/);
for (const [name, html] of [['landing page', landing], ['tool', tool], ['The Register', register]]) assert.match(html, /<i lang="la">Quid si machina\?<\/i>/, name + ' carries the motto');
pass('the motto is marked as Latin, translated in the header, and present on each page');

/* the former name: on the landing card, in the footer credit, and nowhere else in what a reader sees */
assert.match(text(landing), /Quidsima Quid si machina\? Formerly What If AI/);
assert.match(text(tool), /Quidsima was named What If AI until November 2026\./);
for (const [name, html] of [['what-if-ai.html', tool], ['register.html', register], ['index.html', landing], ['404.html', missing]]) {
  const rest = text(html).replace(/Formerly What If AI/g, '').replace(/Quidsima was named What If AI until November 2026\./g, '');
  assert.ok(!/What If AI/.test(rest), name + ' uses the earlier name only where it says the name changed');
}
pass('the earlier name appears only where the page says the name changed');

/* what existing links and saved lists depend on stays as it was */
for (const file of ['what-if-ai.html', 'register.html', 'index.html']) assert.ok(fs.existsSync(path.join(SITE_DIR, file)), file + ' keeps its address');
const jsDir = path.join(SITE_DIR, 'assets', 'js');
const scripts = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
for (const key of ['lul-whatifai-saved-v1', 'lul-whatifai-plans-v1', 'lul-whatifai-theme-v1', 'lul-whatifai-plain-v1', 'what-if-ai-saved-list']) assert.ok(scripts.includes(key), key + ' is unchanged');
pass('page addresses, browser storage keys, and the saved-list file format are unchanged');
console.log('\nName checks passed.');
