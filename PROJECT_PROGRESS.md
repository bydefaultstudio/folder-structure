# Project Progress

Track what's been done and what still needs doing across sessions. Add a dated section per meaningful chunk of work, newest first. Claude: keep this file updated as you complete work — it is the cross-session memory for this project.

---

## 2026-07-30 — Fix: live site missing chevron-left/right, pencil-draw, check icons

`icons.manifest.json` (adopted in 1e5afb2) is the sole input to the bd-sprite subset build — nothing scans usage. It had been written from HTML markup only, so the four DS icons referenced from **JS** (edit-chip outdent/indent chevrons + rename pencil in tree-render.js, save-rename check in tree-edit.js) were dropped from the sprite that CI's `npm install` → `bd-sync` regenerates before deploy. Added the four names to the manifest and reran `npx bd-sprite` (13 symbols, DS v2.1.0). Reaches live on next push. Rule of thumb saved to memory: any new `icons.svg#<name>` usage — especially JS-injected — needs a manifest entry.

---

## 2026-07-30 — Expand/collapse-all toolbar toggle

New icon-only button in the zoom cluster (after Fit to view) on both `index.html` and `embed.html`, using the tree's own `folder`/`folder-open` sprites from `project-icons.svg`. The icon previews the result of clicking: open folder = "Expand all" whenever any nested folder is closed (mixed or fully collapsed), closed folder = "Collapse all" only once every nested folder is open. Top-level folders (direct children of the virtual root) are excluded from the state check and forced open on collapse, so the first level always stays visible (per Erlen's spec).

- **tree-model.js 1.2.0** — `setAllOpen(open)` + `allNestedOpen()` on the model API; emits `set-all-open` (full re-render via the reason-agnostic `fs:modelchange` listener). Like `toggle()`, deliberately not in undo history. `allNestedOpen()` returns false when nothing is nested so the button defaults to "expand all"
- **app.js 1.2.0 / embed.js 1.1.0** — `toggle-all` action branch (setAllOpen then `canvas.fit()` — render is synchronous on `fs:modelchange`, so fit measures the fresh layout, same as start-fresh/import) + `updateToggleAllButton()` (swaps sprite href, `data-icon`, aria-label, tooltip) wired to `fs:modelchange` and run at init; duplicated in embed.js mirroring the existing zoom-handler duplication (embed deliberately omits app.js)
- Verified via node harness (stubbed globals): mixed→expand, full-expand→collapse, root stays open, manually-closed root reopened on collapse, no-nested-folders default, change events emitted

The structure travels in the URL fragment — no backend, no storage (reverses the brief's "shareable URLs" non-goal, now marked shipped there). Grammar documented in `docs/tree-notation.md` → Share-Link Fragment Encoding: `#t=<version char><base64url payload>[&theme=light|dark]`, version `1` = deflate-raw of the unicode-tree text, `0` = uncompressed fallback.

- **`tree-share.js` (new)** — pure fragment codec (`FolderStructure.share`): `encodeTree`, `parseFragment`, `decodePayload`, `decodeFragment`. Native `CompressionStream('deflate-raw')` + base64url, no deps
- **`embed.html` + `embed.js` (new)** — read-only viewer at `/embed`: decodes the fragment, imports via the canonical recipe, fits. Loads model/parsers/layout/render/canvas/keyboard only — no tree-edit/app.js, which (plus CSS gating on `.is-edit-mode`) is what makes it read-only. Pan/zoom/click-to-toggle/keyboard nav all work; zoom cluster + "Made with" branding link (round-trips the same fragment into the editor); error card on bad/missing payloads; `noindex`. `&theme=` override for hosts whose dark mode can't reach the iframe
- **`tree-model.js` 1.2.0** — `window.FolderStructureConfig` opt-outs: `{persist:false}` skips load/save (embed must never read or clobber the visitor's `folder-structure:v1`; save() fires on every view change incl. fit), `{sample:false}` starts empty (no sample flash before decode). Also `setAllOpen`/`allNestedOpen` powering the new expand/collapse-all zoom-cluster button on both pages (icon previews the action; top-level folders always stay open)
- **`tree-keyboard.js` 1.2.0** — guards the unconditional `edit.getMode()` deref so keyboard nav works where tree-edit is absent
- **Export dialog** — fifth segment "Embed": iframe snippet (or plain URL via "for Notion" checkbox), async preview guarded by a monotonic token against stale writes, empty-tree hint, >2,000-char URL warning. Hard-coded `https://` base (no http→https redirect on the subdomain; http would be mixed content in Notion)
- **app.js 1.1.0** — share-link import on boot: decode fragment → import → `history.replaceState` clears the hash → toast with **Undo** (the safety net for the visitor's replaced tree). Import recipe deduped into `applyImportedTree` (shared with dialog import)
- **build-dist.js** — now also copies `embed.html`; docs/setup.md build-contract bullet updated (+ note that `/embed` depends on no anti-framing headers)
- Verified locally (Node codec suite + headless-Chrome/puppeteer against `dist/`): codec round-trip incl. unicode + uncompressed fallback + clean rejects; embed renders read-only (zero visible edit affordances) with working pan/zoom/click-toggle/keyboard; persistence isolation (embed never touches `folder-structure:v1`); error states; `theme=dark`; index share-link import with hash-clear + toast Undo; export-dialog race guard, plain-URL mode, empty-tree warning; cross-origin iframe render; `/embed` extensionless route 200 with no anti-framing headers under `wrangler dev`. Still pending post-deploy: a real Notion paste test on the live URL

---

## 2026-07-29 — Edit UX: selection-driven actions chip, save-rename toggle

Per Erlen's feedback (uncommitted; source `assets/` only, `dist/` rebuilds via CI):

- **Selected row state**: `updateRowEl` now toggles `.is-selected` on the row whose id matches `model.state.focusedId` — selection *is* the focused node, no parallel state. Visual: subtle pill (`--background-faded`, `inset: 4px -6px`, `--radius-xs`) on a `.tree-item::before` pseudo at `z-index: -1` — the row's inline transform makes it a stacking context, so the pill sits under icon/label but above connectors without touching row geometry
- **Actions chip reveal is click-only**: dropped `:hover`/`:focus-within` from the reveal rule; only `.is-edit-mode .tree-item.is-selected` shows it, so it no longer fights the add-pills between rows. Note: something is always selected (focusedId defaults to the first row), so in edit mode one chip is always visible
- **Divider in the chip**: DS `.divider--vertical` span between the organising buttons (add/move/indent) and rename/delete, with a `margin: 0` context override in style.css (chip gap provides spacing)
- **Rename button toggles pencil ↔ check** (`setRenameButton` in tree-edit.js swaps the sprite href + aria-label/tooltip); clicking the check commits. Same `data-action="rename"`: click handler commits when `renamingId === id`, else starts
- **Fixed rename-loss bug**: clicking another row while renaming used to re-render (via tree-canvas `activateNode`) and destroy the input before the bubble-phase commit ran, silently dropping the typed name. Outside-click commit now runs in a **capture-phase** document listener (chip clicks excluded — the bubble handler owns those); other chip actions while renaming commit first. `commitRename` also cleans up `is-renaming`/check icon if the input is already gone
- **Moves keep selection + focus**: reordering re-inserts the row element, which drops DOM focus; both the button path (tree-edit) and Alt+arrows (tree-keyboard) refocus the row after move/indent/outdent. `.is-selected` persists regardless since focusedId doesn't change
- Print: chip + selection pill suppressed in `@media print`
- Versions bumped to 1.1.0 (tree-render, tree-edit, tree-keyboard)

## 2026-07-29 — LIVE at folder-structure.bydefault.studio ✅

Custom domain attached (by Erlen, in the dashboard). Verified end to end against the live origin:

- **DNS + TLS**: resolves (172.67.182.50 / 104.21.83.218), HTTP/2, valid Google Trust Services cert (issued 28 Jul, expires 26 Oct 2026), auto-provisioned by the Custom Domain
- **All assets 200 with correct MIME types**: HTML, all three stylesheets, all 10 JS modules, OG jpeg, both SVG sprites, favicon
- **Nothing internal leaked** — 404 on `CLAUDE.md`, `PROJECT_BRIEF.md`, `PROJECT_PROGRESS.md`, `DESIGN.md`, `README.md`, `package.json`, `package-lock.json`, `wrangler.jsonc`, `docs/setup.md`, `docs/site/index.html`, `templates/page-template.html`, `scripts/build-dist.js`, `.git/config`. The `dist/`-only build contract holds in production
- **Served HTML is byte-identical to local `dist/index.html`**, confirming the deployed version is the current commit
- **App actually boots** (headless Chrome DOM dump of the live URL): 8 `role="treeitem"` nodes + `role="tree"` + 6 `aria-expanded` rendered by JS, against 0 tree nodes in the static HTML. Not just a static-asset check — the modules load and run in production

**Open item — no HTTP→HTTPS redirect on this subdomain.** `http://folder-structure.bydefault.studio/` returns 200 rather than a 301, while `http://bydefault.studio/` does 301. Either zone-wide **Always Use HTTPS** is off, or it is being bypassed — a Worker on a Custom Domain is treated as the origin, and Rules evaluate before Workers. Fix with **Always Use HTTPS** (SSL/TLS → Edge Certificates) and, if that doesn't take effect, a **Redirect Rule** on the hostname, which reliably runs ahead of the Worker. Couldn't verify or change the setting: the read-only token has no zone-settings scope. Worth closing before launch, along with flipping `noindex` → `index, follow`.

## 2026-07-29 — CI green; canonical URLs moved to the custom domain

- **Push-triggered CI confirmed working**: pushed `14f0c4c` at 21:22:33Z, Workers Builds deployed version `d330d926` at 21:22:59Z (26s), worker version count 3 → 4, `has_assets: true`. Builds show `source: "wrangler"` because the CI container runs `npx wrangler deploy`
- `index.html` canonical / `og:url` / `og:image` / `twitter:url` / `twitter:image` moved from the deleted `folder-structure-4zp.pages.dev` to **`https://folder-structure.bydefault.studio`** — they were pointing at a dead origin, so social previews would have 404'd
- **Still outstanding:** attach the custom domain in the dashboard (Workers → folder-structure → Domains & Routes). Claude has no write scope for this — the claude.ai Cloudflare MCP token is read-only and wrangler's OAuth token has no DNS write. Until it's attached, the canonical URL does not resolve (site is still `noindex`, so no SEO cost)
- Reading build status via the MCP token returns empty arrays (no scope for the Builds API); worker `modified_on` + version list is the usable progress signal instead

## 2026-07-29 — Fixed first CI build failure (bun vs npm)

Build #3667cdf3 failed at Installing: `no commit matching "semver:^1.5.0" found for "@bydefaultstudio/design-system"`.

- **Root cause:** the template gitignores `package-lock.json`, so the repo shipped no lockfile. Cloudflare picks its package manager from the lockfile and, finding none, fell back to **bun** — which resolved the repo but cannot handle a `#semver:` range on a git dependency (npm can; tags v1.5.0/v1.6.0/v2.0.0 all exist)
- **Fix:** stopped gitignoring `package-lock.json` and committed it, which forces npm. `.gitignore` carries a comment explaining why, so nobody re-ignores it
- **Red herring ruled out:** npm records the dep as `git+ssh://git@github.com/…` in the lockfile, which looks unauthenticatable in a keyless container. Verified it isn't: `GIT_SSH_COMMAND=/bin/false npm ci` with a cold cache installs 1.6.0 fine — npm falls back to GitHub's anonymous HTTPS tarball for public repos. Tested against the exact committed package.json + lockfile
- Also briefly switched the dep spec to `git+https://` and **reverted it** — bun's failure is about the `#semver:` range, not the protocol, so npm normalises it straight back to ssh and the change bought nothing
- Lockfile regenerated from clean (`rm -rf package-lock.json node_modules && npm install`); it had been stale from the template, still naming the project `project-template`

## 2026-07-29 — Switched to Workers static assets + GitHub CI

- Deleted the direct-upload Pages project (`folder-structure-4zp.pages.dev` is gone). Cloudflare cannot convert direct-upload projects to git-connected, and the dashboard's git flow now creates **Workers with static assets**, not Pages
- `wrangler.jsonc` converted from Pages format (`pages_build_output_dir`) to Workers format (`assets.directory: "./dist"`); `npm run deploy` now calls `wrangler deploy` (not `wrangler pages deploy`). Validated with `wrangler deploy --dry-run`: 48 assets read, config accepted
- **CI settings** (dashboard, Workers → connect to git): build `npm install && npm run build`, deploy `npx wrangler deploy`, non-production branch builds on. The `npm install &&` prefix is load-bearing — design-system.css is gitignored and the build script exits without it
- Don't mix the two routes: a Pages-format config plus a Workers project (or vice versa) creates a second competing project

## 2026-07-29 — Cloudflare Pages deploy prep

- Deploy route: **direct upload via wrangler** (no GitHub remote yet; the design-system package installs from a GitHub repo a CF build container can't fetch, so git-integration builds are off the table for now)
- New `scripts/build-dist.js` + `npm run build` — assembles `dist/` with only `index.html` + `assets/` so internal docs/markdown/tooling are never publicly served; refuses to run before `npm install` (design-system.css must exist)
- `npm run deploy` = build + `wrangler pages deploy` (`wrangler.jsonc`: project `folder-structure`, output `dist`); wrangler already OAuth-authenticated as erlen@bydefault.studio
- Pages project created: `folder-structure` — but the bare `folder-structure.pages.dev` name was taken globally, so the assigned URL is **https://folder-structure-4zp.pages.dev/**; canonical/OG/Twitter URLs in `index.html` updated to match (revisit both at launch alongside the `noindex` flip, when a custom domain lands)
- The claude.ai Cloudflare MCP token is **read-only for Pages** (list works, create returned auth error) — writes go through wrangler
- `docs/setup.md` Deployment section rewritten for this project's route; docs regenerated
- **Deployed:** live at https://folder-structure-4zp.pages.dev/ (39 files; verified 200s, internal docs confirmed not served)
- **GitHub:** initial commit pushed to https://github.com/bydefaultstudio/folder-structure (private, `main`); design-system-dist is public so CF git-integration builds can `npm install` it
- **Still manual (needs CF dashboard):** custom domain `folder-structure.bydefault.studio` — both the claude.ai Cloudflare MCP token and wrangler's OAuth token lack the needed write scopes (MCP is read-only; wrangler has no DNS write / no domain CLI). After the domain is live: flip canonical/OG URLs in `index.html` and redeploy
- **Note:** the existing Pages project is direct-upload type — Cloudflare cannot convert it to git-connected; switching to git integration means deleting it and recreating from the repo (build: `npm install && npm run build`, output: `dist`)

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
