# Folders

> Claude: Treat this document as authoritative.

This document defines where files live and why.

Do not add new top-level folders without updating this file.

## Structure

```
index.html              → The app: interactive folder-structure editor
embed.html              → Read-only embed viewer (renders a tree from the URL fragment)
CLAUDE.md               → Claude Code development rules (authoritative)
README.md               → Project overview, development and deployment
HANDOVER.md             → Live state-of-play between sessions
PROJECT_PROGRESS.md     → Append-only record of what shipped
ROADMAP.md              → Feature bank and launch checklist
icons.manifest.json     → Design-system icon names this site uses (input to the sprite build)
package.json            → npm manifest: design system dependency + postinstall sync
wrangler.jsonc          → Cloudflare Workers static-assets config (serves dist/)
scripts/
  build-dist.js         → Builds dist/ for deploy (copies index.html, embed.html, assets/)
.github/
  dependabot.yml        → Weekly checks for new design system versions
assets/
  css/
    design-system.css   → Design system framework — synced from the
                          @bydefaultstudio/design-system npm package on
                          npm install; gitignored, never hand-edited
    theme.css           → Brand overrides (primitives, fonts)
    style.css           → Project-specific styles
  js/                   → App modules (tree-*.js, app.js, theme-toggle.js,
                          synced design-system/)
  fonts/                → Self-hosted web fonts
  icons/                → Favicons, synced icons.svg sprite, hand-maintained
                          project-icons.svg
  images/               → General images and Open Graph images
docs/                   → Documentation (markdown)
```

`node_modules/` and `dist/` are gitignored. `package-lock.json` is deliberately **committed**: Cloudflare picks its package manager by lockfile, and without one it falls back to bun, which cannot resolve the design system's `#semver:` git range.

## assets/css/

The three-layer CSS contract. Load order matters — every page links them in this sequence:

1. `design-system.css` — the framework: tokens, base styles, layout primitives, utilities, components. Synced from the `@bydefaultstudio/design-system` npm package on `npm install` — never edit it; changes belong upstream in the design-system repo. Ships neutral working defaults.
2. `theme.css` — the brand: overrides §1/§2 primitives (fonts, `--text-accent`, neutrals) and loads brand fonts via `@font-face` or `@import`. Semantics cascade through the primitives.
3. `style.css` — project-specific styles built on top of the system.

## assets/js/

- `theme-toggle.js` — dark-mode toggle: sets `data-theme` on `<html>`, persists to localStorage, defaults to the OS preference, and injects icons into `.dark-mode-toggle` buttons.
- `tree-share.js` — fragment codec for share and embed links (see `docs/tree-notation.md` → Share-Link Fragment Encoding). Loaded by both `index.html` and `embed.html`.
- `tree-prompt.js` — data only: the AI prompt text offered by the import dialog's *Copy Prompt* button. A verbatim copy of the prompt block in `docs/tree-prompt.md`, duplicated here because `dist/` ships no markdown. Edit the two together.
- `embed.js` — bootstrap for `embed.html`: decodes the fragment, imports the tree read-only, wires zoom controls and the branding link.

## assets/fonts/

Self-hosted web font files, referenced by `@font-face` declarations in `theme.css`.

## assets/icons/

Favicons and app icons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, …) referenced directly in each page's `<head>`, plus two sprites: `icons.svg` (synced subset of the design-system set, driven by `icons.manifest.json`) and `project-icons.svg` (hand-maintained, git-tracked, this site's own icons).

## assets/images/

General image assets and Open Graph images.

## docs/

Markdown documentation — edit directly; there is no generated HTML docs site:

- `tree-notation.md` — the tree notation spec (authoritative for parsers, serializers and share links)
- `tree-prompt.md` — the AI prompt spec (paired byte-for-byte with `assets/js/tree-prompt.js`)
- `folder-structure.md` — this file
