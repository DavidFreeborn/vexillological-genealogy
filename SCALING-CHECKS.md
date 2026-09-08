# Hosting and scaling checks

Version 10, checked in Chrome on 8 September 2026.

## Corrections

- The mobile navigation uses search and the family selector, which includes Whole atlas and Largest connected component. Duplicate desktop buttons previously pushed the selector outside the page.
- Desktop workspace height follows the actual header height through a grid layout. It accommodates wrapped headings and different viewport heights.
- Resizing preserves zoom and the world position at the centre of the graph.
- On tablets, details open over the right side of the graph, preserving a usable canvas width.
- The GitHub Pages workflow uploads the exact `dist/` files. It applies no theme, framework conversion or additional page wrapper.

## Checked viewports

The application was rendered in same-origin frames with the following viewport dimensions. Phone content widths reflect the browser's vertical scrollbar.

| Frame | Content width | Page scroll width | Horizontal overflow |
| --- | ---: | ---: | --- |
| 320 × 740 | 305 | 305 | None |
| 390 × 844 | 375 | 375 | None |
| 768 × 1024 | 768 | 768 | None |
| 1024 × 768 | 1024 | 1024 | None |
| 1440 × 900 | 1440 | 1440 | None |
| 1920 × 1080 | 1920 | 1920 | None |

The application loaded both at the web root and under `/vexillological-genealogy/`. At 1440 × 900, the Nordic view used identical graph translations and a scale of 0.72 on both paths. The runtime files were byte-identical. Changing Nusantara's Lookalikes filter successfully invoked the bundled worker and added Monaco under the project path.

Browser resizing preserved the zoom level. The mobile selector, search, image loading and family switching were inspected. The underlying 60 genealogy/layout checks passed in version 9; version 10 changes page sizing and viewport handling, leaving the historical dataset and graph geometry unchanged.

## Integration requirements

Publish `dist/` directly with the included workflow, or copy its contents unchanged to a static subdirectory on the personal website. Give embedded frames their own full-width area and adequate height. Link to the standalone page for unrestricted viewing. Importing the atlas CSS into a host page would allow the host's styles to affect the atlas, so use its own page or an iframe.

## Remaining verification

A live GitHub Pages publication has not been tested because repository creation is unavailable through the connected GitHub tools. The checks above reproduce a project subdirectory locally. Mobile device hardware, Safari, Firefox and operating-system text enlargement have not been separately tested.
