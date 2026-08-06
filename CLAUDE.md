# Claude Code Rules

**Project:** `folder-structure` — a public static tool for visualising folder structures as an interactive tree. Users paste code/text to auto-generate a diagram or build one manually, then copy AI-ready text output describing the structure. Live at https://folder-structure.bydefault.studio, deployed to Cloudflare Workers static assets.

Stack: static HTML, CSS, JavaScript — no backend, no framework. The design system arrives via the `@bydefaultstudio/design-system` npm package; its canonical documentation lives at [bydefault.design](https://bydefault.design/website/).

- Design rules live in `DESIGN.md` at the project root (synced from the package) — follow it for all HTML and CSS: semantic tokens over primitives, existing utility classes over new CSS, no inline styles, no invented naming patterns
- Only write new CSS if the design system can't express the requirement — and if so, add it to `assets/css/style.css`
- Accessibility required: keyboard navigation, `aria-label`, focus states, `<button>` for actions, `<a>` for links
- If something can't be implemented cleanly with existing patterns, pause and ask — never guess

---

## Read Order

Before generating or modifying code, treat these as authoritative (fetch the design-system docs with WebFetch when needed):

0. `HANDOVER.md` — **read this first every session**: current state, what to pick up, what's blocked (local file, not committed)
1. `docs/tree-notation.md` — the tree notation spec (parsers, serializers and share links treat it as authoritative)
2. `docs/tree-prompt.md` — the AI prompt spec (byte-identical twin of `assets/js/tree-prompt.js`)
3. `docs/folder-structure.md` — file organization rules
4. `DESIGN.md` — design system rules; for token, component and layout detail beyond it, browse [the design system docs](https://bydefault.design/website/)

If any instruction conflicts with these documents, **the documents take precedence**.

---

## CSS Structure

- `assets/css/design-system.css` — synced from the npm package on `npm install`; never edit; ships neutral engine defaults
- `assets/css/theme.css` — brand overrides; overrides §1/§2 primitive tokens directly and must load after design-system.css
- `assets/css/style.css` — project-specific styles (third layer), only when the design system can't express it
- Dark mode: the `[data-theme="dark"]` block in `theme.css` must stay a verbatim mirror of the `prefers-color-scheme` fallback block — drift between them is a known failure mode
- Never hardcode values that should use tokens

## JavaScript Structure

- One responsibility per file; one init function per module
- No anonymous functions, no global variables; use named functions
- Log version and init success

---

## File Organization

See `docs/folder-structure.md` for the complete structure.

**Key locations:**
- `index.html` — the app; `embed.html` — read-only embed viewer
- `assets/css/` — the three-layer CSS contract (design-system → theme → style)
- `assets/js/` — app modules (`tree-*.js`, `app.js`, `theme-toggle.js`, synced `design-system/`)
- `assets/icons/` — favicons, synced `icons.svg` sprite, hand-maintained `project-icons.svg`
- `icons.manifest.json` — the sole input to the design-system sprite build; any new `icons.svg#<name>` reference must be added here or it silently vanishes on deploy
- `scripts/build-dist.js` — builds `dist/` for deploy (copies only `index.html`, `embed.html`, `assets/`)
- `docs/` — markdown documentation

### Design System Sync & Updates

`npx bd-sync` runs as a postinstall step and copies versioned artefacts from `@bydefaultstudio/design-system` into the site: `assets/css/design-system.css`, `assets/css/design-system/`, `assets/js/design-system/`, `assets/icons/icons.svg` (a subset sprite built from `icons.manifest.json`), `assets/icons/cursors.svg`, and `DESIGN.md`. All are gitignored, regenerated on every `npm install`, and never hand-edited; each carries a `@bydefaultstudio/design-system vX.Y.Z` stamp header, so drift against upstream is greppable.

- The dependency pin is a caret range (`#semver:^2.x`), which never crosses a major version. Dependabot opens a PR on every design-system release, but a major bump is a deliberate hand edit, not an auto-merge.
- **Upstream-first:** shared modules only ever change in the design-system repo, then get released and pulled down through a version bump — never patched in place downstream.
- To verify a design-system change here before it ships: `npx bd-sync --local "../Design System"` syncs from the sibling working tree (rebuilding it first).
- To use a new design-system icon: add its name to `icons.manifest.json` (alphabetical) and re-run `npx bd-sync` (or `npm install`). `assets/icons/project-icons.svg` is a separate, hand-maintained, git-tracked sprite for this site's own icons; a few of its names collide with design-system icon names — that's fine, the two sprites are never merged.
- **Toast is the last hand-rolled component** — `app.js` builds its own against the design-system CSS classes because the packaged module has no action-button support and the delete / share-import toasts depend on **Undo**. Adopting it means adding an `action` option upstream first; see the toast entry in `ROADMAP.md`.

### Local Preview — always port 3100

The local address for this project is **http://localhost:3100/** — never pick another port (`.vscode/settings.json` pins VS Code Live Server to `3100` with root `/`; the studio-wide port registry lives in the Design System repo's `CLAUDE.md`). Serve the **repo root**, not `dist/`.

If Live Server isn't running: `python3 -m http.server 3100 --bind 127.0.0.1`. If running `wrangler dev`, pass `--port 3100`.

Routes to check: `/` (the app), `/embed.html` (embed view). The app also runs over `file://`, but `localStorage` needs http, so persistence tests must run against localhost.

---

## Documentation Discipline

If you introduce a new pattern, change a rule, or modify the CSS structure, update the relevant documentation file and explain why the change exists — keep code and documentation in sync.

Two files are paired: the prompt block in `docs/tree-prompt.md` and `assets/js/tree-prompt.js` must stay byte-identical — edit both together.

---

## Session Tracking

Three files carry work across sessions and must not duplicate each other. `HANDOVER.md` and `ROADMAP.md` are local working notes (gitignored, never committed); `PROJECT_PROGRESS.md` is committed.

- **`HANDOVER.md`** — the live state-of-play. Read it at the start of every session and **rewrite it at the end** (overwritten, never appended to)
- **`PROJECT_PROGRESS.md`** — append-only record of what shipped, dated sections newest first. Never a to-do list
- **`ROADMAP.md`** — feature bank (Ideas → In Progress → Done) plus the launch checklist

Never mark a task complete without proving it works: diff behaviour before and after, and check docs are updated if patterns changed. When given a bug report, find the root cause — don't patch symptoms.
