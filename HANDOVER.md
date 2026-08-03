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

**Last session:** 2026-08-03 · **Branch:** `click-to-select-then-toggle` @ `fa1b8fb`, pushed · **Main:** `2870a4c` · **Live:** https://folder-structure.bydefault.studio

## State

**The pile is gone. Everything is committed and pushed, and the working tree is clean** — this was the standing first item across the last several handovers and it is now closed. The branch is **10 commits ahead of `main`**, every one with a matching dated entry in `PROJECT_PROGRESS.md`.

Note the previous handover had two stale facts, now corrected above: `main` is `2870a4c`, not `e8901db`, and the branch is pushed rather than local-only.

Production is unaffected — deploys are manual (`npm run deploy`); `.github/` holds only `dependabot.yml`, so pushing a branch does nothing. The tool remains **not launched**: `index.html` and `embed.html` both carry `noindex, nofollow`.

**What changed this session.** An AI prompt, and a way to get at it:

- **`docs/tree-prompt.md`** (Project §6) — a prompt that states the tool's paste-in contract, plus a section tracing each rule to the parser behaviour it guards. The rules were derived by *running* the parser, not reading it, which caught three things a reading would have got wrong. They are written up in the doc; the short version is that extensionless names (`README`, `LICENSE`, `Makefile`, `.gitignore`) import as **folders**, a two-space indent silently flattens from the third level down, and a name starting with `#` is unsafe in tree notation because the connector always puts a space in front of it.
- **`assets/js/tree-prompt.js` 1.0.0** + **Copy Prompt** in the import dialog footer (left of *Import*, faded variant). Verified 16/16 in headless Chrome.

Full entry in `PROJECT_PROGRESS.md` under 2026-08-02.

**No human has used any of the last five features yet.** That has been true for several sessions running and is now the single largest risk on this branch — see below.

## Pick up here

1. **Hands-on QA — the whole branch, in a real browser.** Serve the repo root at http://localhost:3100/ and drive it by hand. Headless proves the state machines; it cannot tell you how any of it feels, and five features are now queued behind the same session at a real browser:
   - **The staged click.** Browsing an unfamiliar pasted structure top to bottom is where the second click costs most. Whether the first click's reveal (path highlight, everything else fading, chip/pill appearing) reads as useful acknowledgement or as noise. Whether losing double-click-to-rename is missed. `/embed.html` is where the payoff is clearest — a comment can be read without collapsing its folder. If it feels wrong, the honest fallback is *not* the folder-icon variant Erlen already rejected; it's reverting to one-click-toggles and un-gating pills in view mode instead.
   - **The delete-folder dialog.** Whether a modal on every non-empty-folder deletion is tolerable when stripping several sections out of a pasted structure in a row. That was my objection and Erlen overruled it — if it grates, the escape hatch is keeping the dialog for large folders only, or moving *Keep contents* onto the chip as its own button.
   - **Folder ⇄ file conversion.** Whether the swap glyph reads as "convert" without its tooltip, and whether the chip is now too crowded at eight buttons.
   - **Renaming with the mouse** — click into the middle of a name, drag over a word, drag past the input's right edge. The guards hold; what's unproven is whether a 32px input is comfortable to hit at typical zoom.
   - **Copy Prompt.** Whether the button reads as useful next to *Import* or as clutter, and whether the prompt actually produces clean trees from the models you use. That last one is the real test and only you can run it: copy it, paste it into ChatGPT/Claude with a request, paste the reply back.
2. **Decide whether this branch merges to `main`.** Ten commits, no merge conflict expected, but it should follow the QA above rather than lead it.
3. **Decide the export-comments default.** Import keeps `# comments` by default; the export dialog's *Include comments* is still unchecked, so a structure imported with annotations exports without them unless the box is ticked. Only the import default was ever asked for. The pair is inconsistent and it's a one-line change either way.
4. **Fix `docs/tree-notation.md:88`.** It claims `#hashtag-notes/` survives as a folder name. True only at column 0 — after a `├── ` connector there is always a space before the name, so the parser reads the tail as a comment and the row vanishes entirely. Verified against the parser this session. One-line correction, not yet made.
5. **Toast work** — still the most concrete roadmap item, still blocked on a decision. The design system's `showToast(message, type, duration)` has no action-button support, and Undo now rides on it in four places (delete, share-link import, both conversion outcomes). Per `DESIGN-SYSTEM-MIGRATION.md` the fix goes upstream — add an `action` option, release, pull down — not into a local fork. Decide with Erlen before writing code.
6. **Launch checklist** in `ROADMAP.md` — five items, two of them Erlen's rather than Claude's.

## Blocked on Erlen

- **HTTP→HTTPS redirect** for `folder-structure.bydefault.studio` — Cloudflare dashboard only; the tokens available here are read-only. Re-verified still open on 2026-07-31.
- **The launch flip itself** — `noindex` → `index, follow` is a one-line change, but it's a go/no-go call, not a chore.
- **Hands-on QA** — item 1 above. Nobody has looked at any of this in a real browser at real zoom levels.
- **The `swap` icon going upstream.** Erlen supplied the glyph and said it's bound for the design system library. It currently lives in `assets/icons/project-icons.svg` with a comment saying so; when it ships in the package, move the reference to the DS sprite and add it to `icons.manifest.json`. The same applies to `trash` if that lands upstream too.

## Things worth knowing that aren't obvious from the code

- **`assets/js/tree-prompt.js` duplicates the prompt block in `docs/tree-prompt.md` on purpose.** `build-dist.js` ships no markdown, so the docs page cannot be the runtime source. The module was *generated* from the markdown rather than retyped, and the smoke test asserts the two are byte-identical — if you edit one, edit both, and re-run that check.
- **The parser's file/folder rule is positional, not semantic.** Trailing `/` wins; failing that, a dot with characters either side means file; **everything else is a folder**. No notation can force a file type onto an extensionless name — it has to be changed in the app after import.
- **Row elements are cached in `rowEls[id]` for the life of the id.** Anything `makeRowEl` decides conditionally at creation time will go stale, because `updateRowEl` is the only thing that runs afterwards. This bit exactly once: the Add-inside button was built only for folders, invisible until rows could change type. Build unconditionally and gate in CSS on the `is-file`/`is-folder` classes `updateRowEl` maintains — don't add DOM surgery to the reconcile path.
- **`localStorage` is unavailable over `file://`**, so any smoke test touching persistence must run against http://localhost:3100/. A check that reads it on `file://` silently skips rather than fails. `save()` is also debounced 300ms — read it from a timeout, not synchronously after the mutation.
- **`setAllOpen` never closes top-level folders** (`child.open = open || depth === 0`), so "collapse all" leaves the root folder open and the nearest *visible* ancestor of a deep selection is a nested folder, not the root. This caught out a smoke-test expectation — the code was right.
- **`dblclick` fires alongside its two `click` events**, which is why rows cannot answer both a staged second click and a double-click gesture. Any future proposal to restore double-click-to-rename on rows conflicts directly with the click model; the comment pill's `dblclick` is safe only because the pill sits outside the row's click target.
- **`dist/` is the deploy contract.** `scripts/build-dist.js` copies only `index.html`, `embed.html` and `assets/` — every markdown doc, template and script stays unserved. The local `dist/` is stale between builds; never read it as the source of truth. **Don't use the repo as scratch space either** — it lives on a Google Drive shared drive and files written into it have come back reverted mid-session. Build smoke-test harnesses in the session scratchpad with a `<base href>` pointing at the repo instead.
- **`icons.manifest.json` is the sole input to the sprite build.** Nothing scans usage. Any new `icons.svg#<name>` reference — especially one injected from JS — must be added there or it silently vanishes on deploy. This has bitten the project once already. It governs the *design system* sprite only; `project-icons.svg` is hand-maintained and needs no entry.
- **Never hand-edit anything `bd-sync` writes** — `design-system.css`, `assets/js/design-system/`, `assets/css/design-system/`, `icons.svg`, `cursors.svg`, `DESIGN.md`. All regenerated on `npm install`. `assets/icons/project-icons.svg` is ours and git-tracked.
- **The lockfile must stay committed.** Without it Cloudflare picks bun, and bun can't resolve the design system's `#semver:` git range.
- **Toast is the last hand-rolled design-system component.** Dialog was adopted on 2026-07-30 and tooltips were always native.
- **`updateRowEl` doesn't refresh most chip `aria-label`s on rename** — add-child, move, indent, rename and delete keep the name they were built with. Pre-existing and unrelated to current work; worth a small fix if someone is in there anyway. The convert button is exempt because its label is regenerated every pass.
- **Editing a `docs/*.md` file means re-running `npm run docs:build`.** A commit that changes the markdown without regenerating leaves the published page stale — that happened with `67857e0` and was cleaned up in `c02fc49`.
