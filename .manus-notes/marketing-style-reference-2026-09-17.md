# Marketing Style Reference — 2026-09-17

The live marketing home page uses a deep navy-black ground (visually approximately `#080f26`) with warm off-white body copy, an amber/gold action color, fine muted-blue card borders, and editorial serif display headings. The hero screenshot shows the serif headline in warm ivory with selected italic words in gold. The app-side style pass should therefore preserve dense productivity controls while moving global surfaces, rails, cards, borders, display typography, and primary actions into that same navy/ivory/amber family. Focus/PiP and Wren video stage mechanics are excluded from the style-token pass.

## App preview observation

The first shared-browser navigation to the development preview at 2026-09-17 21:29 UTC rendered a blank white page with no detected elements. This is not treated as visual acceptance; use local HTTP/server diagnostics and one subsequent browser recheck before release.

The first development-preview blank render produced no browser console errors. Local HTTP returned the expected app shell and the dev server logged successful HMR updates. Treat the shared-browser preview as temporarily non-rendering and keep release validation source/test based until one confirmed visual render is available.

A later preview inspection confirmed the app shell and Vite bundle both load (`200`, `text/javascript`, 16,962 bytes) but `#root` has zero child elements and no console errors. The preview blank state predates release validation and does not stem from a failed source compilation; full TypeScript and Vitest coverage remains the release gate for this change.
