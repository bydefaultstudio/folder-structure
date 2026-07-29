# Design System Migration

Working checklist during the design-system versioning rollout (July 2026); will be slimmed to a steady-state "how updates work here" doc once migration completes.

## Where this site stands today

| Area | Status |
|---|---|
| Package pin | `#semver:^1.5.0`, resolving to 1.6.0 installed. A caret range can't cross a major version, so this pin has been silently stuck since design-system v2.0.0 shipped (2026-07-25) — no error, no warning, just no new tokens landing. |
| Vendored copies | Byte-identical to the installed package — the cleanest of the four consumers. `scripts/sync-design-system.js` copies css + icons + `DESIGN.md` on postinstall; the copies are gitignored. Currently ~163 lines behind the live design-system source, purely because the pin hasn't moved — no local drift to reconcile. |
| Site-local icons | `assets/icons/project-icons.svg` — 12 symbols, git-tracked, hand-maintained. Five names collide with design-system icon names: `add`, `close-circled`, `arrow-up`, `arrow-down`, `document`. Harmless today since it's a separate file, but the future `icons.manifest.json` build treats collisions as errors — these need renaming (e.g. an `fs-` prefix) before the manifest lands. |
| Hand-rolled JS | Dialog/toast/tooltip behavior is written by hand against design-system CSS classes rather than using package modules. Kept for now — backlog item to adopt the package modules later. |

## Work queue

- [ ] Bump the pin to `^2.1.0` once design-system v2.1.0 ships; switch `postinstall` to `npx bd-sync`; delete `scripts/sync-design-system.js`
- [ ] Run the v2 spacing review — v2.0.0 made blocks gap-only (child margins reset inside `.block`); audit dialog/toast/tooltip-bearing pages before and after the bump
- [ ] Adopt `icons.manifest.json`; rename the 5 colliding project icons (e.g. `fs-add`, `fs-close-circled`, `fs-arrow-up`, `fs-arrow-down`, `fs-document`)
- [ ] Slim this doc down to steady-state once the above is done

## How the update system works (target state)

The design system ships as a versioned package from `github:bydefaultstudio/design-system-dist`, installed via:

```json
"@bydefaultstudio/design-system": "github:bydefaultstudio/design-system-dist#semver:^2.1.0"
```

`npx bd-sync` runs as a postinstall step and copies versioned artifacts — CSS, icons, JS modules, `DESIGN.md` — into the site. These vendored copies are gitignored and regenerated on every install, never edited by hand. Every artifact carries a `@bydefaultstudio/design-system vX.Y.Z` stamp header, so drift between what's vendored and what's live upstream is greppable at a glance.

During development, `npx bd-sync --local` copies from the sibling "Design System" working tree instead of the published package. The flow stays upstream-first: shared modules only ever change in the design-system repo, then get released and pulled down through a version bump — never patched in place downstream.

Icons come from an `icons.manifest.json` (design-system icon names plus any site-local icons), which `bd-sprite` builds into the site's icon sprite. Sites without a manifest get the full master sprite instead.

Dependabot watches the pin and opens a PR on every design-system release.

`bd-sync` and `bd-sprite` ship with design-system v2.1.0 (in progress); until that lands, this repo's current sync scripts stay in place.

Full strategy lives in the design-system repo: `cms/upgrading-docs.md`.
