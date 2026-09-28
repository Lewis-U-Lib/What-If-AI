/* Read exactly the data that the built browser pages load, including reviewed errata. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, '_site/what-if-ai.html'), 'utf8');
const manifest = JSON.parse(html.match(/<script id="site-manifest" type="application\/json">([\s\S]*?)<\/script>/)[1]);
module.exports = JSON.parse(fs.readFileSync(path.join(root, '_site', manifest.data.acts), 'utf8'));
