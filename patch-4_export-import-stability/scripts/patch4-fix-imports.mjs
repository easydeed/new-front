#!/usr/bin/env node
/**
 * Patch 4 codemod — export/import stability
 * - Rewrites incorrect default/named imports using the canonical map
 * - Also upgrades preview redirects to preserve ?mode=<mode> with withMode()
 *
 * Usage:
 *   node scripts/patch4-fix-imports.mjs           # dry-run
 *   node scripts/patch4-fix-imports.mjs --write   # apply
 */
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const write = process.argv.includes('--write');
const repoRoot = process.cwd();

// Where to search
const SEARCH_ROOTS = ['src', 'frontend/src'];

// Canonical map from Phase 15 v5 audit (components default; hooks/utils named)
const CANON = [
  // Named exports
  { suffix: 'bridge/useWizardStoreBridge',    type: 'named',   name: 'useWizardStoreBridge' },
  { suffix: 'bridge/persistenceKeys',         type: 'named',   names: ['WIZARD_DRAFT_KEY_MODERN','WIZARD_DRAFT_KEY_CLASSIC'] },
  { suffix: 'bridge/debugLogs',               type: 'named',   name: 'dbg' },
  { suffix: 'ModeContext',                    type: 'named',   names: ['WizardModeProvider','useWizardMode'] },
  { suffix: 'prompts/promptFlows',            type: 'named',   names: ['slug','promptFlows'] },
  { suffix: 'utils/docType',                  type: 'named',   names: ['canonicalFromUrlParam','toUrlSlug','toLabel'] },
  { suffix: 'validation/validators',          type: 'named',   name: 'validators' },
  { suffix: 'validation/usePromptValidation', type: 'named',   name: 'usePromptValidation' },
  { suffix: 'review/smartReviewTemplates',    type: 'named',   name: 'buildReviewLines' },

  // Default exports
  { suffix: 'engines/ModernEngine',           type: 'default', name: 'ModernEngine' },
  { suffix: 'engines/ClassicEngine',          type: 'default', name: 'ClassicEngine' },
  { suffix: 'WizardHost',                     type: 'default', name: 'WizardHost' },
  { suffix: 'WizardModeBoundary',             type: 'default', name: 'WizardModeBoundary' },
  { suffix: 'ModeSwitcher',                   type: 'default', name: 'ModeSwitcher' },
  { suffix: 'HydrationGate',                  type: 'default', name: 'HydrationGate' },
  { suffix: 'components/SmartReview',         type: 'default', name: 'SmartReview' },
  { suffix: 'components/StepShell',           type: 'default', name: 'StepShell' },
  { suffix: 'components/ProgressBar',         type: 'default', name: 'ProgressBar' },
  { suffix: 'components/MicroSummary',        type: 'default', name: 'MicroSummary' },
  { suffix: 'components/DeedTypeBadge',       type: 'default', name: 'DeedTypeBadge' },
  { suffix: 'components/ToggleSwitch',        type: 'default', name: 'ToggleSwitch' },
  { suffix: 'components/controls/SmartSelectInput', type: 'default', name:'SmartSelectInput' },
  { suffix: 'layout/WizardFrame',             type: 'default', name: 'WizardFrame' },
  { suffix: 'bridge/PropertyStepBridge',      type: 'default', name: 'PropertyStepBridge' },
  { suffix: 'engines/steps/StepShell',        type: 'default', name: 'StepShell' },
  { suffix: 'engines/steps/SmartReview',      type: 'default', name: 'SmartReview' },
  { suffix: 'engines/steps/MicroSummary',     type: 'default', name: 'MicroSummary' },
];

// Also upgrade preview redirects to keep mode
const PREVIEW_REDIRECT_REGEXES = [
  // router.push(`/deeds/${id}/preview`)
  { find: /(router\.(?:push|replace)\()\s*`([^`]*\/deeds\/\$\{[^}]+\}\/preview[^`]*)`\s*(\))/g,
    replace: '$1 withMode(`$2`, mode) $3',
    note: 'wrap router.push/replace to preview with withMode()'
  },
  // window.location.href = `/deeds/${id}/preview`
  { find: /(window\.location\.href\s*=\s*)`([^`]*\/deeds\/\$\{[^}]+\}\/preview[^`]*)`/g,
    replace: '$1 withMode(`$2`, mode)',
    note: 'wrap window.location.href to preview with withMode()'
  }
];

const results = [];
const diffChunks = [];

/**
 * Normalize a fromSource path (strip extension, unify slashes)
 */
function normSource(src) {
  return src.replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
}

/**
 * Attempts to fix a single import line according to the canonical map.
 * Returns { changedLine, changed:boolean, reason?:string }
 */
function fixImportLine(line) {
  if (!line.startsWith('import')) return { changedLine: line, changed: false };

  const m = line.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"]\s*;?\s*$/);
  if (!m) return { changedLine: line, changed: false };

  const clause = m[1];
  const src = normSource(m[2]);

  // Find a canon rule whose suffix matches this source
  const rule = CANON.find(r => src.endsWith(r.suffix));
  if (!rule) return { changedLine: line, changed: false };

  // Helpers
  const hasDefault = !clause.trim().startsWith('{');
  const namedMatch = clause.match(/^\{([^}]+)\}$/);
  const namedItems = namedMatch ? namedMatch[1].split(',').map(s => s.trim()) : [];

  if (rule.type === 'named') {
    // Should be: import { name } from 'src'
    if (hasDefault) {
      // e.g., import useWizardStoreBridge from '...'
      const names = rule.names || [rule.name];
      const newClause = `{ ${names.join(', ')} }`;
      return {
        changedLine: `import ${newClause} from '${m[2]}';`,
        changed: true,
        reason: `default→named (${names.join(',')})`
      };
    } else {
      // Already a named import – ensure it contains the right members
      const want = new Set((rule.names || [rule.name]));
      const have = new Set(namedItems.map(s => s.split(/\s+as\s+/)[0]));
      let updated = false;

      for (const w of want) {
        if (!have.has(w)) {
          namedItems.push(w);
          updated = true;
        }
      }
      if (updated) {
        return {
          changedLine: `import { ${namedItems.join(', ')} } from '${m[2]}';`,
          changed: true,
          reason: 'ensure named members present'
        };
      }
      return { changedLine: line, changed: false };
    }
  }

  if (rule.type === 'default') {
    // Should be: import Name from 'src'
    if (hasDefault) {
      // Already default import – OK
      return { changedLine: line, changed: false };
    } else {
      // Named import(s) from a default-only module. If one alias equals canonical name, use it; else keep first entry.
      const first = namedItems[0] || rule.name;
      let localName = first;
      // handle "ModernEngine as X"
      const aliasMatch = first.match(/^(\w+)\s+as\s+(\w+)$/);
      if (aliasMatch) {
        localName = aliasMatch[2];
      }
      return {
        changedLine: `import ${localName} from '${m[2]}';`,
        changed: true,
        reason: 'named→default (component)'
      };
    }
  }

  return { changedLine: line, changed: false };
}

/**
 * Process a single file
 */
function processFile(absPath) {
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, '/');
  const src = fs.readFileSync(absPath, 'utf8');
  const lines = src.split(/\r?\n/);
  let changed = false;
  let out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const r = fixImportLine(line);
    if (r.changed) {
      changed = true;
      out.push(r.changedLine);
      diffChunks.push(`// ${rel}: ${r.reason}\n- ${line}\n+ ${r.changedLine}\n`);
    } else {
      out.push(line);
    }
  }

  // Upgrade preview redirects
  let post = out.join('\n');
  let previewChanged = false;
  for (const rule of PREVIEW_REDIRECT_REGEXES) {
    const before = post;
    post = post.replace(rule.find, rule.replace);
    if (post !== before) {
      previewChanged = true;
      diffChunks.push(`// ${rel}: ${rule.note}\n`);
    }
  }

  if (changed || previewChanged) {
    results.push(rel);
    if (write) fs.writeFileSync(absPath, post, 'utf8');
  }
}

function walkDir(root) {
  if (!fs.existsSync(root)) return;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(root, e.name);
    if (e.isDirectory()) {
      // skip build outputs and node_modules
      if (['.next', 'dist', 'build', 'out', 'node_modules'].includes(e.name)) continue;
      walkDir(abs);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      processFile(abs);
    }
  }
}

for (const root of SEARCH_ROOTS) {
  walkDir(path.join(repoRoot, root));
}

// Save diff for review
if (results.length) {
  const patchDir = path.join(repoRoot, '.patch4');
  fs.mkdirSync(patchDir, { recursive: true });
  const diffPath = path.join(patchDir, 'last-run.diff');
  fs.writeFileSync(diffPath, diffChunks.join('\n'), 'utf8');
}

console.log(`Patch4 codemod ${write ? 'APPLIED' : 'DRY-RUN'} — files ${results.length}`);
results.forEach(f => console.log('  •', f));
if (!write) {
  console.log('\nTo apply changes, re-run with --write');
}
