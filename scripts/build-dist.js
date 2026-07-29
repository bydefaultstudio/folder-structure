// Assembles the deployable site into dist/ for Cloudflare Pages direct
// upload (npm run deploy). Only the public site is copied — docs,
// templates, markdown, and tooling must never reach the published host.
//
//   index.html -> dist/index.html
//   assets/    -> dist/assets/
//
// Requires npm install to have run first: assets/css/design-system.css
// and assets/icons/icons.svg only exist after the postinstall sync.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const synced = path.join(root, 'assets', 'css', 'design-system.css');
if (!fs.existsSync(synced)) {
  console.error('assets/css/design-system.css missing. Run npm install first.');
  process.exit(1);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), {
  recursive: true,
  filter: (src) => path.basename(src) !== '.DS_Store',
});

console.log('Built dist/ for deployment');
