/* node tests/redirect.test.js */
const assert = require('assert/strict');
const target = require('../redirect/redirect.js');
const at = (pathname, search = '', hash = '') => target({ pathname, search, hash });
const N = 'https://lewis-u-lib.github.io/Quidsima/';
assert.equal(at('/What-If-AI/'), N);
assert.equal(at('/What-If-AI'), N);
assert.equal(at('/What-If-AI/index.html'), N + 'index.html');
assert.equal(at('/What-If-AI/what-if-ai.html', '', '#a=focus:teaching;task:design'), N + 'quidsima.html#a=focus:teaching;task:design');
assert.equal(at('/What-If-AI/what-if-ai.html', '', '#tour'), N + 'quidsima.html#tour');
assert.equal(at('/What-If-AI/register.html', '', '#act=CAN-B-VERI-01'), N + 'register.html#act=CAN-B-VERI-01');
assert.equal(at('/What-If-AI/register.html', '', '#activities?op=none'), N + 'register.html#activities?op=none');
assert.equal(at('/What-If-AI/source-file.html', '?id=x'), N + 'source-file.html?id=x');
assert.equal(at('/What-If-AI/assets/js/old.js'), N);
assert.equal(at('/What-If-AI/nope.html', '', '#x'), N + '#x');
assert.equal(at('/what-if-ai/register.html'), N + 'register.html');
console.log('PASS  every old address goes to its new one, keeping the query and the part after "#"');
