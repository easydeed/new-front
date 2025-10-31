// Lightweight Tailwind v4 → v3 converter for V0 CSS outputs
// Usage: node tools/convert-tailwind-v4-to-v3.mjs path/to/file.css > path/to/file.converted.css

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node convert-tailwind-v4-to-v3.mjs <file.css>');
  process.exit(1);
}
const css = fs.readFileSync(file, 'utf8');

let out = css
  .replace(/@import\s+["']tailwindcss["'];?/g, '@tailwind base;\n@tailwind components;\n@tailwind utilities;')
  .replace(/@theme\s+inline\s*\{[\s\S]*?\}/g, ''); // remove v4 inline theme blocks

process.stdout.write(out);
