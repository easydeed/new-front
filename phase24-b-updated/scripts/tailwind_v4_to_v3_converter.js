#!/usr/bin/env node
/**
 * Minimal Tailwind v4 -> v3 converter for V0 CSS outputs.
 * Usage: node tailwind_v4_to_v3_converter.js input.css > output.css
 */
const fs = require('fs')

const input = fs.readFileSync(process.argv[2], 'utf8')
  .replace(/@import\s+["']tailwindcss["'];?/g, '@tailwind base;\n@tailwind components;\n@tailwind utilities;')
  .replace(/@theme\s+inline\s*\{[\s\S]*?\}/g, '') // strip Tailwind v4 inline theme blocks
  .replace(/:where\(/g, '(') // some versions emit :where selectors; optional

process.stdout.write(input)
