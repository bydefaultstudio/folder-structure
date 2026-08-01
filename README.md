# Folder Structure

This project uses a structured design system and layout architecture for building consistent, maintainable front-end experiences.

## Overview

This project includes:

- A complete **design system** with tokens, utility classes, and components — shipping neutral defaults, with dark mode built in
- A **brand theme** (`assets/css/theme.css`) for per-project visual identity (fonts, colours, logo)
- Clear **layout and spacing rules** for consistent page structure
- Documented **best practices** for CSS, JavaScript, and HTML

## Getting Started

### With Claude Code (recommended)

Open the project in Claude Code and say:

> Set up this project

Claude follows the onboarding flow in `CLAUDE.md`: it runs `npm install` to sync the design system, interviews you to fill in `PROJECT_BRIEF.md`, propagates your project name across the template, applies any known brand tokens to `assets/css/theme.css`, and regenerates the docs site.

### Manual setup

1. Run `npm install` — this syncs the design system CSS from the `@bydefaultstudio/design-system` package into `assets/css/design-system.css`
2. Review `PROJECT_BRIEF.md` for project goals and requirements
3. Follow the [Setup guide](docs/site/setup.html) to customize brand colors, fonts, and logo
4. Explore the [Documentation](docs/site/index.html) for template and project guides
5. Browse the canonical design system docs at [bydefault.design](https://bydefault.design/website/what-is-a-design-system.html)
6. Check the [Brand Book](docs/site/brand-book.html) to see the current brand identity
7. Start building pages at the repo root — edit `index.html`, copy `templates/page-template.html` for new pages, and keep css/js/images in `assets/`

> **Note on the lockfile:** this template deliberately ignores `package-lock.json`, so a project created from it resolves the newest compatible design system version at first install. Once your project is under way, feel free to commit your own lockfile for stability.

> **Updating the design system later:** run `npm update @bydefaultstudio/design-system` — the postinstall sync re-copies the updated artefacts into place automatically. Dependabot also opens a PR when a new version is released.

## Deployment

Any static host works (Cloudflare Pages, Netlify, Vercel…). Configure the host with build command `npm install` and publish directory `/` — the install step is required because the design system CSS is synced, not committed. See the [Setup guide](docs/site/setup.html#deployment) for details.

## Documentation

Template and project documentation is available in the [Documentation site](docs/site/index.html), including:

- **Brand** — Brand book and theming guide
- **Content** — Markdown style and SEO best practices
- **Project** — Setup, folder structure, and project overview

The design system itself arrives via the `@bydefaultstudio/design-system` npm package; its canonical documentation lives at [bydefault.design](https://bydefault.design).

---

**ByDefault Studio** — [bydefault.studio](https://bydefault.studio)
