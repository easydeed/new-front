const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

const required = ['zod', 'clsx'];
const missing = required.filter((r) => !deps.has(r));

if (missing.length) {
  console.error('Missing dependencies in /frontend/package.json:', missing.join(', '));
  process.exit(1);
}


