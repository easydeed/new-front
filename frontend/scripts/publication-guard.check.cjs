// Owner-approved preparation only. This checks repository configuration;
// it neither calls Vercel/Render nor proves a deployment was suppressed live.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BRANCH = 'codex/ci-node22-compiler-guard';
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
function exactBranchOnly(value) {
  assert.deepEqual(value.git, { deploymentEnabled: { [BRANCH]: false } },
    'Only the approved review branch may be disabled; main and other branches must retain their existing behavior');
}

test('the configuration at the verified frontend project root suppresses only the review branch', () => {
  exactBranchOnly(config);
});
for (const [label, git] of [
  ['missing guard', undefined],
  ['global disable', { deploymentEnabled: false }],
  ['global enable', { deploymentEnabled: true }],
  ['review enabled', { deploymentEnabled: { [BRANCH]: true } }],
  ['production disabled', { deploymentEnabled: { [BRANCH]: false, main: false } }],
  ['wildcard disable', { deploymentEnabled: { [BRANCH]: false, '*': false } }],
  ['overlapping enable', { deploymentEnabled: { [BRANCH]: false, 'codex/*': true } }],
  ['different branch', { deploymentEnabled: { 'codex/other': false } }],
]) {
  test(`the no-preview guard rejects ${label}`, () => {
    assert.throws(() => exactBranchOnly({ ...config, git }));
  });
}

test('the no-preview check remains a blocking hosted step', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/test.yml'), 'utf8');
  const step = workflow.match(/    - name: Publication branch guard[^\n]*\n[\s\S]*?(?=\n    - |\n  [a-z]|$)/)?.[0];
  assert.ok(step);
  assert.ok(step.includes('run: node --test scripts/publication-guard.check.cjs'));
  assert.doesNotMatch(step, /continue-on-error|\|\|\s*true|\n\s+if:/);
});
