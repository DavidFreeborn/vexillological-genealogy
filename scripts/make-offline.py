"""Build an offline atlas with embedded illustrations, layouts and ELK worker."""
import base64
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[1]
dist = root / 'dist'
data = json.loads((dist / 'data.json').read_text(encoding='utf-8'))
raw = json.dumps(data, ensure_ascii=False).encode()
for flag in data['nodes']:
    if not flag.get('image'):
        continue
    path = dist / flag['image']
    mime = {'.svg': 'image/svg+xml', '.gif': 'image/gif', '.png': 'image/png'}[path.suffix]
    flag['image'] = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()

html = (dist / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link\s+rel="stylesheet"\s+href="style.css"\s*/?>', lambda _: '<style>' + (dist / 'style.css').read_text(encoding='utf-8') + '</style>', html)
for name in ['elk.bundled.js', 'layout.js', 'app.js']:
    code = (dist / name).read_text(encoding='utf-8')
    if name == 'app.js':
        code = re.sub(r'''fetch\(["']data.json["']\)''', 'Promise.resolve({ok:true,json:async()=>ATLAS_DATA})', code)
        code = ('const OFFLINE_LAYOUTS=' + (dist / 'layouts.json').read_text(encoding='utf-8') + ';\n'
                + 'const OFFLINE_WORKER_SOURCE=' + json.dumps((dist / 'elk-worker.min.js').read_text(encoding='utf-8')) + ';\n'
                + 'const ATLAS_DATA=' + json.dumps(data, ensure_ascii=False) + ';\n' + code)
    html = html.replace('<script src="' + name + '"></script>', '<script>' + code.replace('</script', '<\\/script') + '</script>')
html = html.replace('href="data.json"', 'href="data:application/json;base64,' + base64.b64encode(raw).decode() + '"')
for name in ['LICENSE-elk.md', 'SVG-FLAGS-LICENSE.txt']:
    html = html.replace('href="' + name + '"', 'href="data:text/plain;base64,' + base64.b64encode((dist / name).read_bytes()).decode() + '"')
assert '<script src=' not in html and 'href="style.css"' not in html
output = root / 'A-Vexillological-Genealogy-v10.html'
output.write_text(html, encoding='utf-8')
print(f'{output.name}: {output.stat().st_size:,} bytes, all assets embedded.')
