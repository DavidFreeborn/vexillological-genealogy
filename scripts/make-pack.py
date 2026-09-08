"""Package the editable static application and its standalone edition."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = root / 'A-Vexillological-Genealogy-v10.zip'
files = [p for p in (root / 'dist').rglob('*') if p.is_file()
         and '.openai' not in p.relative_to(root).parts
         and '_qa' not in p.relative_to(root).parts
         and p.name != 'offline-check.html']
files += [root / name for name in [
    'README.md', 'HANDOFF.md', 'SCALING-CHECKS.md', '.gitignore', 'scripts/create-github-repo.sh', 'package.json', 'package-lock.json',
    'vite.config.mjs', 'scripts/make-offline.py', 'scripts/make-pack.py',
    'scripts/validate.cjs', 'scripts/check-portability.cjs', '.github/workflows/pages.yml', 'A-Vexillological-Genealogy-v10.html']]
assert all(p.is_file() for p in files)
with ZipFile(output, 'w', ZIP_DEFLATED) as z:
    for p in sorted(files):
        z.write(p, 'vexillological-genealogy/' + p.relative_to(root).as_posix())
with ZipFile(output) as z:
    assert z.testzip() is None
print(f'{output.name}: {len(files)} files, {output.stat().st_size:,} bytes.')
