# Project Progress

Track what's been done and what still needs doing across sessions. Add a dated section per meaningful chunk of work, newest first. Claude: keep this file updated as you complete work — it is the cross-session memory for this project.

---

## 2026-08-01 — Change a row between folder and file

A node's type was fixed at creation. The add-pill's folder/file toggle decides what gets inserted, but once a row existed there was no way to change its mind — you deleted it and re-added, losing the comment, the position, and anything inside. Erlen asked for a quick way to switch, with a dialog when a folder holding contents becomes a file. It works in both directions: a file becoming a folder is always safe, so it goes straight through.

Erlen suggested the `refresh` glyph; I argued against it — ⟳ reads as reload/reset everywhere else on the web — and offered a swap glyph or a show-the-target-type button instead. He took the swap and supplied the icon, which is heading into the design system library.

- **tree-model.js 1.6.0** — new `setType(id, type, contents)`. Mutates the node **in place** rather than replacing it, so `id`, `name` and `comment` survive and the renderer keeps reconciling onto the same row. `contents` is `'keep'` or `'discard'` and is read only when a folder that holds something becomes a file; `'keep'` splices the direct children in at `index + 1`, so they land in the slot the folder occupied and deeper nesting rides along attached to them. One `snapshot()`, so a single undo restores the whole previous shape. Refuses the virtual root (`findParent` null), an unknown id, and a no-op type change
- **tree-render.js 1.7.0** — `convert` button in the chip between rename and delete, plus `convertLabel`/`convertTooltip`. The glyph is the same both ways, so direction lives in the tooltip and `aria-label`, and `updateRowEl` re-reads it every pass
- **A latent bug this feature made reachable.** Row elements are cached in `rowEls[id]` for the life of the id, but `makeRowEl` decided the Add-inside button once, at creation, from `row.type === 'folder'` — and `updateRowEl` never revisited it. Converting a file to a folder would have left that row permanently unable to take children. Nothing could trigger it while type was immutable. Fixed by building the button on every row and gating it in CSS on `.is-file`, which `updateRowEl` already maintains — the same CSS-gated approach used for edit mode and the comment pill, and no DOM surgery in the reconcile path
- **tree-edit.js 1.7.0** — `convertNode` gates: files and empty folders convert straight through, a folder with contents opens `#convert-type-dialog`. Both dialogs now share `keepContentsDetail(total, direct)`; the sentence was duplicated verbatim. Toasts state scope with Undo: `Changed "src" to a file, kept 2 items` / `… and deleted 3 items` / `Changed "README.md" to a folder`. The id survives the conversion, so refocusing the row afterwards is unconditional
- **Copied both safety details from the delete dialog** rather than rediscovering them: the choice handler gates on `dialog.open` (the pending id outlives `close()` by a tick), and the `close` event clears the pending id so Escape or backdrop dismissal can't leave a stale target for a later click
- **tree-keyboard.js 1.5.0** — `t` on the focused row. The chip's buttons are `tabIndex = -1`, so row keys are the keyboard path to every action. Safe on `embed.html`, which loads this file but not `tree-edit.js`: the existing `editApi` guard makes `editMode` false there
- **index.html** — `#convert-type-dialog` mirroring the delete dialog exactly, `autofocus` on the non-destructive *Keep contents*, `Delete all N items` carrying `data-color="danger"`. Intro copy extended to mention the new capability
- **Verified**: 25/25 in Node against the DOM-free model (all four conversions, undo after each, guards, the folder → file → folder round trip preserving id/name/comment, serializer output, and `addChild` into a converted file-turned-folder), then 44/44 in headless Chrome (labels and their flip, the add-child regression above, dialog wording and counts, both outcomes, cancel-then-stale-click inertness, `t` including the case where a rename input must swallow it, view mode, undo via the toolbar, and the persisted shape). The persistence check only works over http — `localStorage` is unavailable on `file://`, where it had been silently skipping. `embed.html` re-checked clean
- **One thing deliberately left alone**: `updateRowEl` refreshes the comment buttons' `aria-label`s on rename but not those of add-child, move, indent, rename or delete — so those read the pre-rename name until the row is rebuilt. Pre-existing and unrelated; the new convert button doesn't share it because its label is regenerated every pass

---

## 2026-08-01 — Arrow annotations import as comments

Erlen pasted a real tree — an eight-root map of the studio's own content — annotated the way models actually write them, with a note padded into a column beside the name:

```text
WEBSITE                    ← was Design System
├── Component Conventions  ← moved from Docs
└── Layout                 ← two pages merged
```

The parser knew one comment marker, `#`, so none of that was stripped. `WEBSITE` imported as a folder literally named `WEBSITE                                     ← was Design System` — alignment padding and all. Nine rows were affected. Nothing else was wrong: the eight-root forest, every depth and all 113 nodes parsed correctly, which is what made the failure worth fixing rather than working around. The annotation is a comment to any human reading it, and the tool has had a comment pill to put it in since the pills shipped.

- **tree-parsers.js 1.2.0** — `INLINE_COMMENT` widened from `/\s+#\s?(.*)$/` to `/\s+(?:#|←|⟵|<-+)\s?(.*)$/`. One regex; everything downstream already worked. The whitespace prefix is unchanged, so the rule that protects `#hashtag` protects `a<-b.txt` for free
- **`#` remains the only marker emitted.** Serializers were not touched, so an arrow tree pastes in and copies out canonical — arrows are an input dialect, not a second output format
- **Markers deliberately excluded**: `//`, `→`, and bracketed `(new)`. Each would swallow more legitimate names than it would rescue annotations, and the excluded set is now written down in `docs/tree-notation.md` so the next widening is a decision rather than a drift
- **index.html** — the import checkbox read "Keep `# comments` as annotations", which now under-describes what it keeps; it reads "Keep inline comments (`#`, `←`) as annotations"
- **Two stale doc claims fixed while in there**: `docs/tree-notation.md` still said capture was opt-in and stripped by default, which stopped being true when the import default flipped earlier the same day. Heading and bullet corrected
- **Verified**: 30/30 headless-free unit checks against the parser and serializer, plus 23/23 in headless Chrome driving the real import dialog end to end. Covers: all nine annotations captured and every name clean; node count identical to pre-change (113, confirmed by running `git show HEAD:`'s parser side by side); `#` comments, `#hashtag` names and `a<-b.txt` names all unchanged; format detection unskewed for tree, ASCII, markdown and path inputs; 113 rows rendered with 9 pills carrying the annotation text; and a full round-trip where the exported text re-parses to a byte-identical tree with arrows normalised to `#`
- **Pre-existing, not fixed, still documented**: `├── #hashtag/` drops its row entirely, because the connector puts whitespace before the `#`. Verified unchanged by this work rather than assumed

---

## 2026-08-01 — Deleting a non-empty folder asks first

Deleting a folder took its whole subtree with it, silently — the toast said `Deleted "src"` whether the folder was empty or held forty items, so there was no signal that anything went with it. Erlen's call, after the alternatives were argued: a dialog now appears when deleting a folder that holds anything, offering **Delete everything** or **Keep contents**. Files and empty folders are unambiguous and skip it entirely.

I argued against the dialog and for leaving delete destructive with a separate unwrap command, on the grounds that delete is already reversible twice over (toast Undo plus Cmd+Z against a 100-deep stack) and that a modal taxes every deletion. Erlen chose the dialog; recorded here so the reasoning isn't relitigated blind. The one thing that made a promote-only default a non-starter — and which the dialog avoids — is that it removes any way to delete a branch in one action, which is the most common deletion when stripping sections out of a pasted structure.

- **tree-model.js 1.5.0** — new `unwrap(id)`: splices a folder's direct children into the parent **at the folder's own index**, so their order and position are preserved and anything nested deeper rides along attached to them. One `snapshot()`, so a single undo restores the folder around its contents. Also `countDescendants(node)`, since the dialog needs the total, not the direct-child count
- **tree-edit.js 1.6.0** — `deleteNode` is now a gate; the two outcomes live in `removeBranch` and `removeLevel`. Both toasts now state scope: `Deleted "src" and 4 items inside` / `Removed "src", kept 2 items`, each with Undo. Both paths explicitly refocus a row afterwards — previously delete left DOM focus on a destroyed button, which mattered little before and matters a lot when returning from a modal
- **index.html** — `#delete-folder-dialog`, built on the design system's dialog component. `autofocus` sits on **Keep contents**, not the destructive option; `Delete everything` carries `data-color="danger"`; Cancel is `data-dialog-close` and Escape/backdrop dismissal is native. `aria-labelledby` + `aria-describedby` wire the title and the item count to the dialog
- **Opened with `showModal()` directly**, not the declarative `data-dialog-open` path, because there is no surviving trigger element — the chip button that raised it is destroyed by the very delete it starts. Commented in place so it doesn't read as a regression against the 2026-07-30 dialog migration
- **Bug found and fixed during verification**: `dialog.close()` fires its `close` event on a queued task, so `pendingDeleteId` survived a tick past dismissal. Not user-reachable (a closed dialog has no clickable buttons) but the state machine shouldn't rely on that — the choice handler now gates on `dialog.open`, which is accurate synchronously
- **Verified**: headless Chrome 23/23 — files and empty folders bypass the dialog; a non-empty folder opens it modally and changes nothing while it waits; the count covers every descendant rather than direct children; wording adapts between the flat and nested cases and between singular and plural; the safe option holds initial focus; Escape deletes nothing; both outcomes produce the right tree and each undoes in one step; keyboard `Delete` routes through the same gate; a choice clicked after dismissal is inert. Click-model suite re-run at 35/35 with no regression

---

## 2026-08-01 — Import keeps `# comments` by default

The "Keep `# comments` as annotations" checkbox shipped unchecked, so the default behaviour of a paste containing comments was to silently discard them. Per Erlen, it is now checked. A comment in a pasted structure is content the user wrote; keeping it is the safe reading and discarding is the opt-in.

- **index.html** — `checked` on `.import-comments`
- **app.js 1.6.0** — `runImport` reset flipped from `false` to `true`, so the default is restored after every import rather than the previous "strip each time"
- Unticking still works and still applies to that import; it just doesn't persist to the next one
- **Verified**: headless Chrome 9/9 — checked on load, row still hidden until comments are detected, comments kept with no interaction, checkbox re-checked afterwards, opt-out still strips, and the default restores after an opt-out import
- **Known caveat, now reachable without opting in**: `docs/tree-notation.md` records that a *name* containing space-then-`#` (e.g. `my #file.txt`) is indistinguishable from a comment in the text notation. With capture on by default, such a name is split into name + comment without the user asking. It stays visible rather than silent — `containsComments()` returns true for that text, so the row is shown and can be unticked — but it is the one case where the new default does something unwanted
- **Left alone deliberately**: the *export* dialog's "Include comments" is still unchecked by default. Flagged to Erlen rather than changed, since only the import default was asked for

---

## 2026-08-01 — Click model: select first, toggle on the second click

Selection and disclosure were fused into one gesture — a click selected a row *and* toggled it, so there was no way to reach a row's comment pill or edit chip without collapsing or expanding it. Reading a comment on an open folder destroyed the view you were reading it in; using the edit chip on a folder hid the children you were reorganising. Now: **a click selects, and a click on the already-selected row toggles it.** Inspect, then navigate.

Erlen proposed the staged click; the alternatives were argued out first and both rejected on evidence:

- **Folder icon as a disclosure control** (the Finder/VS Code convention, and the one that keeps opening at one click) — rejected because the icon is 24px inside a 40px row on a canvas that zooms to 0.25×, so the target shrinks exactly when precision gets harder. Erlen's call, and correct: the big forgiving target should carry the common action.
- **Double-click to open** — strictly worse than the staged click, which tolerates any gap between the two clicks.

The cost is real and worth naming: opening a folder now takes two clicks instead of one. It lands on the action that has an escape hatch (expand/collapse-all in the toolbar); the action that got cheaper — selection — had none.

- **tree-canvas.js 1.3.0** — `activateNode` is now the single implementation of the rule, and both the click handler and Enter/Space route through it, so mouse and keyboard obey one model. Selecting deliberately does **not** re-center: the row the user just clicked is by definition already on screen. Toggling still centers, because opening can push children off it
- **tree-edit.js 1.5.0** — row `dblclick` no longer starts a rename. This was forced, not optional: `dblclick` fires *alongside* the two `click` events, so a fast open/close would have been indistinguishable from a rename. Rename keeps the chip's pencil and `F2` — and since the first click now reveals the chip, the pencil sits one click from selection, which is better discovery than a hidden gesture. `dblclick` on the comment pill is untouched (the pill is outside the row's click target). Also: a click that commits an open rename/comment input no longer falls through to toggle the row it just committed on
- **tree-keyboard.js 1.4.0** — header rewritten for the staged Enter/Space. `←`/`→` are unchanged and remain the one-press way to open and close, so the keyboard never pays the two-press cost
- **index.html** — About copy said "Click a folder to open or close it"; now describes the staged behaviour
- **No CSS, token or design-system changes.** The comment pill and edit chip were already gated on `.is-selected` — this change only made selection reachable
- **Verified**: headless Chrome 38/38 across all sixteen scenarios — select-without-toggle on open and closed folders, second/third click toggling, switching rows, inert second click on files, canvas not panning on select, click-away deselect, Enter staging, arrow keys still one-press, `dblclick` on folders/files/comment-pill, rename-commit suppression, inherited selection after collapse-all, and view mode. `embed.html` re-checked: initialises clean with `tree-edit` absent, so the read-only viewer inherits the model and can finally show a comment without collapsing the folder
- **One test expectation was wrong, not the code**: `setAllOpen` keeps top-level folders open by design (`child.open = open || depth === 0`), so after collapse-all the nearest *visible* ancestor is the nested folder, not the root one

---

## 2026-07-30 — Adopted the design system's dialog component (tooltips were already native)

Replaced the custom dialog wiring with the delivered `assets/js/design-system/dialog.js` module (v2.1.0 ships it; loaded first in index.html's script block). Tooltips needed no migration — every tooltip already used the system's `data-tooltip`/`data-tooltip-position` on focusable buttons, with no `title=""` doubles and no custom hover CSS.

- **index.html** — dialogs now carry `id`s (`import-dialog`/`export-dialog`/`about-dialog`) instead of the bespoke `data-dialog="…"` attribute; triggers open declaratively via `data-dialog-open`; close buttons swapped from the deprecated `.dialog-close` to the `.button.close-btn` role class with `data-dialog-close`. Per the dialog contract: `autofocus` on the import textarea and export copy button, `tabindex="0"` on the About dialog's text-only body
- **app.js 1.5.0** — `showModal()` calls, the `.dialog-close` click branch, and `aboutDialog` removed; the import/export `data-app-action` branches remain but only refresh dialog content (both listeners are document-delegated, so they compose with dialog.js on the same click)
- **style.css** — `.dialog::backdrop { backdrop-filter: none; }` deleted (dead — the v2.1 backdrop has no filter to cancel); the About close-button nudge retargeted to `.dialog-title.is-hidden + .close-btn`
- **Verified**: headless-Chrome harness 15/15 — all three dialogs open as `:modal` via the module, autofocus lands, close returns focus to the trigger, export preview refreshes on open, backdrop/Escape are native, no deprecated markup left in the DOM; precise grep for `.dialog-close`, `data-dialog="`, `aboutDialog`, `showModal` = zero hits
- **Known caveat** (pre-existing, deliberate): tree-row action buttons are `tabIndex = -1` (the tree's roving-focus keyboard model), so their tooltips show on hover only — keyboard users get the same commands via tree-keyboard.js

---

## 2026-07-30 — Selection-driven path fading + calm starting state

Major visual model change per Erlen's spec (articulated + confirmed first). Fading is no longer structural ("sibling of an open folder fades" — that rule is gone from tree-layout); it now visualises the *path to the selection*:

- Nothing selected → every row `--text-primary`, nothing faded
- Row selected → the row, its ancestors, and (for folders) its **immediate children** stay primary; every other visible row fades. Connectors deliberately never fade (kept full strength per Erlen)
- Click-away deselect (earlier today) resets everything to primary — the two features compose

Starting state is now calm on every load: **view mode, nothing selected** (load() ignores the persisted mode/focusedId; payload shape unchanged), and the fresh-visit sample ships **all folders open**. Imports, share-link loads, and embeds also land with nothing selected. Restored sessions still keep their tree, open/closed states, and view position. startFresh keeps its explicit edit-mode + selection (deliberate: it's a "begin building" action).

- **tree-layout.js 1.3.0** — `faded` field + groupHasOpen scan removed (layout is geometry-only again)
- **tree-render.js 1.6.0** — render() builds `primaryIds` (focusedId + `ancestorIds` + immediate children when a folder) and `is-faded` = selection active && row not in the set
- **tree-model.js 1.4.0** — sample all-open; load() forces `mode:'view'`, `focusedId:null` (also fixes a pre-existing inconsistency: restored 'edit' mode never applied `.is-edit-mode` to the DOM, leaving hidden-but-active edit state)
- **app.js 1.4.0 / embed.js 1.3.0** — imports/embeds set `focusedId = null` instead of first row
- **style.css** — `.is-faded` comment rewritten; hover-restores kept; connector rule untouched
- **Verified**: headless-Chrome harness (real modules, real click paths) 10/10 — boot calm state, deep-file path matrix, folder children-stay-primary matrix, canvas-click deselect reset

Follow-up round on the pill per Erlen's feedback: the chat icon appeared twice in edit mode (chip + pill), so the chip's chat button is gone — the pill is now the single comment control. To keep a mouse add-affordance, the pill shows on **every** selected row in edit mode, collapsed to just its chat button until a comment exists (text and delete stay hidden via `.tree-comment:empty` and an `is-commented` gate). Rename's pencil swapped to Erlen's new artwork.

- **assets/icons/project-icons.svg** — new `pencil` symbol from `assets/images/svgs/pencil.svg` (fill normalized to `currentColor`); **icons.manifest.json** dropped `pencil-draw` (now unused) → DS sprite resynced to 13 icons (`chat`/`check` remain for the pill states)
- **tree-render.js 1.5.0** — chip's `comment` button removed; rename button now `project-icons.svg#pencil`; pill edit button gets add/edit aria-label + tooltip per state
- **tree-edit.js 1.4.0** — `swapButtonIcon` is sprite-aware (pencil lives in the project sprite, check/chat in the DS sprite); `setCommentButton` targets the pill button only; delegation drops the `comment` action
- **Input crop fix** (also reported by Erlen): the DS reset applies `box-sizing: border-box`, so the inline inputs' 2×2px padding + 2×1px border were carved out of the `ch`-based width and cropped the last letters — width now adds the chrome back via `calc()`, sizes empty inputs to their placeholder, and self-corrects against `scrollWidth` for wide glyphs the proportional-font `ch` unit under-measures (affected rename too)
- **`#` prefix hidden while editing** (Erlen's request): `.tree-item.is-commenting .tree-comment::before { content: none; }`
- **Orphaned-input bug found by the new test**: cancelling/empty-committing on an *uncommented* row left the input element in the DOM (the render diff sees `'' === ''` and never rewrites the span) — commit/cancel now remove the input explicitly
- **Verified**: headless-Chrome smoke suite 32/32 — exactly one chat control per row, pencil swap incl. check↔pencil toggling, collapsed add-only pill, add/edit/delete/undo flows, no orphaned inputs, no cropped text at wide glyphs, placeholder-sized empty input, `#` hidden while editing, view-mode read-only, one-input invariant

---

## 2026-07-30 — New wordmark artwork

Replaced the `logo-wordmark` symbol in `project-icons.svg` with Erlen's new "folder-structure/" artwork (17 paths, `currentColor`, viewBox `0 0 245 23`, was `246 25`). Updated the three `<svg viewBox>` references (index header, about dialog, embed branding) and the three `aspect-ratio`/width rules in style.css to match. Verified: sprite XML parses, rendered preview shows the full wordmark, no stale `246 25` refs.

---

## 2026-07-30 — Comment pills: floating overlay redesign

Same-day iteration on the comments feature per Erlen's feedback: comments moved out of the row's text flow into a floating pill with its own edit/delete toolbar, decoupling comment editing from name editing. Pill shows only while its row is selected (view mode read-only; embeds too). Data model, `# comment` notation, import/export toggles and share fidelity unchanged.

- **tree-render.js 1.4.0** — new `.tree-item-overlays` rail (absolute, `left:100%`) holding the edit chip and the new `.tree-comment-pill` (`.tree-comment` text span + `comment-edit`/`comment-delete` buttons). The rail is selected-row furniture; comments no longer sit in the row flex flow
- **style.css** — rail takes over the chip's old positioning; pill reuses the chip's card recipe; visibility matrix: `.is-selected.is-commented` or `.is-commenting` shows the pill, pill toolbar gated on `.is-edit-mode` (embeds never get it); open folders offset the pill 35px (CELL_W+GAP) past the connector arm in view mode — in edit mode the chip covers the arm as before. Print hides `.tree-item-overlays` wholesale (print treatment of comments deliberately deferred). Cosmetic edge: an open *empty* folder has no arm but still gets the offset
- **tree-layout.js 1.2.0** — comment width reverted out of `rowWidth`; comments are pure overlay, so the open-folder child-column shift from the first build is gone. Rows still carry `comment` for the renderer
- **tree-edit.js 1.3.0** — delegation widened to `.tree-item-overlays [data-action]`; `comment-edit` toggles start/commit exactly like the chip's `comment`; new `deleteComment` (cancels an in-progress edit rather than saving it, then clears with an Undo toast); `setCommentButton` swaps chat↔check on both buttons; outside-click exclusion widened to the rail; dblclick on overlay buttons no longer falls through to rename (also fixes a pre-existing chip quirk)
- **tree-canvas.js 1.2.0** — viewport-click exclusion `.tree-item-actions` → `.tree-item-overlays` so pill clicks don't toggle/center rows (single-line change on top of the uncommitted gestures work)
- **Verified**: Node harness still 55/55 (parsers/serializers untouched); headless-Chrome smoke suite against `dist/` — 25/25 incl. width-neutrality, selection-driven visibility, chip + pill edit flows, delete + undo, pill click on an open folder not toggling it, one-input invariant, keyboard guard, first-comment pill reveal, view-mode read-only. Hands-on QA pending: pill feel at zoom levels, dark mode, embeds

---

## 2026-07-30 — File/folder comments (annotations)

First ROADMAP.md feature. Any node can hold an optional `comment` shown as muted `# text` after its name, editable inline in edit mode (chat button next to Rename, double-click the comment, or `C`), mirroring the rename triad exactly. Comments use the `# ` suffix notation the parser already tolerated; capture on paste and emission on export are both opt-in checkboxes (progressive disclosure — each row appears only when comments exist), while share/embed links always carry comments. Markdown export uses `  # comment` like the other formats (ROADMAP's em-dash sketch dropped: it can't round-trip).

- **tree-model.js 1.3.0** — `setComment(id, text)` beside `rename()`; empty text deletes the field; no-op guard so unchanged commits create no undo step. Undo/localStorage cover the field for free (whole-tree clones, verbatim stringify; no version bump needed)
- **tree-parsers.js 1.1.0** — `normalize` → `normalizeEntries` returning `[{text, comment}]` (single pass; capture regex `/\s+#\s?(.*)$/`, first marker wins, `#hashtag` names survive); detection runs on stripped text so comment content can't skew heuristics; `parse(text, {comments})` attaches only on opt-in (default byte-identical to old parser — verified against `git show HEAD`); new `containsComments(text)` export drives the import-dialog disclosure; path-list comments attach to the line's last segment, non-empty last-wins on dedupe
- **tree-serializers.js 1.1.0** — `serialize(root, format, {fence, comments})`; `  # ` suffix in all four formats; path-list additionally emits an explicit `path/  # comment` line for commented non-empty folders so the parser's dedupe merges them back (folder comments round-trip)
- **tree-layout.js 1.1.0** — `rowWidth` adds `GAP + labelWidth('# ' + comment)` and rows carry `comment`, so connectors, add-pill gaps, bounds and the actions chip all clear the comment text. Intended consequence: a comment on an open folder shifts its child column right
- **tree-render.js 1.3.0** — `.tree-comment` span between label and actions (text is the bare comment; the `# ` prefix is CSS `::before`, keeping the accessible name clean); chat button next to Rename; `is-commented` row class; add/edit aria-label/tooltip refreshed per render except mid-edit
- **tree-edit.js 1.2.0** — comment triad (`startComment`/`commitComment`/`cancelComment`) with separate `commentingId`; starting either edit commits the other (one inline input globally); shared capture-phase outside-click + Enter/Esc handlers cover both inputs; `COMMENT_FORBIDDEN` allows `/` and `#` but strips newlines/box glyphs; `maxlength=80` (UI only — longer imported comments preserved)
- **tree-keyboard.js 1.3.0** — critical guard: keydown now bails inside `.tree-comment-input` too (Space/Delete/`a` no longer fire while typing a comment); `c` starts a comment (modifier-guarded so ⌘C stays copy); same modifier guard added to `a` (pre-existing ⌘A bug, disclosed)
- **app.js 1.3.0 / index.html** — import dialog gains "Keep `# comments` as annotations" checkbox (hidden unless the paste contains comments = the detection notice; unchecked default per spec, reset after import); export dialog gains "Include comments" (hidden when no comments or Embed format); embed payload serializes with comments; share-fragment import parses with capture; About copy updated
- **embed.js 1.2.0** — fragment parse with `{comments: true}`; read-only rendering needs nothing else
- **icons.manifest.json** — added `chat` (14 symbols); `npx bd-sync` rerun, `#chat` verified in the sprite
- **docs/tree-notation.md** — new "Comments" section (grammar, opt-in capture/emit, per-format emission, path-list folder-line rule, share-link fidelity) + round-trip caveat for names containing ` #` (pre-existing lossy hole, documented not fixed); site regenerated
- **Verified**: Node harness (scratchpad) — 55 checks: strip-regression across all five parse formats, capture, per-format round-trips with and without comments, path-list folder merge, detection-skew, `#hashtag`/fence/col-0-`#`/full-line-comment edges, `containsComments`; plus old-vs-new parser byte-identity on default mode. Browser QA still pending (inline editing flow, layout at zoom levels, dark mode, VoiceOver)

---

## 2026-07-30 — Figma-style canvas gestures + click-away deselect

Per Erlen's spec (confirmed before build): scroll should move the canvas, zoom is always a deliberate modifier/gesture.

- **tree-canvas.js 1.1.0** — `handleWheel` rework: plain wheel/two-finger scroll pans both axes (`deltaMode` scaled: lines ×16, pages ×viewport); Shift+wheel pans horizontally (remaps deltaY→deltaX only when the browser didn't pre-swap); Ctrl/⌘+wheel zooms at the cursor. Trackpad pinch arrives as Ctrl+wheel so it zooms via the same branch (kept the 4× boost — pinch deltas are small). Left-drag pan unchanged (no marquee here, unlike Figma). Clicking empty canvas now calls `clearSelection()` → `focusedId = null` + render + `notifyViewChange` (persists)
- **tree-render.js 1.2.0** — "always selected" invariant removed: render() no longer force-selects row 0 when `focusedId` is null. Roving tab stop decoupled from selection: new `tabId` (= focusedId, else first row) drives `tabIndex`, `.is-selected` still tracks focusedId only — tree stays keyboard-reachable with nothing selected, and the edit chip disappears until a row is clicked. Hidden-focus pull-up (collapsed ancestor) unchanged
- Audited all `focusedId` consumers: everything else only writes it; `nextFocusAfterDelete` already returns sibling→parent (null only for an emptied tree); tree-keyboard reads the row id from the DOM-focused element so null selection is safe
- Not yet deployed (needs commit + push)

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

## Onboarding — closed 2026-07-29

Template onboarding is done: `npm install` / design-system sync, `PROJECT_BRIEF.md`, project name propagated, brand tokens in `theme.css`, docs site generated, repo connected to GitHub (`bydefaultstudio/folder-structure`), hosting live on Cloudflare **Workers static assets** with push-triggered CI — not Pages, as the original checklist assumed (see the 2026-07-29 entries above).

One onboarding item never got done and now lives in the launch checklist in `ROADMAP.md`: replacing the template's `logo.svg` and favicons.

Forward-looking work is no longer tracked here. `HANDOVER.md` holds the current state and what to pick up next; `ROADMAP.md` holds the feature bank and launch checklist. This file stays an append-only record of what shipped.
