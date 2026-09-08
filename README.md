# A Vexillological Genealogy

Static interactive atlas in `dist/`. Run `npm install` and `npm run dev` for the development preview, or serve `dist/` directly. Production needs no build step. `A-Vexillological-Genealogy-v10.html` is the self-contained edition generated with `python scripts/make-offline.py`.

479 flag and emblem records cover all 195 UN member/observer national flags, selected associated and disputed states, regional flags, movements and historical designs. 464 sourced relationships distinguish influence, redesign, shared traditions, resemblance and uncertain links. Dates describe the principal design or represented period; historical reconstructions are identified individually.

## Layout and interaction

Eclipse Layout Kernel 0.11.0 supplies downward layered flow, fixed north/south ports, orthogonal routing and crossing minimization. Related peer flags are grouped into fixed horizontal layout units. Independent ancestors can begin beside their immediate descendants. Shared traditions use quiet horizontal bands; most names appear only on selection. US blue-seal flags occupy one group, with redesigned flags below.

The whole atlas displays every record once: the largest connected tree above smaller chains and isolates. The largest component also has its own tab. Connected branches are always included. Revolutionary Red shows replacements without importing all their other ancestors; Revolutionary Tricolours and Latin America omit outside succession predecessors. Trace full lineage restores the complete ancestry. Trace full lineage includes earlier flags replaced by the displayed descendants. Largest connected component is calculated from visible directed influence and redesign edges, so its displayed tree remains connected. Other flags excludes records in named collections.

Standard views use validated saved geometry in `dist/layouts.json`. Changed filters run ELK in a Web Worker. Camera updates use animation frames; selection updates classes without rebuilding the SVG. Layout caching is bounded. Hovering never fades flags. Family views open at a readable scale; Fit provides an overview and Actual size restores full-sized flags. The alphabetical index provides a text-based alternative.

## Illustrations and references

Flags preserve source proportions. Image credits, source pages and reuse terms travel with each record. FOTW images retain their noncommercial terms. Other sources include FlagCDN/Flagpedia, ciscoriordan/svg-flags and hampusborgos/country-flags. The Leonese banner is Ricardo Chao's attributed reconstruction. The Liberty League and Somali National Movement images are explicitly labelled schematic reconstructions from cited written descriptions; exact shades, proportions and lettering are illustrative. The generic Islamic emblem and ancient Byzantium coin motif represent symbols rather than surviving flags.

The historical expansion includes all 15 late-Soviet republic flags, six socialist Yugoslav republics, Warsaw Pact-era national designs, Cambodia, Afghanistan, South Yemen and Mongolia; Castile, León, Aragon, French royal banners and double-eagle traditions. Poland and Czechoslovakia retained the same national flag designs across the end of communist rule, documented in their notes.

Regional collections include all 50 US states, all 13 Canadian provinces and territories, all 16 German states, and six Australian states and two mainland territories, with selected predecessors and major redesigns. German national history is incorporated into Revolutionary tricolours.

## Verification and regeneration

`npm run validate` audits 60 standard and comparison layouts with shared traditions off and on. It checks every routed segment against unrelated flag and label bounds, downward ancestry, ancestry-path preservation at equal or stronger confidence, non-overlapping flag cards, all-atlas coverage, asset existence, sources, actual component connectivity, blue-seal grouping, Other collection exclusivity, and historical predecessor traversal. It regenerates the standard `dist/layouts.json` geometry. Run it after changing the data or layout, then regenerate the offline edition.

Desktop browser checks covered selection and closing details, family switching, search, zoom, always-expanded branches, largest-component rendering and standalone filtering with the embedded worker. The standalone atlas rendered all 479 distinct records. Visual checks included Nordic, US, Latin, revolutionary-red and largest-component layouts. Mobile and other browser engines have not been separately tested.

Revision 6 adds Bulgarian, Qajar Iranian, Afghan and Somaliland records. Shared groups consolidate Nordic, early Slavic, Pan-African, Turkic and Soviet/Yugoslav examples. Redundant direct routes are hidden where a path of equal or stronger confidence already displays the ancestry; all sourced claims remain in the record details.

Revision 7 links PAIGC to Ghana, adds Mauritania to the shared Pan-African palette, restores early Taliban and Somaliland predecessors, places shared regional red-white flags together and keeps direct descent separate from broader symbolic relationships. Large connected layouts compare three crossing-minimization seeds and retain the arrangement with fewer crossings and shorter routes. The whole-atlas checks also require one instance per record, complete directed reachability and all smaller components below the largest tree.

Revision 8 adds Rhodesia, Zimbabwe Rhodesia, Grenada’s earlier flag, the Guyana proposal, the SPLM predecessor and an explicitly uncertain ancient Byzantium crescent connection. Kenya and Eswatini share a horizontal shield group; Brazil’s empire begins beside the Latin American founding flags; Papua New Guinea sits alongside Australia. Straight terminal succession chains are aligned below their parents when other cards and routes remain clear. Cached adjacency indexes reduce repeated graph scans during layout and selection, and stable edge keys preserve highlighting for saved geometry. Namibia and PAIGC remain in their sourced Pan-African branches.

Revision 9 renames the atlas, widens the navigation, orders related families together and separates Other Flags from regional collections. The Iranian, Tajik and Afghan branches use per-view row guides, preserving the same sourced relationships while reducing crossings. Historical notes have been edited for concise, factual wording. See `HANDOFF.md` for website integration and `python scripts/make-pack.py` for the complete download pack.

Revision 10 fixes mobile navigation overflow and viewport sizing, preserves the graph centre during resizing, and supplies a GitHub Pages workflow that publishes the exact static files. See `SCALING-CHECKS.md` for the tested sizes and transfer conditions.
