#!/usr/bin/env node
/**
 * Simple verifier: greps for obviously wrong patterns after codemod.
 * - default import of known-named modules
 * - named import of known-default modules
 */
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = process.cwd();

const NAMED_ONLY = [
  'bridge/useWizardStoreBridge',
  'bridge/persistenceKeys',
  'bridge/debugLogs',
  'ModeContext',
  'prompts/promptFlows',
  'utils/docType',
  'validation/validators',
  'validation/usePromptValidation',
  'review/smartReviewTemplates',
];

const DEFAULT_ONLY = [
  'engines/ModernEngine',
  'engines/ClassicEngine',
  'WizardHost',
  'WizardModeBoundary',
  'ModeSwitcher',
  'HydrationGate',
  'components/SmartReview',
  'components/StepShell',
  'components/ProgressBar',
  'components/MicroSummary',
  'components/DeedTypeBadge',
  'components/ToggleSwitch',
  'components/controls/SmartSelectInput',
  'layout/WizardFrame',
  'bridge/PropertyStepBridge',
  'engines/steps/StepShell',
  'engines/steps/SmartReview',
  'engines/steps/MicroSummary',
];

const SEARCH_ROOTS = ['src', 'frontend/src'];
let errors = 0;

function scanFile(absPath) {
  const txt = fs.readFileSync(absPath, 'utf8');
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, '/');

  // default import of a named-only file: "import X from '.../useWizardStoreBridge'"
  for (const s of NAMED_ONLY) {
    const re = new RegExp(`import\\s+[^\\{\\n]+\\s+from\\s+['"][^'"]*${s}['"]`, 'g');
    if (re.test(txt)) {
      console.log('❌ default import of named-only module:', s, 'in', rel);
      errors++;
    }
  }

  // named import of a default-only file: "import { X } from '.../ModernEngine'"
  for (const s of DEFAULT_ONLY) {
    const re = new RegExp(`import\\s*\\{[^\\}]+\\}\\s*from\\s*['"][^'"]*${s}['"]`, 'g');
    if (re.test(txt)) {
      console.log('❌ named import of default-only module:', s, 'in', rel);
      errors++;
    }
  }
}

function walkDir(root) {
  if (!fs.existsSync(root)) return;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(root, e.name);
    if (e.isDirectory()) {
      if (['.next', 'dist', 'build', 'out', 'node_modules'].includes(e.name)) continue;
      walkDir(abs);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      scanFile(abs);
    }
  }
}

for (const r of SEARCH_ROOTS) walkDir(path.join(repoRoot, r));
if (errors === 0) {
  console.log('✅ No obvious import-shape violations detected.');
} else {
  console.log(`Found ${errors} potential issues.`);
  process.exitCode = 1;
}
