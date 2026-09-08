#!/usr/bin/env bash
set -euo pipefail
# Run from the extracted pack with GitHub CLI installed and signed in.
repo_name="${1:-DavidFreeborn/vexillological-genealogy}"
command -v gh >/dev/null || { echo 'Install GitHub CLI and run gh auth login first.' >&2; exit 1; }
gh auth status >/dev/null
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd -- "$project_dir"
if [ -e .git ]; then
  echo 'Run this from a fresh extracted pack, which has no .git directory.' >&2
  exit 1
fi
node scripts/check-portability.cjs
git init -b main
git add dist scripts .github README.md HANDOFF.md SCALING-CHECKS.md package.json package-lock.json vite.config.mjs .gitignore
git commit -m 'Publish A Vexillological Genealogy'
gh repo create "$repo_name" --public --source=. --remote=origin --push --description 'An interactive, sourced genealogy of national, historical and regional flags'
echo 'Repository created. In Settings > Pages, choose GitHub Actions as the source.'
echo 'Then run the Publish atlas workflow to publish the tested dist/ directory.'
