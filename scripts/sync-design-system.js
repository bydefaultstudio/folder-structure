// Copies design system artefacts from the installed npm package into the
// places the project expects them. Runs automatically on npm install via
// the postinstall hook.
//
//   dist/design-system.css -> assets/css/design-system.css
//   dist/icons.svg         -> assets/icons/icons.svg
//   dist/DESIGN.md         -> DESIGN.md (project root)
//
// docs-kit is deliberately NOT copied — it is a tool run in place from
// node_modules (see the docs:build script in package.json).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = path.join(root, 'node_modules', '@bydefaultstudio', 'design-system', 'dist');

if (!fs.existsSync(pkg)) {
  console.error('Design system package not found. Run npm install first.');
  process.exit(1);
}

const copies = [
  ['design-system.css', path.join('assets', 'css', 'design-system.css')],
  ['icons.svg', path.join('assets', 'icons', 'icons.svg')],
  ['DESIGN.md', 'DESIGN.md'],
];

for (const [srcName, destRel] of copies) {
  const src = path.join(pkg, srcName);
  if (!fs.existsSync(src)) continue; // absent artefacts skip silently
  fs.copyFileSync(src, path.join(root, destRel));
  console.log(`Synced ${srcName} -> ${destRel}`);
}
