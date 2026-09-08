# Publication checks — 8 September 2026

Source: https://github.com/DavidFreeborn/vexillological-genealogy

GitHub Pages: https://davidfreeborn.github.io/vexillological-genealogy/

Website: https://www.davidpeterwallisfreeborn.com/fun/vexillological-genealogy/

The Pages workflow runs the complete 60-layout validator before publication. The personal website imports the static release with its own navigation and SEO metadata. Data, images, geometry and application code are preserved by its sync script.

## Corrections made during publication

- Supply an explicit native browser worker factory to ELK. The bundled Node entrypoint previously fell back to synchronous layout despite a worker URL. The factory now constructs the dedicated worker directly, including the embedded blob worker in the offline edition.
- Disable application controls and expose a busy state until initial data and rendering are ready. An eight-second delayed-data test confirms filters and search remain disabled during loading and become available afterwards.
- Read and write UTF-8 explicitly in the offline generator, fixing generation on Windows with a legacy default encoding.
- The website link validator now resolves relative links from their containing page and accepts existing static files. A fixture confirms that a valid relative licence link passes while a missing relative file fails.

## Verification

- `npm ci`: no reported vulnerabilities.
- `npm run validate`: 479 records, 464 relationships; all 60 layout, coverage and lineage checks pass.
- `node scripts/check-portability.cjs` and JavaScript syntax check pass.
- Offline HTML regenerated and loaded; filter changes work through its embedded worker.
- Browser: whole atlas has 479 unique records; default largest component has 274. Family selection, search, details, lineage tracing, index, source dialog, filters, Reset, Fit, Actual size, zoom and keyboard panning checked.
- Nusantara Lookalikes adds Monaco and changes 18 records to 20 through the dedicated worker. Test server records the worker request; fresh browser sessions have no warning/error logs after the fixes.
- Website inspected at 1440×900, 768×1024 (including detail overlay), and 390×844. No horizontal document overflow; mobile search and family selector work.
- All four website validation commands pass. Existing duplicate-H1 warnings on Cellular Automata and Enigma remain unrelated to this addition.

Actual 200% browser zoom could not be exercised through the in-app browser controls. Physical mobile devices and other browser engines remain untested. Historical claims retain the supplied citations and confidence labels; this release check does not re-audit every historical claim.
