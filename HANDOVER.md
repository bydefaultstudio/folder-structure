# Handover

The live state-of-play between sessions. **Rewritten at the end of each session, not appended to** — it describes now, not history.

Claude: read this first, act on "Pick up here", and rewrite the whole file before the session ends. If a session produced no state change worth carrying, say so rather than leaving stale content in place.

**Where things belong**

| Doc | Holds | Lifecycle |
| --- | --- | --- |
| `HANDOVER.md` | Current state, what's next, what's blocked and on whom | Overwritten each session |
| `PROJECT_PROGRESS.md` | What shipped, dated, with the reasoning and verification | Append-only, newest first |
| `ROADMAP.md` | Feature ideas and the launch checklist | Ideas → In Progress → Done |

Don't duplicate across them. Handover points at the roadmap; the roadmap owns the task list; progress owns the record.

---

**Last session:** 2026-08-06 · **Branch:** `click-to-select-then-toggle` @ `e33e0ba` + uncommitted work · **Main:** `2870a4c` · **Live:** https://folder-structure.bydefault.studio

## State

**Two distinct piles of uncommitted work are sitting in the tree, from two different sources. Commit them separately.**

1. **File-type icons by extension (this session's work, verified).** Design system bumped to **v2.2.1** (`package.json` spec now `^2.2.0`), which shipped eleven `file*` marks; all are listed in `icons.manifest.json` and land in `assets/icons/icons.svg`. New `assets/js/tree-file-icons.js` 1.0.0 maps extension → symbol; `tree-render.js` 1.8.0's `iconFor` returns `{sprite, symbol}` so file rows draw from the DS sprite while folders stay on `project-icons.svg`; the add-pill's file glyph switched `document` → DS `file`. Script tag added to both `index.html` and `embed.html`. Verified 72/72 in headless Chrome plus a `dist/` build check. Full entry in `PROJECT_PROGRESS.md` under 2026-08-06. Files: `package.json`, `package-lock.json`, `icons.manifest.json`, `assets/js/tree-file-icons.js` (new), `assets/js/tree-render.js`, `index.html`, `embed.html`, `ROADMAP.md`, `PROJECT_PROGRESS.md`, this file.
2. **Public-repo cleanup (a separate Claude session on another machine, 2026-08-06, at Erlen's request).** First the docs site went (`docs/site/`, `docs/docs.config.js`, `docs/upgrading-docs.md`, the `docs:build`/`docs:watch` scripts); then the template-era files: `PROJECT_BRIEF.md`, `templates/`, `docs/setup.md`, `docs/template.md`, `docs/markdown-style.md`, `docs/seo-best-practices.md`, `docs/brand-book.md`. `CLAUDE.md` was rewritten trimmed, `README.md` rewritten product-focused (deployment facts from setup.md folded in), `docs/folder-structure.md` rewritten to match reality (it had listed a nonexistent `scripts/sync-design-system.js` and claimed the lockfile wasn't committed). `DESIGN-SYSTEM-MIGRATION.md` was then also deleted — its live content (bd-sync artefacts, caret-pin rule, `bd-sync --local` flow, icon-manifest mechanics, upstream-first rule, toast rationale) moved into `CLAUDE.md` → *Design System Sync & Updates*, and the refs in `README.md`/`ROADMAP.md`/`docs/folder-structure.md` were repointed. Kept deliberately: `scripts/build-dist.js` (deploy depends on it), `docs/tree-notation.md` + `docs/tree-prompt.md` (product specs, code-referenced), and the HANDOVER/PROGRESS/ROADMAP trio. **The licence also changed:** the template's MIT `LICENSE` was replaced with PolyForm Strict 1.0.0 (verbatim from the PolyForm repo) at Erlen's decision — source-visible, noncommercial, no distribution or derivatives; README's License section states this. Commit separately from the icon feature.

**Erlen's decision this session:** file-type coverage is **natural stretches only** — `.svg` → `file-img`, `.pdf` → `file-doc`, `.log` → `file-txt`; code, configs, archives, design files, dotfiles and extensionless names all fall back to the generic `file` mark until dedicated icons ship. The follow-up icon wishlist is in `ROADMAP.md` under *More file-type icon marks*.

**Newly unblocked by v2.2.1:** `swap`, `trash` and `pencil` now exist in the upstream sprite. The standing plan (previous handovers) was: when they ship, move their references from `assets/icons/project-icons.svg` to the DS sprite and add them to `icons.manifest.json`. Deliberately not done this session — it's its own small change. References to update: the chip action buttons in `tree-render.js` and the icon swap in `tree-edit.js`.

**No human has used any of the last six features yet** — the five queued before (staged click, delete-folder dialog, folder⇄file conversion, mouse renaming, Copy Prompt) plus the new per-extension icons. Still the largest risk on this branch.

## Pick up here

1. **Commit the public-repo cleanup** (State §2) as its own commit — provenance is resolved: it's Erlen's own request, executed in a parallel Claude session.
2. **Commit the icon feature** as its own commit (State §1 file list).
3. **Hands-on QA — the whole branch, in a real browser.** Serve the repo root at http://localhost:3100/ and drive it by hand. Everything listed in the previous handover still applies (staged click, delete dialog, conversion glyph, rename input, Copy Prompt against real models), plus now:
   - **The file-type icons at real size.** 24×24, light and dark, in `/` and `/embed.html`. Do the lettered marks (`css`, `txt`, `json`, `md`) read at typical zoom, or smear? Does a mixed structure genuinely scan better, or does the icon variety read as noise next to the uniform folder marks?
   - **The add-pill's file glyph** — it changed from the old `document` drawing to the DS `file` drawing; check it still reads as "file" at pill size.
4. **Decide whether this branch merges to `main`.** Ten commits plus the two uncommitted piles; the merge should follow the QA, not lead it.
5. **Decide the export-comments default.** Import keeps `# comments` by default; the export dialog's *Include comments* is still unchecked. Inconsistent pair, one-line change either way, decision still open.
6. **Fix `docs/tree-notation.md:88`.** Still claims `#hashtag-notes/` survives as a folder name; true only at column 0. Verified against the parser on 2026-08-02, one-line correction, still not made.
7. **Toast work** — still blocked on the upstream-vs-local decision (design system `showToast` has no action-button support; Undo rides on it in four places). Decide with Erlen before writing code.
8. **Launch checklist** in `ROADMAP.md` — five items, two of them Erlen's.

## Blocked on Erlen

- **HTTP→HTTPS redirect** for `folder-structure.bydefault.studio` — Cloudflare dashboard only; the tokens available here are read-only. Re-verified still open 2026-07-31.
- **The launch flip itself** — `noindex` → `index, follow`; a go/no-go call, not a chore.
- **Hands-on QA** — item 3 above. Nobody has looked at any of this in a real browser at real zoom levels.

## Things worth knowing that aren't obvious from the code

- **The repo lives on a Google Drive shared drive and changes arrive from outside the session** — this session it delivered the whole docs-site removal mid-morning, minutes after the session started. Check `git status` against what you actually touched before committing anything, and never use the repo as scratch space (files written into it have also come back reverted). Build harnesses in the session scratchpad with a `<base href>` pointing at the repo.
- **There is no memory directory.** A previous handover said "see the headless Chrome recipe in memory" — that memory doesn't exist. The working recipe: harness HTML in the scratchpad with `<base href="file:///…/Folder%20Structure/">` (URL-encode the spaces), run `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=4000 --dump-dom`, write results into a `<pre id="results">` and parse the dumped DOM. Two traps hit this session: module init defers to `DOMContentLoaded`, so integration code must run from a later-registered `DOMContentLoaded` listener, not inline; and `replaceTree` needs `model.state.lastId = 0` + `assignIds` per root child first (mirror `applyImportedTree` in `app.js`) or the reconciler throws `HierarchyRequestError`.
- **`icons.manifest.json` (repo root) is the sole input to the DS sprite build.** Nothing scans usage. Any new `icons.svg#<name>` reference — especially one injected from JS — must be added there or it silently vanishes on deploy. It governs the design-system sprite only; `project-icons.svg` is hand-maintained and needs no entry.
- **`tree-file-icons.js` must load before `tree-render.js`** in any page that renders the tree — `iconFor` calls it unguarded.
- **Never hand-edit anything `bd-sync` writes** — `design-system.css`, `assets/js/design-system/`, `assets/css/design-system/`, `icons.svg`, `cursors.svg`, `DESIGN.md`. All regenerated on `npm install`. `assets/icons/project-icons.svg` is ours and git-tracked; its `document` symbol is now unused by the app but left in place.
- **The parser's file/folder rule is positional, not semantic.** Trailing `/` wins; failing that, a dot with characters either side means file; everything else is a folder. `tree-file-icons.js` uses the same dot rule for extensions, so the two stay consistent (`.gitignore` is extensionless in both).
- **Row elements are cached in `rowEls[id]` for the life of the id.** Anything `makeRowEl` decides conditionally at creation goes stale — build unconditionally and let `updateRowEl` maintain it. The icon path now follows this: `updateRowEl` re-derives `{sprite, symbol}` every pass, which is what makes rename/convert repaints free.
- **The generated docs site and all template-era files are gone (removed 2026-08-06 — State §2).** Docs are markdown-only in `docs/` (three files: tree-notation, tree-prompt, folder-structure); there is no `docs:build`/`docs:watch` and no regeneration step after editing them.
- **`localStorage` is unavailable over `file://`**, so persistence smoke tests must run against http://localhost:3100/. `save()` is debounced 300ms — read it from a timeout.
- **`setAllOpen` never closes top-level folders** (`child.open = open || depth === 0`) — "collapse all" leaves the root open; smoke-test expectations must account for it.
- **`dblclick` fires alongside its two `click` events** — rows can't answer both a staged second click and a double-click. The comment pill's `dblclick` is safe only because it sits outside the row's click target.
- **`dist/` is the deploy contract.** `scripts/build-dist.js` copies only `index.html`, `embed.html` and `assets/` — markdown, templates and scripts stay unserved. The local `dist/` is stale between builds; never read it as source of truth.
- **The lockfile must stay committed.** Without it Cloudflare picks bun, and bun can't resolve the design system's `#semver:` git range.
- **Toast is the last hand-rolled design-system component.** Dialog was adopted 2026-07-30; tooltips were always native.
- **`updateRowEl` doesn't refresh most chip `aria-label`s on rename** — add-child, move, indent, rename and delete keep the name they were built with. Pre-existing; worth a small fix if someone is in there anyway. Convert (and now the icon) are exempt because they're regenerated every pass.
