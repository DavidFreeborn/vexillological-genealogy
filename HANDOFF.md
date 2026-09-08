# A Vexillological Genealogy: website handoff

This pack contains the complete version 10 application, its editable source, all flag illustrations, the sourced dataset, and a standalone HTML edition.

## Quick use

Open `A-Vexillological-Genealogy-v10.html` in a browser. It embeds the illustrations, data, saved layouts and layout worker. Source links open the cited websites.

## Add to David Freeborn’s website

Suggested path: `/vexillological-genealogy/`.

1. Inspect the website’s existing structure and deployment instructions.
2. Copy the **contents of `dist/`** into the website’s static folder at the chosen path. Preserve its filenames and `flags/` directory. The application uses relative URLs and works beneath a subdirectory.
3. Add a link titled **A Vexillological Genealogy** in the website’s existing visualisations section, following its established styling.
4. Serve the application as its own page so it can use the available screen space. If the host requires an iframe, give it a full-width container and a height of at least 800px, with a link to open the atlas directly.
5. Check the whole atlas, family switching, search, shared-tradition and uncertainty filters, flag details, source links, zoom, and mobile family selector. Changes to filters must also work, since those invoke the bundled layout worker.
6. Publish through the website’s normal process. Add the source to the intended GitHub repository after confirming its name and branch.

The current work is saved in the atlas’s Sites source repository. Repository creation is unavailable through the connected GitHub tools. The pack includes a creation script and a GitHub Pages workflow. See SCALING-CHECKS.md for the transfer checks.

## Edit and regenerate

- `dist/index.html`: page structure, title and sources dialog.
- `dist/style.css`: layout and styling.
- `dist/app.js`: navigation, controls and rendering.
- `dist/layout.js`: graph arrangement and routing.
- `dist/data.json`: records, relationships, sources, family order and grouping.
- `dist/layouts.json`: precomputed standard views.
- `dist/flags/`: illustrations.
- `scripts/validate.cjs`: geometry, coverage and lineage checks.

For local development, run `npm ci` and `npm run dev`. The published application is static and needs no build step. Alternatively, serve `dist/` with any static web server.

After changing relationships, grouping or arrangement, run `npm run validate`. This regenerates the saved layouts. Then run `python scripts/make-offline.py` and `python scripts/make-pack.py` to refresh both downloads. Python 3.9+ is sufficient for the packaging scripts.

If the website enforces a Content Security Policy, account for the application’s bundled Web Worker and inline SVG. The standalone edition also uses inline scripts, inline styles, data images and a blob worker. Match the existing host policy to the chosen edition and verify in the browser.

## Attribution and historical uncertainty

Preserve the Sources & dates dialog, per-image credits, source links and supplied licence files. FOTW illustrations retain their noncommercial reuse terms. Other illustrations have their own source licences. The dataset records these individually. Liberty League and Somali National Movement drawings are labelled schematic reconstructions.

The Iran/Afghanistan review used Habib Borjian’s *Encyclopaedia Iranica* flag histories. The Afghan 1928 tricolour is placed in the European tricolour tradition; a direct derivation from Iran remains unverified. The atlas retains the separate Iranian and Afghan histories and the sourced Iranian/Tajik colour connection.

- https://www.iranicaonline.org/articles/flags-i/
- https://www.iranicaonline.org/articles/flags-ii/
- https://www.iranicaonline.org/articles/flags-iii/
- https://www.crwflags.com/fotw/flags/tj.html

## Create the GitHub repository

With Git, Node.js and GitHub CLI installed, and GitHub CLI signed into DavidFreeborn, run this from a fresh extracted pack:

```bash
bash scripts/create-github-repo.sh
```

This creates `DavidFreeborn/vexillological-genealogy` as a public repository and pushes the source. The script checks that it is operating in a fresh pack and excludes the Sites identity and old downloads. If the repository already exists, use its normal clone and copy the source into it instead.

In the repository's Settings > Pages, choose GitHub Actions as the source, then run the **Publish atlas** workflow. It uploads `dist/` unchanged. Verify the resulting live URL against SCALING-CHECKS.md before adding it to the personal website.
