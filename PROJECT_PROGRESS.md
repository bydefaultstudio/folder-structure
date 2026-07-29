# Project Progress

Track what's been done and what still needs doing across sessions. Add a dated section per meaningful chunk of work, newest first. Claude: keep this file updated as you complete work — it is the cross-session memory for this project.

---

## 2026-07-29 — Cloudflare Pages deploy prep

- Deploy route: **direct upload via wrangler** (no GitHub remote yet; the design-system package installs from a GitHub repo a CF build container can't fetch, so git-integration builds are off the table for now)
- New `scripts/build-dist.js` + `npm run build` — assembles `dist/` with only `index.html` + `assets/` so internal docs/markdown/tooling are never publicly served; refuses to run before `npm install` (design-system.css must exist)
- `npm run deploy` = build + `wrangler pages deploy` (`wrangler.jsonc`: project `folder-structure`, output `dist`); wrangler already OAuth-authenticated as erlen@bydefault.studio
- Pages project created: `folder-structure` — but the bare `folder-structure.pages.dev` name was taken globally, so the assigned URL is **https://folder-structure-4zp.pages.dev/**; canonical/OG/Twitter URLs in `index.html` updated to match (revisit both at launch alongside the `noindex` flip, when a custom domain lands)
- The claude.ai Cloudflare MCP token is **read-only for Pages** (list works, create returned auth error) — writes go through wrangler
- `docs/setup.md` Deployment section rewritten for this project's route; docs regenerated
- **Not yet done:** first actual deployment (`npm run deploy`), initial git commit (repo still has zero commits)

## 2026-07-29 — Feedback round 2: edit bar + undo/redo

- Edit mode control is now a **`.form-toggle` switch** (design-system component, `is-label-right` so the switch sits left of "Edit") in a new **bottom-center `.edit-bar`**, alongside **undo/redo** buttons (DS `back-arrow` icon, mirrored via `.icon-flip-x`) and **Start fresh** (moved out of the top toolbar)
- **Real undo/redo history** in tree-model: snapshot stack (cap 100) taken before every structural mutation (add/rename/remove/move/indent/outdent/replace — toggling open/close deliberately excluded); `Cmd/Ctrl+Z` and `Shift+Cmd/Ctrl+Z` work outside text fields; buttons disable when their stack is empty; the delete toast's Undo now rides the same history
- **Start fresh** now seeds an example structure (my-project → first-folder with two files, second-folder, read-me.txt) instead of a lone empty root

## 2026-07-29 — Feedback round 1

Erlen's first hands-on review, all fixed and re-verified in browser:

- Rename input was invisible (engine's `width:100%` collapses inside the shrink-wrapped label) — now explicit `ch` width, grows while typing
- Row actions became a solid floating chip (`.tree-item-actions`) right of the label — no longer stretches the row or visually collides with the first-child connector arm
- Fade logic reworked: rows fade **only when a sibling folder is open** (per group, computed in tree-layout); with nothing open a group reads at full strength; multiple open folders all stay primary
- New: **add-child** action on folders (+ icon); **indent/outdent** (chevrons + Alt+→/←) re-parent nodes — this is how files move into folders until drag lands
- Edit mode toggle moved to its own floating menu bottom-left; add-pill type toggle now shows the type it will add (was inverted)
- Dialog backdrop blur removed; toasts now top of the stack (z 9999)

## 2026-07-29 — v1 of the tool built

Built the full interactive canvas tool per the approved plan (see Figma node 17949-63391 in the By Default website file):

- **Modules** (`assets/js/`, load order): `tree-model` (data + ops + localStorage), `tree-parsers` (5 input formats, auto-detect), `tree-serializers` (4 output formats + fence), `tree-layout` (cascading-column geometry, 40/30/24/5px contract), `tree-render` (keyed DOM diff, ARIA tree + flat connector/pill layers), `tree-canvas` (pan/zoom/pinch/fit/click-to-center), `tree-edit` (edit mode, add pill w/ folder-file toggle, rename, delete+undo, reorder arrows), `tree-keyboard` (ARIA treeview nav), `app` (toolbar, import/export dialogs, toasts, boot)
- **Assets**: `assets/icons/project-icons.svg` — project-owned currentColor sprite from the connector/folder/document/arrow SVGs (never edit the synced `icons.svg`)
- `index.html` rebuilt as the full-screen app shell; all new CSS in `assets/css/style.css` (app shell, canvas, tree, pills, floating chrome, reduced-motion/print)
- **Verified**: 21/21 parser/serializer round-trip + chaos tests in Node; Playwright-driven browser suite (click-to-toggle+center, edit mode, pill add + inline rename, keyboard nav, export preview + formats, import auto-detect, dark mode, pan, reload persistence, corrupt-storage recovery) — all pass, zero console errors
- **Notable fix**: `setPointerCapture` on pointerdown retargeted composed click events to the viewport (rows never got clicks) — capture now starts only when the 4px pan threshold is crossed
- Canvas motion uses `--duration-m`/`--ease-out` (the page-swap token at 1200ms felt floaty)

**Deferred (fast-follow):** drag-to-move nodes, shell-commands + JSON export, shareable URLs, multi-step undo, minimap, virtualization for >2k nodes. `noindex` still set — switch to `index, follow` at launch.

## 2026-07-29 — Project onboarding

Cloned the studio template, fresh `git init` (not yet connected to GitHub), and completed onboarding:

- Interviewed Erlen and filled in `PROJECT_BRIEF.md` — public static tool to visualise folder structures (paste-to-generate or manual editing, AI-ready text output), Cloudflare Pages, ASAP timeline
- Propagated the project name (Folder Structure / `folder-structure`) across `README.md`, `index.html`, `templates/page-template.html`, `docs/docs.config.js`, `package.json`
- Applied the By Default brand in `assets/css/theme.css` (tokens sourced from the live theme at bydefault.design): Zalando Sans + IBM Plex Mono self-hosted in `assets/fonts/`, Kaneda Gothic via Typekit, warm palette + accent ramps. ES Face / Bugrino / Caput not shipped — slots fall back to Zalando Sans
- Trimmed `CLAUDE.md`: removed completed onboarding section, non-applicable MCP integrations (Webflow/Notion/Slack), corrected stack to static HTML/CSS/JS
- Regenerated the docs site

## Onboarding

- [x] Run `npm install` (syncs the design system)
- [x] Fill in `PROJECT_BRIEF.md`
- [x] Propagate the project name across the template
- [x] Apply brand tokens in `assets/css/theme.css`
- [ ] Replace logo (`assets/images/logo.svg`) and favicons (`assets/icons/`)
- [x] Regenerate the docs site (`npm run docs:build`)
- [ ] Configure hosting on Cloudflare Pages (build command `npm install`, publish directory `/`)
- [ ] Connect repo to GitHub

## Next up

- Build v1 of the tool: input parser (ASCII tree / indentation / path list), interactive tree renderer, manual editing, copy-out text output — see `PROJECT_BRIEF.md` §9 open questions
