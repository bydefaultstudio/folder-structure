# Handover

The live state-of-play between sessions. **Rewritten at the end of each session, not appended to** — it describes now, not history.

Claude: read this first, act on "Pick up here", and rewrite the whole file before the session ends. If a session produced no state change worth carrying, say so rather than leaving stale content in place.

**Where things belong**

| Doc | Holds | Lifecycle |
| --- | --- | --- |
| `HANDOVER.md` | Current state, what's next, what's blocked and on whom | Overwritten each session |
| `PROJECT_PROGRESS.md` | What shipped, dated, with the reasoning and verification | Append-only, newest first |
| `ROADMAP.md` | Feature ideas and the launch checklist | Ideas → In Progress → Done |
| `PROJECT_BRIEF.md` | Intent, goals, non-goals, constraints | Rarely changes |

Don't duplicate across them. Handover points at the roadmap; the roadmap owns the task list; progress owns the record.

---

**Last session:** 2026-08-01 · **Branch:** `click-to-select-then-toggle` (off `main` @ `e8901db`) · **Live:** https://folder-structure.bydefault.studio

## State

**Working tree is dirty and nothing is committed — this is still the thing to resolve first, and the pile has grown.** What's sitting on the branch together:

1. **The staged click model** — `tree-canvas.js`, `tree-edit.js`, `tree-keyboard.js`, `index.html`.
2. **Import keeping `# comments` by default** — `app.js`, `index.html`.
3. **The delete-folder dialog** — `tree-model.js`, `tree-edit.js`, `index.html`.
4. **Folder ⇄ file conversion** (this session) — `tree-model.js`, `tree-render.js`, `tree-edit.js`, `tree-keyboard.js`, `index.html`, `assets/css/style.css`, `assets/icons/project-icons.svg`. The same session also swapped the delete icon from `close-circled` to a new `trash` glyph.
5. **Doc work from earlier sessions** — `DESIGN-SYSTEM-MIGRATION.md`, `PROJECT_PROGRESS.md`, `ROADMAP.md`, this file.
6. **Arrow annotations import as comments** (this session) — `assets/js/tree-parsers.js` (1.2.0), `index.html`, `docs/tree-notation.md`, `docs/tree-prompt.md`, regenerated `docs/site/*`. Full entry in `PROJECT_PROGRESS.md`. **Careful when staging:** the tree-notation/tree-prompt/`docs/site` files were already dirty from Erlen's own mid-session editing before this change layered on top, and `docs/tree-prompt.md` is still untracked. The parser edit is one regex on line 23 and is cleanly separable; the doc files are not — read them before committing rather than assuming every hunk is Claude's.
7. **The rename-input click fix** (this session) — `tree-canvas.js` (1.4.0), `tree-edit.js` (1.7.1). The only bug fix in the pile, and small: `gestureInInput` + `trackGestureOrigin` in the canvas, `isInlineInputClick` in tree-edit. Cleanly separable from 1 and 4 despite sharing both files. Full entry in `PROJECT_PROGRESS.md`.

`tree-edit.js`, `tree-model.js` and `index.html` are each touched by several of these, so splitting needs `git add -p` rather than whole-file staging.

Production is still `main` @ `e8901db` and unaffected. The tool remains **not launched** — `index.html` still carries `noindex, nofollow`.

**What changed this session.** Two things, both Erlen's asks:

- **The delete icon** is now a proper `trash` glyph instead of `close-circled`. The comment pill's own delete button still uses `close-circled` — deliberately left, offered and not taken up.
- **Rows can change between folder and file.** A swap button in the chip, or `t`. Files and empty folders convert straight through; a folder holding anything raises a dialog offering *Keep contents* or *Delete everything*, wording shared with the delete dialog. Full reasoning and the verification record are in `PROJECT_PROGRESS.md` under 2026-08-01.

Verification passed 25/25 in Node against the model and 44/44 in headless Chrome, `embed.html` re-checked clean. **No human has used either change yet.**

## Pick up here

1. **Hands-on QA, then commit.** Serve the repo root at http://localhost:3100/ and drive it by hand. Headless proves the state machines; it can't tell you how any of this feels. Three things are now queued behind the same session at a real browser:
   - **The staged click.** Browsing an unfamiliar pasted structure top to bottom is where the second click costs most. Whether the first click's reveal (path highlight, everything else fading, chip/pill appearing) reads as a useful acknowledgement or as noise. Whether losing double-click-to-rename is missed. `/embed.html` is where the payoff is clearest — a comment can be read without collapsing its folder. If it feels wrong, the honest fallback is *not* the folder-icon variant Erlen already rejected; it's reverting to one-click-toggles and un-gating pills in view mode instead.
   - **The delete-folder dialog.** Whether a modal on every non-empty-folder deletion is tolerable when stripping several sections out of a pasted structure in a row. That's the objection I raised and Erlen overruled — if it grates, the escape hatch is keeping the dialog for large folders only, or moving *Keep contents* onto the chip as its own button.
   - **Folder ⇄ file conversion.** Whether the swap glyph reads as "convert" without its tooltip, and whether the chip is now too crowded at eight buttons. Its dialog inherits the same modal-fatigue question as delete, but should fire far less often.
   - **Renaming with the mouse**, now that clicking and drag-selecting inside the input no longer close it. Worth a minute of ordinary editing — click into the middle of a name, drag over a word, drag past the input's right edge — since headless proves the guards hold but not that the input is comfortable to hit at 32px tall and typical zoom.
2. **Decide the export-comments default.** Import now keeps `# comments` by default; the export dialog's "Include comments" is still unchecked, so a structure imported with annotations exports without them unless the box is ticked. Only the import default was asked for. The pair is now inconsistent and it's a one-line change either way.
3. **Toast work** — still the most concrete roadmap item, still blocked on a decision. The design system's `showToast(message, type, duration)` has no action-button support, and Undo now rides on it in four places (delete, share-link import, and both conversion outcomes). Per `DESIGN-SYSTEM-MIGRATION.md` the fix goes upstream — add an `action` option, release, pull down — not into a local fork. Decide with Erlen before writing code.
4. **Launch checklist** in `ROADMAP.md` — five items, two of which are Erlen's rather than Claude's.

## Blocked on Erlen

- **HTTP→HTTPS redirect** for `folder-structure.bydefault.studio` — Cloudflare dashboard only; the tokens available here are read-only. Re-verified still open on 2026-07-31.
- **The launch flip itself** — `noindex` → `index, follow` is a one-line change, but it's a go/no-go call, not a chore.
- **Hands-on QA of the comment pills** — headless coverage is thorough; nobody has looked at the thing in a real browser at real zoom levels. Folds naturally into item 1 above, since the pill is exactly what the first click reveals.
- **The `swap` icon going upstream.** Erlen supplied the glyph and said it's bound for the design system library. It currently lives in `assets/icons/project-icons.svg` with a comment saying so; when it ships in the package, move the reference to the DS sprite and add it to `icons.manifest.json`. The same applies to `trash` if that lands upstream too.

## Things worth knowing that aren't obvious from the code

- **Row elements are cached in `rowEls[id]` for the life of the id.** Anything `makeRowEl` decides conditionally at creation time will go stale, because `updateRowEl` is the only thing that runs afterwards. This bit exactly once: the Add-inside button was built only for folders, which was invisible until rows could change type. Build unconditionally and gate in CSS on the `is-file`/`is-folder` classes `updateRowEl` maintains — don't add DOM surgery to the reconcile path.
- **`localStorage` is unavailable over `file://`**, so any smoke test touching persistence must run against http://localhost:3100/. A check that reads it on `file://` silently skips rather than fails. Also remember `save()` is debounced 300ms — read it from a timeout, not synchronously after the mutation.
- **`setAllOpen` never closes top-level folders** (`child.open = open || depth === 0`), so "collapse all" leaves the root folder open and the nearest *visible* ancestor of a deep selection is a nested folder, not the root. This caught out a smoke-test expectation — the code was right.
- **`dblclick` fires alongside its two `click` events**, which is why rows cannot answer both a staged second click and a double-click gesture. Any future proposal to restore double-click-to-rename on rows conflicts directly with the click model; the comment pill's `dblclick` is safe only because the pill sits outside the row's click target.
- **`dist/` is the deploy contract.** `scripts/build-dist.js` copies only `index.html`, `embed.html` and `assets/` — every markdown doc, template and script stays unserved, and that's verified against production. The local `dist/` is stale between builds; CI rebuilds from scratch, so never read it as the source of truth. It is gitignored, which makes it the right place to drop temporary smoke-test harnesses (delete them after).
- **`icons.manifest.json` is the sole input to the sprite build.** Nothing scans usage. Any new `icons.svg#<name>` reference — especially one injected from JS — must be added there or it silently vanishes on deploy. This has bitten the project once already. It governs the *design system* sprite only; `project-icons.svg` is hand-maintained and needs no entry.
- **Never hand-edit anything `bd-sync` writes** — `design-system.css`, `assets/js/design-system/`, `assets/css/design-system/`, `icons.svg`, `cursors.svg`, `DESIGN.md`. All regenerated on `npm install`. `assets/icons/project-icons.svg` is ours and git-tracked.
- **The lockfile must stay committed.** Without it Cloudflare picks bun, and bun can't resolve the design system's `#semver:` git range.
- **Toast is the last hand-rolled design-system component.** Dialog was adopted on 2026-07-30 and tooltips were always native.
- **`updateRowEl` doesn't refresh most chip `aria-label`s on rename** — add-child, move, indent, rename and delete keep the name they were built with. Pre-existing, unrelated to any current work, and worth a small fix if someone is in there anyway. The convert button is exempt because its label is regenerated every pass.
