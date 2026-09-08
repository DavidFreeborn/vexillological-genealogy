const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '../dist');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
assert(/name="viewport"/.test(html), 'Missing mobile viewport');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (/^(https?:|data:|#)/.test(url)) continue;
  assert(!url.startsWith('/'), 'Root-relative asset breaks project hosting: ' + url);
  assert(fs.existsSync(path.join(base, url)), 'Missing ' + url);
}
const data = JSON.parse(fs.readFileSync(path.join(base, 'data.json')));
const layouts = JSON.parse(fs.readFileSync(path.join(base, 'layouts.json')));
assert.equal(layouts.revision, data.layoutRevision, 'Stale saved geometry');
for (const n of data.nodes) if(n.image) {
  assert(!n.image.startsWith('/'), 'Root-relative image: ' + n.id);
  assert(fs.existsSync(path.join(base, n.image)), 'Missing image: ' + n.id);
}
for (const f of ['app.js','layout.js','elk.bundled.js','elk-worker.min.js','style.css'])
  assert(fs.existsSync(path.join(base,f)), 'Missing runtime asset ' + f);
assert(!fs.existsSync(path.join(base,'_qa')), 'Remove the temporary QA copy before publishing');
console.log('Portable static entrypoint, bundled assets and matching layout revision verified.');
