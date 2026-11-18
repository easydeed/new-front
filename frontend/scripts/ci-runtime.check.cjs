// A source/configuration guard only: no application or provider requests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function requireNode22(workflow) {
  const setups = workflow.match(/uses:\s*actions\/setup-node@[^\s]+/g) || [];
  const versions = [...workflow.matchAll(/^\s+node-version:\s*['"]?([^\s'"]+)['"]?\s*$/gm)];
  assert.ok(setups.length > 0, 'A maintained Node setup is required');
  assert.equal(versions.length, setups.length, 'Every Node setup needs an explicit literal major');
  assert.ok(versions.every(match => match[1] === '22'), 'Hosted verification must use the approved supported Node 22 line');
  assert.doesNotMatch(workflow, /^\s+node-version-file:/m);
}

test('the guard itself runs on the selected Node 22 major', () => {
  assert.equal(process.versions.node.split('.')[0], '22');
});
for (const name of ['ci.yml', 'test.yml']) {
  test(`${name} pins every Node job to the supported runtime`, () => {
    requireNode22(fs.readFileSync(path.join(__dirname, '../../.github/workflows', name), 'utf8'));
  });
}
const fixture = "- uses: actions/setup-node@v4\n  with:\n    node-version: '22'\n";
test('an explicitly configured supported setup is accepted', () => requireNode22(fixture));
for (const [name, input] of [
  ['unsupported major', fixture.replace("'22'", "'20'")],
  ['mixed old and new jobs', fixture + fixture.replace("'22'", "'20'")],
  ['moving latest alias', fixture.replace("'22'", "'latest'")],
  ['unmeasured setup', '- uses: actions/setup-node@v4\n'],
  ['no setup', 'jobs: {}\n'],
  ['unapproved version file', fixture + '    node-version-file: .nvmrc\n'],
]) {
  test(`the runtime guard refuses ${name}`, () => assert.throws(() => requireNode22(input)));
}
test('the runtime guard remains wired as a blocking hosted check', () => {
  const file = fs.readFileSync(path.join(__dirname, '../../.github/workflows/test.yml'), 'utf8');
  const step = file.match(/    - name: Supported CI runtime regression guard[^\n]*\n[\s\S]*?(?=\n    - |\n  [a-z]|$)/)?.[0];
  assert.ok(step);
  assert.ok(step.includes('run: node --test scripts/ci-runtime.check.cjs'));
  assert.doesNotMatch(step, /continue-on-error|\|\|\s*true|\n\s+if:/);
});
