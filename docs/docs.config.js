/**
 * Docs Configuration
 * Project-specific settings for the documentation site, consumed by the
 * docs-kit generator shipped inside @bydefaultstudio/design-system
 * (run via `npm run docs:build`). All paths are project-root-relative.
 *
 * designSystemPath is deliberately omitted: the generator uses the
 * packaged design-system.css, which is identical to the synced copy
 * in assets/css/.
 */
module.exports = {

  // The docs site is served at this subpath of the main site
  // ('' if the output is served as its own site root)
  basePath: '/docs/site',

  // Optional extra brand stylesheet, loaded after the design system;
  // the generator copies it into the output and links it after the
  // framework CSS
  brandCssPath: 'assets/css/theme.css',

  // Footer text
  footerText: '© 2026 By Default — Folder Structure',

  // Index page description (shown on the docs homepage)
  indexDescription: 'Documentation for Folder Structure — a tool for visualising folder structures and generating AI-ready descriptions of them.',

};
