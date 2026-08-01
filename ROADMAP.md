# Roadmap

A bank of feature ideas and outstanding work for the folder-structure tool. Ideas start here as rough notes — no commitment implied. When one gets picked up, move it to **In Progress**; when it ships, move it to **Done** and log the detail in `PROJECT_PROGRESS.md`.

**Companion docs:** `HANDOVER.md` is the live state-of-play between sessions (rewritten each time); `PROJECT_PROGRESS.md` is the append-only history of what shipped; `PROJECT_BRIEF.md` holds intent and constraints.

## Launch checklist

Concrete work standing between the tool and a public launch. Not feature ideas — these are known gaps.

- [ ] **HTTP→HTTPS redirect on the subdomain.** `http://folder-structure.bydefault.studio/` still returns `200` rather than a `301` (re-verified 2026-07-31), while `http://bydefault.studio/` redirects correctly. Fix in the Cloudflare dashboard: SSL/TLS → Edge Certificates → **Always Use HTTPS**; if the Worker bypasses it, add a **Redirect Rule** on the hostname (Rules evaluate before Workers, and a Worker on a Custom Domain *is* the origin). **Erlen's action** — the tokens available to Claude here are read-only. Closing this also retires the hard-coded `https://` embed base in `app.js`, which exists only because plain http would be mixed content inside Notion.
- [ ] **Flip `noindex, nofollow` → `index, follow`** in `index.html:14` at launch. `embed.html:14` stays `noindex` deliberately — embeds should not compete with the tool in search results.
- [ ] **Replace the favicons and `logo.svg`.** `assets/icons/favicon.{svg,ico}`, `favicon-32x32.png`, `apple-touch-icon.png` and `assets/images/logo.svg` are still the studio template's mark, untouched since the clone. The in-app wordmark comes from `project-icons.svg`, so this only affects browser tabs, bookmarks and social cards.
- [ ] **Real Notion paste test** of the embed snippet against the live URL. Only ever tested under `wrangler dev` and in a local cross-origin iframe.
- [ ] **Hands-on QA of the comment pills** — pill feel across zoom levels, dark mode, inside embeds, VoiceOver. Headless coverage passed (32/32), but no human has looked at it.

## In Progress

_Nothing in flight._

## Ideas

### File-type icons by extension

**Added:** 2026-08-01

Every file in the tree draws the same `document` icon. Give it an icon that matches its extension instead — `styles.css` gets the CSS mark, `track.mp3` gets the audio mark — so a structure can be read by shape as well as by name.

**Blocked on the icons existing.** The design system is at v2.1.1 and its 169-icon library has no file-type icons in it; the four that exist (`.md`, `.html`, `.json`, `.css`) live outside the package so far. Nothing here can be built until they're published upstream — the point of this entry is to settle the format list and the mapping so the design work has a target.

#### Proposed format list

One icon per **row** below, not per extension — a single mark covers everything on its line. Names are a proposal; the code follows whatever the design system publishes.

**Tier 1 — the batch worth designing first.**

| Icon | Extensions covered |
| --- | --- |
| `file-md` ✅ exists | `.md` `.mdx` `.markdown` |
| `file-html` ✅ exists | `.html` `.htm` |
| `file-json` ✅ exists | `.json` `.jsonc` |
| `file-css` ✅ exists | `.css` `.scss` `.sass` `.less` |
| `file-js` | `.js` `.mjs` `.cjs` `.jsx` |
| `file-ts` | `.ts` `.tsx` |
| `file-image` | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.avif` `.heic` `.tif` `.tiff` `.bmp` |
| `file-svg` | `.svg` |
| `file-video` | `.mp4` `.mov` `.webm` `.avi` `.mkv` `.m4v` |
| `file-audio` | `.mp3` `.wav` `.aiff` `.aif` `.m4a` `.flac` `.ogg` |
| `file-pdf` | `.pdf` |
| `file-zip` | `.zip` `.rar` `.7z` `.tar` `.gz` `.tgz` |
| `file-font` | `.woff` `.woff2` `.ttf` `.otf` `.eot` |
| `file-design` | `.fig` `.sketch` `.xd` `.psd` `.ai` `.indd` `.afdesign` `.afphoto` |
| `file-text` | `.txt` `.rtf` |
| `file-config` | `.yml` `.yaml` `.toml` `.ini` `.env` `.lock` + extensionless dotfiles (`.gitignore`, `.npmrc`) |
| `file-code` | `.py` `.rb` `.php` `.go` `.rs` `.java` `.c` `.h` `.cpp` `.cs` `.swift` `.kt` `.sh` `.zsh` `.vue` `.svelte` |

Thirteen new marks. `file-svg` is split out from `file-image` deliberately — for a design studio's tool the vector/raster distinction is one users actually care about.

**Tier 2 — add if real structures ask for it.** `file-doc` (`.doc` `.docx` `.pages`), `file-sheet` (`.csv` `.tsv` `.xls` `.xlsx` `.numbers`), `file-slides` (`.ppt` `.pptx` `.key`), `file-xml` (`.xml` `.rss` `.plist`), `file-3d` (`.glb` `.gltf` `.obj` `.fbx` `.blend` `.usdz`), `file-db` (`.sql` `.db` `.sqlite`), `file-binary` (`.dmg` `.exe` `.app` `.pkg` `.deb`).

**`document` stays as the fallback** for anything unmatched. That's what makes the list safe to grow one icon at a time and safe to stop anywhere — an unknown extension is never a broken icon, just the generic one.

#### Matching rules

Small print, but each of these is a bug if skipped:

- **Lowercase before lookup** — `IMG_0431.JPG` must match `.jpg`.
- **Last dot segment only** — `app.min.js` → `js`, `styles.test.css` → `css`. `.tar.gz` resolves to `gz`, which maps to the archive icon anyway, so the simple rule gets the compound case right for free.
- **Extensionless dotfiles** — split-on-last-dot turns `.gitignore` into the extension `gitignore`. Match the *whole name* first for leading-dot names with no second dot, then fall through to the extension rule.
- **No extension at all** — `README`, `Makefile`, `LICENSE` → fallback. Worth a whole-name match later if they look bare.
- Names are already comment-free by the time they reach the model; the parser strips `# comment` suffixes.

#### Implementation

Small, once the icons land. The renderer has exactly one place that decides a row's icon.

1. **Publish the icons upstream** (Erlen). They belong in the `@bydefaultstudio/design-system` icon source, released as a version bump; `npm install` then drops them into `assets/icons/icons.svg` here. Do not hand-add them to `project-icons.svg` — that sprite is for marks this project owns, and these aren't.
2. **List every new name in `icons.manifest.json`.** The manifest is the sole input to the sprite build and nothing scans usage, so a JS-injected `icons.svg#file-css` that isn't listed builds locally and silently vanishes on deploy. This has already cost the project once.
3. **New module `assets/js/tree-file-icons.js`** — one responsibility: filename in, sprite + symbol out. It owns the extension table, the matching rules above and the fallback. The table is ~17 entries covering ~80 extensions; that's a data structure, and it doesn't belong inside a rendering module.
4. **Call it from `iconFor(row)`** in `tree-render.js`. That function is the single hook — used by both the create path and the reconcile path — so a rename from `notes.txt` to `notes.md` repaints the icon with no extra wiring, and `embed.html` picks the whole feature up automatically because it loads the same `tree-render.js`.
5. **Return the sprite alongside the symbol.** This is the only structurally interesting bit: file-type icons come from `DS_SPRITE` while folders and `document` come from `SPRITE`, but `iconFor` currently returns a bare symbol id and both call sites hardcode `SPRITE`. `makeIcon`/`setIconHref` already take a sprite argument, so the change is to thread it through rather than to invent anything.
6. **Verify against a fixture** covering every mapped extension plus the edge cases — uppercase, `.tar.gz`, `.gitignore`, extensionless, and a rename that crosses icon types. Then `npm run build` and confirm the symbols are actually present in `dist/assets/icons/icons.svg`, which is the step that catches a missed manifest entry.

#### Open questions

- **Per-format or per-family?** The four existing icons are per-format and all text-ish. Rows like `file-image` and `file-audio` ask for a family mark instead, which is a different design problem. Worth deciding before drawing.
- **Legibility at 24px.** `.tree-icon` renders at 24×24. If the marks carry lettering, `JSON` is four characters in roughly half that width — check the existing four at size before committing the approach to another thirteen.
- **Design formats: one mark or several?** `.fig`, `.psd` and `.ai` sharing `file-design` is the economical call, but this is a design studio's tool and per-app marks might earn their keep.
- **Monochrome.** Every symbol in the sprite is `fill="currentColor"`, which is how tree icons inherit the theme and how the planned image export resolves colour. Per-type tinting would break both — recommend staying monochrome.

**Touches:** the image export idea below inlines "only the referenced `<symbol>`s" (step 4) — with this shipped, that step has to inline from two sprite files rather than one.

### Toast notifications: typed variants + clear the bottom chrome

**Added:** 2026-07-31

Two related changes to how toasts look and where they sit.

**Typed variants.** Every toast today is the default black card. The design system ships four semantic types — use them instead:

```js
showToast('Changes saved.', 'success');
showToast('Connection unstable.', 'warning');
showToast('Failed to save.', 'danger');
showToast('New version available.', 'info');
```

`assets/js/design-system/toast.js` (v1.1.0) exposes `window.showToast(message, type, duration)` with `default | success | warning | danger | info`, and `design-system.css` maps each to the `--status-*-bg` / `--status-*` token pairs. The module is vendored but **not loaded** in `index.html` — the app has its own `toast()` in `app.js`.

Call sites to map: import succeeded → `success`; couldn't read the shared link → `danger`; embed URL over 2,000 characters → `warning`; loaded-a-shared-structure notice → `info`.

**Position.** The toast container is the design-system default — fixed bottom-**right** at `--space-xl` (24px) — and `.zoom-controls` sits bottom-right at `--space-l` (16px). With the toast container overridden to `z-index: 9999` against the chrome's `700`, toasts land squarely on top of the zoom cluster. Raise the container's `bottom` so it clears the tallest bottom chrome, e.g. `bottom: calc(var(--space-l) + <cluster height> + var(--space-m))`, ideally driven by a shared variable rather than a magic number so the two can't drift. The `.edit-bar` is bottom-**left** and doesn't collide.

**Blocker — the module can't do action buttons.** `showToast` takes only `(message, type, duration)`, but the app's toast supports an action button, and two flows depend on it: **Undo** after a delete, and **Undo** after a share link replaces the visitor's tree. Swapping modules as-is would silently drop the only safety net on a destructive action. `DESIGN-SYSTEM-MIGRATION.md` is upstream-first: add an `action` option to the design system's toast, release it, and pull it down through a version bump — do not fork the module locally.

Adopting the module is worth it beyond the colours: it escapes HTML, pauses auto-dismiss on hover and focus (the local one runs a fixed 5s timer regardless, which fails WCAG 2.2.1), sets `role="alert"` for `danger` only, and reparents into an open `dialog:modal` so toasts stay visible above a modal.

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

### Drag to move nodes

**Added:** 2026-07-29 (v1 fast-follow list)

Direct manipulation as an alternative to the indent/outdent chevrons and reorder arrows, which are how nodes move today. Needs a drop-target model (before / after / into a folder) and has to coexist with the canvas's left-drag pan — probably a drag handle or a press-and-hold threshold rather than plain drag-anywhere.

### Shell commands + JSON export

**Added:** 2026-07-29 (v1 fast-follow list)

Two more output formats beside the four text ones: a `mkdir -p` / `touch` script that recreates the structure on disk, and a machine-readable JSON tree. Both are pure additions to `tree-serializers.js`. Shell output needs proper quoting for names with spaces and shell metacharacters — a correctness question, not a formatting one. Neither format needs to round-trip through the parser.

### Minimap

**Added:** 2026-07-29 (v1 fast-follow list)

A small overview panel for navigating large structures, showing the viewport rectangle against the whole diagram's bounds. `tree-layout.js` already returns bounds, so the geometry is available.

### Virtualisation for large trees

**Added:** 2026-07-29 (v1 fast-follow list)

The renderer builds a DOM node per row; past roughly 2,000 nodes that will drag. Only worth doing when a real structure hits the limit — the keyed-diff renderer would need to gain windowing, which is a meaningful complication to take on speculatively.

## Done

Detail for each lives in the dated entries in `PROJECT_PROGRESS.md`.

- **Change a row between folder and file** — shipped 2026-08-01. A swap button in the chip (or `t`) converts either way. File → folder and empty folder → file go straight through; a folder holding anything raises a dialog offering *Keep contents* (children promote one level) or *Delete everything*, sharing its wording with the delete dialog. The node keeps its id, name and comment across the change. Before re-proposing the `refresh` glyph for this: it was considered and rejected because ⟳ reads as reload/reset — see `PROJECT_PROGRESS.md`.
- **Delete a folder: choose branch or contents** — shipped 2026-08-01. Deleting a non-empty folder raises a dialog offering *Delete everything* or *Keep contents* (children promote one level, via the new `model.unwrap`). Files and empty folders skip it. Before re-proposing "just make delete promote children": that was considered and rejected because it removes any way to delete a whole branch in one action — see `PROJECT_PROGRESS.md`.
- **Staged click: select, then toggle** — shipped 2026-08-01. A click selects a row; a click on the already-selected row opens or closes it. Deliberately costs two clicks to open a folder, so that selection (and with it the comment pill and edit chip) costs one and disturbs nothing. Before re-proposing one-click-opens or an icon-as-chevron: both were considered and rejected with reasons — see the dated entry in `PROJECT_PROGRESS.md`.
- **File details / annotations** — shipped 2026-07-30. Comments on any node via `# comment` suffix notation, floating pill UI, opt-in capture on import and emission on export, always carried in share/embed links. (Hands-on QA is still open — see the launch checklist.)
- **Share + embed links** — shipped 2026-07-30. Fragment-encoded structures (`#t=`) and a read-only `/embed` viewer, reversing the brief's "no shareable URLs" non-goal without adding a backend.
- **Expand / collapse-all toggle** — shipped 2026-07-30.
- **Multi-step undo / redo** — shipped 2026-07-29. Snapshot stack capped at 100, `Cmd/Ctrl+Z` and `Shift+Cmd/Ctrl+Z`.
