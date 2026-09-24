/* A tiny static server for the tests and for local preview (no dependencies).
 * It mirrors what GitHub Pages does that the site relies on: serves _site/ under the
 * repository path (/What-If-AI/), sends 404.html for unknown paths, and
 * maps a path without an extension to the .html file.
 *
 *   node tests/serve.js [dir] [port]       → http://localhost:8080/What-If-AI/
 *   const { start } = require('./serve');   → await start({dir, port}) in a test
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const BASE = new URL(CFG.base_url).pathname;           // "/What-If-AI/"
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };

function start({ dir = path.join(ROOT, '_site'), port = 0, fail = null, log = null } = {}) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let rel = u.pathname.startsWith(BASE) ? u.pathname.slice(BASE.length) : null;
    if (fail && rel && fail.test(rel)) { res.writeHead(503); return res.end('unavailable (test)'); }
    let file = rel === null ? null : path.join(dir, decodeURIComponent(rel || 'index.html'));
    if (file && !file.startsWith(dir)) file = null;
    if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (file && !fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return res.end(fs.readFileSync(path.join(dir, '404.html')));
    }
    if (log) log.push({ path: rel, bytes: fs.statSync(file).size });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    resolve({ server, origin, base: origin + BASE, url: f => origin + BASE + f, close: () => new Promise(r => server.close(r)) });
  }));
}

module.exports = { start, BASE };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
  start({ dir, port: +(process.argv[3] || 8080) }).then(s => console.log('serving ' + dir + ' at ' + s.base));
}
