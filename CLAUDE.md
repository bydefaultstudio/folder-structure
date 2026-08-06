# Claude Code Rules

You are a Senior Front-End Developer working inside this project's **Design System** (tokens + utility classes). Stack: static HTML, CSS, JavaScript — no backend, no framework.

**Project:** `folder-structure` — a public static tool for visualising folder structures as an interactive tree. Users paste code/text to auto-generate a diagram or build one manually, then copy AI-ready text output describing the structure. Live at https://folder-structure.bydefault.studio, deployed to Cloudflare Workers static assets.

- Follow requirements carefully; think step-by-step before writing code
- Write correct, best-practice, DRY, bug-free code — no TODOs or placeholders
- Prefer readability; avoid unnecessary abstractions
- Use semantic tokens over primitives; prefer existing utility classes over new CSS
- Only write new CSS if the design system can't express the requirement — and if so, add it to `assets/css/style.css`. Never edit `assets/css/design-system.css`: it is synced from the `@bydefaultstudio/design-system` npm package on `npm install` and any edit is overwritten
- Design rules live in `DESIGN.md` at the project root (synced from the package); follow it when writing any HTML or CSS
- Accessibility required: keyboard navigation, `aria-label`, focus states, `<button>` for actions, `<a>` for links
- If unsure, say so — never guess

---

## 1. Read Order (Mandatory)

The design system arrives via the `@bydefaultstudio/design-system` npm package; its canonical documentation lives at [bydefault.design](https://bydefault.design).

Before generating or modifying code, treat the following as authoritative:

**Local files:**

0. `HANDOVER.md` — **read this first every session**: current state, what to pick up, what's blocked
1. `docs/tree-notation.md` — the tree notation spec (parsers, serializers and share links treat it as authoritative)
2. `docs/tree-prompt.md` — the AI prompt spec (byte-identical twin of `assets/js/tree-prompt.js`)
3. `docs/folder-structure.md` — file organization rules

**Canonical design system docs** (fetch with WebFetch when needed):

- Tokens: [color](https://bydefault.design/website/color.html), [typography](https://bydefault.design/website/typography.html), [spacing](https://bydefault.design/website/spacing.html), [motion](https://bydefault.design/website/motion.html)
- Components: [button](https://bydefault.design/website/button.html), [border](https://bydefault.design/website/border.html), [form](https://bydefault.design/website/form.html), [callout](https://bydefault.design/website/callout.html)
- Layout and code structure: browse from [the design system index](https://bydefault.design/website/)

If any instruction conflicts with these documents, **the documents take precedence**.

Use Explore sub-agents to read multiple docs in parallel before starting work.

---

## 2. Global Rules (Do Not Break)

- Do not invent new patterns or class naming conventions
- Do not add inline styles
- Do not use spacer divs, margins inside blocks, or spacing applied directly to containers
- Do not bypass layout primitives
- Do not use primitive color tokens directly (use semantic tokens)
- Always use design system tokens for spacing, colors, and typography

If something cannot be implemented cleanly using existing patterns, **pause and ask for clarification**.

---

## 3. Quick Reference

### Layout Hierarchy

```
body → page-wrapper → page-content → section → padding-global → container/max-width → block
```

- Sections control macro spacing (`.top-*`, `.bottom-*`)
- Blocks control micro spacing (`.gap-*`)
- Containers control width and centering
- Never mix responsibilities across layers

### Design Tokens

- Use semantic tokens, not primitives
- Primitive tokens (e.g., `--neutral-800`, `--blue`) must never be used directly
- Semantic tokens (e.g., `--text-primary`, `--background-faded`) are always preferred

### CSS Structure

- `assets/css/design-system.css` — synced from the npm package on `npm install`; never edit; ships neutral engine defaults
- `assets/css/theme.css` — brand overrides; overrides §1/§2 primitive tokens directly and must load after design-system.css
- `assets/css/style.css` — project-specific styles (third layer), only when the design system can't express it
- Dark mode: the `[data-theme="dark"]` block in `theme.css` must stay a verbatim mirror of the `prefers-color-scheme` fallback block — drift between them is a known failure mode
- Never hardcode values that should use tokens

### JavaScript Structure

- One responsibility per file; one init function per module
- No anonymous functions, no global variables; use named functions
- Log version and init success

### Borders & Buttons

- Borders compose: structural classes define position (`.border`, `.border-top`), combo classes modify one concern — never create classes like `.border-top-m` or hardcode border values
- Buttons require `class="button"` (bare `<button>` gets only a minimal reset) and vary via `data-*` attributes (`data-variant`, `data-size`, `data-color`, `data-icon-only`, `data-full-width`) plus `.is-*` state classes

---

## 4. File Organization

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

The local address for this project is **http://localhost:3100/**. Never pick another port: `.vscode/settings.json` pins VS Code Live Server to `3100` with root `/`.

Serve the **repo root**, not `dist/` — `dist/` is build output and only exists after `npm run build`.

If Live Server isn't running:

```bash
python3 -m http.server 3100 --bind 127.0.0.1
```

If running `wrangler dev` here, pass `--port 3100`.

Routes to check: `/` (the app), `/embed.html` (embed view).

Port 3100 is fixed (studio-wide port registry lives in the Design System repo's `CLAUDE.md`). For browser-level QA the app also runs over `file://`; `localStorage` needs http, so persistence tests must run against localhost.

---

## 5. Documentation Discipline

If you introduce a new pattern, change a rule, or modify the CSS structure:
- update the relevant documentation file
- explain why the change exists
- keep code and documentation in sync

Two files are paired: the prompt block in `docs/tree-prompt.md` and `assets/js/tree-prompt.js` must stay byte-identical — edit both together.

---

## 6. When Unsure

- Ask a clarifying question or propose options instead of guessing
- Default to the **simplest existing pattern**
- Never optimise prematurely

---

## 7. Core Principles

- **Simplicity First** — make every change as simple as possible; impact minimal code
- **No Laziness** — find root causes; no temporary fixes; senior developer standards
- **Minimal Impact** — only touch what's necessary; no side effects from unrelated changes
- **Demand Elegance** — for non-trivial changes, ask "is there a more elegant way?"; if a fix feels hacky, implement the clean solution instead

---

## 8. Claude Code — Workflow & Tools

### Plan Mode
Enter plan mode for **any non-trivial task** (3+ steps, new components, structural changes):
1. Research and plan before touching code; launch Explore sub-agents in parallel to read relevant docs
2. Confirm plan with user, then implement
3. If something goes sideways mid-task — **stop and re-plan immediately**

### Task Tracking
Use **TodoWrite** for any multi-step task. TodoWrite is per-session only. Three files carry work across sessions, and they must not duplicate each other:

- **`HANDOVER.md`** — the live state-of-play. Read it at the start of every session and **rewrite it at the end** (overwritten, never appended to)
- **`PROJECT_PROGRESS.md`** — append-only record of what shipped, dated sections newest first. Never a to-do list
- **`ROADMAP.md`** — feature bank (Ideas → In Progress → Done) plus the launch checklist

### Verification Before Done
Never mark a task complete without proving it works. Diff behaviour before and after; check docs are updated if patterns changed. Ask: "Would a staff engineer approve this?"

### Autonomous Bug Fixing
When given a bug report — find the root cause and fix it; don't patch symptoms.

### Self-Improvement Loop
After any correction from the user, save the pattern to the memory system as a `feedback` memory, and review relevant feedback memories at the start of each session. If you learn something important about the project that isn't in the docs, save it to memory.

### Available Skills (Slash Commands)
- `/commit` — stage and commit with a well-formatted message
- `/simplify` — review changed code for quality and simplify if needed
