#!/usr/bin/env node
/**
 * convert-tailwind-v4-to-v3.mjs
 * Usage: node convert-tailwind-v4-to-v3.mjs input.css > output.css
 */
import fs from 'node:fs';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node convert-tailwind-v4-to-v3.mjs input.css > output.css');
  process.exit(1);
}
let css = fs.readFileSync(input, 'utf8');

// Replace v4 import with v3 directives
css = css.replace(/@import\s+["']tailwindcss["'];?/g, '@tailwind base;\n@tailwind components;\n@tailwind utilities;');

// Remove @theme inline blocks (simple heuristic)
css = css.replace(/@theme\s+inline\s*\{[\s\S]*?\}\s*/g, '');

// Remove known v4 tokens that conflict
css = css.replace(/--tw-(?:[^:;]+):[^;]+;?/g, '');

// Optional: strip nested @media inside @theme (best-effort)
css = css.replace(/@media\s*\([^)]+\)\s*\{[\s\S]*?\}\s*/g, (m) => m);

// Output
process.stdout.write(css);
