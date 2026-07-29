---
title: "Folders"
subtitle: "File organization and directory structure"
description: "Guide defining where files live and why in the project structure."
section: "Project"
order: 4
---

> Claude: Treat this document as authoritative.

This document defines where files live and why.

Do not add new top-level folders without updating this file.

## Structure

```
index.html              → Starter page (replace with project homepage)
CLAUDE.md               → Claude Code development rules (authoritative)
README.md               → Project overview and getting started
PROJECT_BRIEF.md        → Project brief and requirements
PROJECT_PROGRESS.md     → Progress tracker for ongoing work
package.json            → npm manifest: design system dependency + postinstall sync
scripts/
  sync-design-system.js → Copies the design system CSS from node_modules into assets/css
.github/
  dependabot.yml        → Weekly checks for new design system versions
assets/
  css/
    design-system.css   → Design system framework — synced from the
                          @bydefaultstudio/design-system npm package on
                          npm install; gitignored, never hand-edited
    theme.css           → Brand overrides (primitives, fonts)
    style.css           → Project-specific styles
  js/
    theme-toggle.js     → Dark-mode toggle
  fonts/                → Self-hosted web fonts
  icons/                → Favicons and app icons
  images/               → General images and Open Graph images
templates/              → Page and component boilerplate
docs/                   → Documentation (markdown sources + generated site)
```

`node_modules/` and `package-lock.json` are gitignored. The lockfile is deliberately not committed in the template so new projects resolve the newest compatible design system at first install; projects may commit their own lockfile afterwards.

## assets/css/

The three-layer CSS contract. Load order matters — every page links them in this sequence:

1. `design-system.css` — the framework: tokens, base styles, layout primitives, utilities, components. Synced from the `@bydefaultstudio/design-system` npm package on `npm install` — never edit it; changes belong upstream in the design-system repo. Ships neutral working defaults.
2. `theme.css` — your brand: overrides §1/§2 primitives (fonts, `--text-accent`, neutrals) and loads brand fonts via `@font-face` or `@import`. Semantics cascade through the primitives.
3. `style.css` — project-specific styles built on top of the system.

## assets/js/

- `theme-toggle.js` — dark-mode toggle: sets `data-theme` on `<html>`, persists to localStorage, defaults to the OS preference, and injects icons into `.dark-mode-toggle` buttons.

## assets/fonts/

Self-hosted web font files, referenced by `@font-face` declarations in `theme.css`.

## assets/icons/

Favicons and app icons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, …). Referenced directly in each page's `<head>`; treated as brand assets, not part of the design system.

## assets/images/

General image assets and Open Graph images.

## templates/

Boilerplate for new files:

- `page-template.html` → HTML page template (correct stylesheet order, SEO meta tags)
- `component-template.css` → CSS component template
- `component-template.js` → JavaScript component template

## docs/

- Markdown documentation files (the sources — edit these)
- `docs.config.js` → Project-specific doc settings (base path, brand CSS path, footer, description)
- `site/` → Generated HTML documentation — **never hand-edit**; regenerate with `npm run docs:build`
  - `assets/icons/` → Docs favicons — preserved across rebuilds
  - `assets/docs-kit/` → Engine CSS and scripts, copied in by the generator on every build

The docs site engine (docs-kit) ships inside the `@bydefaultstudio/design-system` npm package and runs from `node_modules` — there is no vendored generator to maintain. The generator bundles the packaged framework CSS into the output and copies `theme.css` in after it, so docs pages render live brand values. Built for serving at the `/docs/site` subpath of the main site (`basePath` in `docs.config.js`).

## Notes

Empty folders are tracked using `.gitkeep` to preserve structure in the template.
