# Roadmap

A bank of feature ideas for the folder-structure tool. Ideas start here as rough notes — no commitment implied. When one gets picked up, move it to **In Progress** and log the work in `PROJECT_PROGRESS.md`.

## Ideas

### Export as image (SVG / PNG)

**Added:** 2026-07-30

Export the diagram as an image alongside the existing text formats. SVG is the natural fit (the diagram is vector geometry already); PNG derives from the SVG.

**Scope options** (radio in the export dialog):

- Whole diagram, collapsed (top level only)
- Whole diagram, expanded (every folder open)
- As currently shown on screen

**Principle** — build the SVG from layout, not from the DOM. `tree-layout.js` is pure (model in → rows/connectors/bounds out, no DOM writes), so the exporter re-runs layout offscreen and draws the result itself. No screenshot library (html2canvas etc.), no mutation of the on-screen tree, no screen flicker.

**Implementation steps:**

1. **New module `assets/js/tree-export-image.js`** — one responsibility: turn a model + scope option into a downloadable SVG or PNG. Follows the module conventions (single init, named functions, version log).
2. **Scope handling** — open/closed state is model data, so for each scope option pass an openness override into layout: all folders closed, all open, or the current state untouched. The on-screen view is never modified.
3. **SVG serialization** — walk the layout output and emit a standalone SVG document: one `<text>` per label, `<use>` per icon/connector glyph, positioned from the layout geometry (40px rows, 30×40 connector cells).
4. **Inline the sprite symbols** — fetch `assets/icons/project-icons.svg`, copy only the referenced `<symbol>`s into the exported SVG's `<defs>`, and point `<use>` at internal `#id` refs. External sprite refs don't resolve in a standalone file.
5. **Resolve colors at export time** — read the semantic tokens via `getComputedStyle` and bake the computed values into the SVG, so the export matches the active light/dark theme.
6. **Embed the brand font** — fetch the woff2 from `assets/fonts/`, base64 it into an `@font-face` inside a `<style>` block in the SVG. Required for the SVG to render correctly off-site and for PNG rasterization (canvas won't load external resources).
7. **PNG pipeline** — SVG string → blob URL → `new Image()` → draw to `<canvas>` at 2× scale → `canvas.toBlob('image/png')` → download via a temporary anchor. Works only because steps 4–6 make the SVG fully self-contained.
8. **Export dialog UI** — format choice (SVG / PNG) + scope radios, using the design system dialog module already adopted for the app.

All client-side — fits the static / Cloudflare Workers hosting.

**Open questions:**

- Background: themed vs transparent (and light/dark choice independent of the site theme?)
- Should comment pills be included ("Include comments" toggle, like text export)?
- PNG scale option (1× / 2×)?
- Does "collapsed" mean root open with depth-1 children visible, or literally just the root row?

## In Progress

### File details / annotations

**Added:** 2026-07-30 · **Status:** Implemented 2026-07-30, pending browser QA

Add a short comment/description to any file or folder (what it's for, conventions, gotchas). Comments use the `# comment` suffix notation the parser already tolerates (tree-parsers.js strips them today).

**UI (revised 2026-07-30 after first build)** — floating pill, not inline text:

- The comment renders in a floating pill to the right of its row, visible only while the row is selected; as an overlay it never affects tree geometry or overlaps child rows (every row owns its horizontal line)
- The pill carries its own toolbar and is the single comment control (revised again same day: the chip's chat button was redundant and removed). In edit mode the pill shows on every selected row, collapsed to just its chat button until a comment exists; the button toggles chat ↔ check while editing
- Inline input inside the pill; Enter saves, Esc cancels; `maxlength` 80, single line
- Open folders: pill floats past the connector arm so the elbow stays visible
- Rows with a comment show the full pill (text + toolbar) whenever selected

**Toggles:**

- Paste/import: "Strip comments" toggle, default **on** (today's behavior); off = captured as annotations
- Export: "Include comments" toggle, default **off**; only relevant when the diagram has comments
- Nicety: when pasted text contains comments, prompt "Comments detected — keep them?" so they aren't lost silently

**Export formats:**

- All four formats use the `  # comment` suffix (markdown too — the em-dash variant couldn't round-trip through the parser, so it was dropped during implementation)
- No column alignment (keeps the grammar simple)
- Round-trip property preserved: parser captures exactly what the serializer emits; share/embed links always carry comments

## Done

_Nothing yet._
