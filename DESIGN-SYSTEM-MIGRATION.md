# Design System Migration

Migration to design-system v2.1.0 is done (July 2026). This is now the steady-state reference for how updates flow into this site, not a working checklist.

## The pin

```json
"@bydefaultstudio/design-system": "github:bydefaultstudio/design-system-dist#semver:^2.1.0"
```

Caret ranges don't cross a major version, so a breaking release (like v2.0.0's gap-only block spacing) needs the major number bumped by hand — Dependabot opens a PR on every design-system release, but widening the range past a major is a deliberate edit, not an auto-merge.

## Install & sync

`npx bd-sync` runs as a postinstall step and copies versioned artefacts into the site:

- `design-system.css` → `assets/css/design-system.css`
- icon sprite → `assets/icons/icons.svg` (a subset sprite when `icons.manifest.json` exists — see below)
- `cursors.svg` → `assets/icons/cursors.svg`
- JS modules → `assets/js/design-system/`
- component CSS → `assets/css/design-system/`
- `DESIGN.md` → project root

All of these are gitignored and regenerated on every `npm install` — never edit them by hand. Every artefact carries a `@bydefaultstudio/design-system vX.Y.Z` stamp header, so drift between what's vendored and what's live upstream is greppable at a glance.

## Developing against a local design-system checkout

```
npx bd-sync --local "../Design System"
```

Syncs from the sibling "Design System" working tree instead of the published package (rebuilding it first). Use this to verify a design-system change here before it ships. The flow stays upstream-first: shared modules only ever change in the design-system repo, then get released and pulled down through a version bump — never patched in place downstream.

## Icons

`icons.manifest.json` at the repo root lists the design-system icon names this site actually references:

```json
{
  "output": "assets/icons/icons.svg",
  "icons": ["add", "back-arrow", "close", "copy", "download", "full-screen", "info", "minus", "refresh"]
}
```

`bd-sync` detects the manifest and builds a subset sprite through `bd-sprite` instead of shipping the full master set. To use a new design-system icon: add its name to the `icons` array (alphabetical) and re-run `npx bd-sync` (or `npm install`).

`assets/icons/project-icons.svg` is a separate, hand-maintained, git-tracked sprite for this site's own icons. A few of its names collide with design-system icon names (`add`, `close-circled`, `arrow-up`, `arrow-down`, `document`) — that's fine, the two sprites are never merged. `bd-sprite`'s collision check only applies to directories listed in the manifest's own `local` array, which this project doesn't use.

## Rules

- Never hand-edit anything `bd-sync` writes — `assets/css/design-system.css`, `assets/css/design-system/`, `assets/js/design-system/`, `assets/icons/icons.svg`, `assets/icons/cursors.svg`, `DESIGN.md`. All of it is regenerated on the next sync.
- Dialog/toast/tooltip behavior here is still hand-rolled against design-system CSS classes rather than the package's JS modules (`assets/js/design-system/dialog.js`, `toast.js`, etc.). Adopting those is a backlog item, not part of this migration.

Full update strategy lives in the design-system repo: `cms/upgrading-docs.md`.
