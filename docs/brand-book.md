---
title: "Brand Book"
subtitle: "Your project's visual identity"
description: "Preview of the brand layer applied by theme.css — logo, colours, typography, and iconography — over the neutral design system."
section: "Brand"
order: 1
---

> Claude: Treat this document as authoritative.

This page previews the brand that `assets/css/theme.css` applies over the neutral design system. Out of the box it shows the engine defaults — system font stacks, a neutral grey ramp, and the default accent. As you fill in `theme.css`, every demo on this page (and every page built with the system) picks up your brand automatically.

## Logo

The primary logo lives at `assets/images/logo.svg`. Replace it with your own file and keep the path — templates and pages reference it directly.

<div class="demo-preview is-centered">
  <img src="../../assets/images/logo.svg" alt="Primary logo" style="max-width: 300px; height: auto;">
</div>

On dark backgrounds, supply a proper dark-mode logo variant (e.g. `logo-dark.svg`) rather than CSS-inverting the light one — `filter: invert(1)` distorts any non-monochrome mark.

<div class="demo-preview is-centered" style="background-color: var(--neutral-900);">
  <img src="../../assets/images/logo.svg" alt="Logo on dark background" style="max-width: 300px; height: auto;">
</div>

## Colours

These are the tokens a theme owns. Overriding them in `theme.css` re-colours the whole system — semantic tokens cascade through them. See [Color](https://bydefault.design/design-system/color.html) for the full token reference.

### Accent

`--text-accent` drives `--text-link` and `--input-focus`.

<div class="demo-preview is-centered">
  <div style="background-color: var(--text-accent); width: 160px; height: 80px; border-radius: var(--radius-s);"></div>
  <span class="token-tag">--text-accent</span>
</div>

### Neutral ramp

The greys behind text, backgrounds, and borders. Brands with a tinted palette override these steps.

<div class="demo-preview is-centered">
  <div style="background-color: var(--neutral-50); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-100); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-150); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-200); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-300); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-400); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-500); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-600); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-700); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-800); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-900); width: 56px; height: 56px;"></div>
  <div style="background-color: var(--neutral-950); width: 56px; height: 56px;"></div>
</div>

`--neutral-50` (lightest) through `--neutral-950` (darkest), in steps of 50/100/150/200/300/400/500/600/700/800/900/950.

### Backgrounds and text

Semantic tokens that resolve through the primitives above. Prefer these in layouts and components.

<div class="demo-preview is-centered">
  <div class="block gap-xs">
    <div style="background-color: var(--background-primary); border: var(--border-s) solid var(--border-secondary); width: 120px; height: 56px;"></div>
    <span class="token-tag">--background-primary</span>
  </div>
  <div class="block gap-xs">
    <div style="background-color: var(--background-secondary); width: 120px; height: 56px;"></div>
    <span class="token-tag">--background-secondary</span>
  </div>
  <div class="block gap-xs">
    <div style="background-color: var(--background-faded); width: 120px; height: 56px;"></div>
    <span class="token-tag">--background-faded</span>
  </div>
</div>

<div class="demo-preview is-centered">
  <div class="block gap-xs">
    <div style="background-color: var(--text-primary); width: 120px; height: 56px;"></div>
    <span class="token-tag">--text-primary</span>
  </div>
  <div class="block gap-xs">
    <div style="background-color: var(--text-secondary); width: 120px; height: 56px;"></div>
    <span class="token-tag">--text-secondary</span>
  </div>
  <div class="block gap-xs">
    <div style="background-color: var(--text-faded); width: 120px; height: 56px;"></div>
    <span class="token-tag">--text-faded</span>
  </div>
  <div class="block gap-xs">
    <div style="background-color: var(--text-link); width: 120px; height: 56px;"></div>
    <span class="token-tag">--text-link</span>
  </div>
</div>

## Typography

Three font tokens cover the whole system. Defaults are neutral system stacks; override them in `theme.css`.

### Primary — headings and UI

<div class="demo-preview">
  <div class="block gap-s">
    <span class="token-tag">--font-primary</span>
    <h3 style="font-family: var(--font-primary);">The quick brown fox jumps over the lazy dog</h3>
    <p style="font-family: var(--font-primary);">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p>
  </div>
</div>

### Secondary — editorial and body accents

<div class="demo-preview">
  <div class="block gap-s">
    <span class="token-tag">--font-secondary</span>
    <p style="font-family: var(--font-secondary);">The quick brown fox jumps over the lazy dog. Body copy set in the secondary face reads comfortably at paragraph length — 0123456789.</p>
  </div>
</div>

### Tertiary — code and data

<div class="demo-preview">
  <div class="block gap-s">
    <span class="token-tag">--font-tertiary</span>
    <p style="font-family: var(--font-tertiary);">const brand = applyTheme("theme.css"); // 0123456789</p>
  </div>
</div>

## Iconography

The favicon set lives in `assets/icons/`. Regenerate all four files from your mark when branding a project:

| File | Purpose |
| --- | --- |
| `favicon.svg` | Modern browsers, scales to any size |
| `favicon.ico` | Legacy fallback |
| `favicon-32x32.png` | Fixed-size PNG fallback |
| `apple-touch-icon.png` | iOS home-screen icon (180×180) |

<div class="demo-preview is-centered">
  <img src="../../assets/icons/favicon.svg" alt="Favicon" style="width: 64px; height: 64px;">
</div>

## Theming this template

`theme.css` loads after `design-system.css` and overrides **§1/§2 primitives only** — fonts, `--text-accent`, and the neutral ramp. Semantic tokens (`--text-*`, `--background-*`, buttons, forms) resolve through those primitives, so they cascade automatically; you should rarely restate them.

```css
/* assets/css/theme.css */
:root {
  --font-primary: "Your Font", sans-serif;
  --text-accent: #3485cd;
  --neutral-900: #14161a; /* tinted darks, if the brand calls for it */
}
```

For brand values that differ in dark mode, add a `[data-theme="dark"]` block **and** a mirrored `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` block — the first serves the JS toggle, the second serves no-JS visitors following their OS preference. The two blocks must contain the same values; if they drift, toggled and OS-preference visitors see different brands.

```css
[data-theme="dark"] {
  --text-accent: #6cb2ff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --text-accent: #6cb2ff;
  }
}
```

See [Setup](setup.html) for the full project-branding checklist and [Color](https://bydefault.design/design-system/color.html) for the complete token reference.
