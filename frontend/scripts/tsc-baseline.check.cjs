const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readBaseline, classify, measure } = require('./tsc-baseline.cjs');
const diagnostic = code => `fixture.ts(1,1): error TS${code}: synthetic diagnostic\n`;
const result = (status, stdout = '', extra = {}) => ({ status, stdout, stderr: '', signal: null, ...extra });
let fixture;
before(() => { fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'deedpro-type-gate-')); });
after(() => console.log(`Disposable type-gate evidence retained at ${fixture}`));

for (const raw of [undefined, '', ' 83', '-1', '1.5', 'NaN', '1e2', '083', '9007199254740992']) {
  test(`baseline parser refuses ${String(raw)}`, () => assert.throws(() => readBaseline(raw)));
}
test('baseline parser retains exact zero and integer boundaries', () => {
  assert.equal(readBaseline('0'), 0); assert.equal(readBaseline('83'), 83);
});
test('a genuinely clean compiler succeeds at zero and debt baselines', () => {
  assert.equal(classify(result(0), 0).accepted, true);
  assert.equal(classify(result(0), 83).errors, 0);
});
for (const status of [1, 2]) {
  test(`recognized diagnostic exit ${status} accepts the exact 83-error boundary`, () => {
    assert.equal(classify(result(status, diagnostic(2322).repeat(83)), 83).errors, 83);
  });
}
test('improvement is measured without increasing or automatically rewriting the ceiling', () => {
  const verdict = classify(result(2, diagnostic(2322).repeat(82)), 83);
  assert.equal(verdict.accepted, true); assert.equal(verdict.errors, 82); assert.equal(verdict.improved, true);
});
test('valid indented detail and five-digit semantic diagnostics are retained', () => {
  assert.equal(classify(result(2, diagnostic(18046) + '  Synthetic continuation\n'), 83).errors, 1);
});
for (const [label, value] of [
  ['compiler did not start', result(127, 'SYNTHETIC: compiler did not start')],
  ['unexpected exit with apparently valid diagnostics', result(3, diagnostic(2322))],
  ['spawn error with apparent diagnostics', result(2, diagnostic(2322), { error: { code: 'ENOENT' } })],
  ['timeout', result(null, '', { error: { code: 'ETIMEDOUT' } })],
  ['signal', result(null, '', { signal: 'SIGTERM' })],
  ['null result', null],
  ['absent status', { stdout: '', stderr: '' }],
  ['missing output', { status: 0, stderr: '' }],
  ['non-string output', result(0, Buffer.from(''))],
  ['successful exit with diagnostics', result(0, diagnostic(2322))],
  ['successful exit with arbitrary text', result(0, 'SYNTHETIC: compiler did not run')],
  ['failed compiler without diagnostics', result(2)],
  ['84-error regression', result(2, diagnostic(2322).repeat(84))],
  ['syntax failure', result(2, diagnostic(1005))],
  ['no input files', result(2, 'error TS18003: No inputs were found\n')],
  ['missing configuration', result(1, 'error TS5058: Specified path does not exist\n')],
  ['unrecognized diagnostic format', result(2, 'error TSnot-a-code: synthetic\n')],
  ['unrecognized mixed output', result(2, diagnostic(2322) + 'FATAL SYNTHETIC FAILURE\n')],
]) {
  test(`the classifier refuses ${label}`, () => assert.equal(classify(value, 83).accepted, false));
}

function compiler(name, body) {
  const root = path.join(fixture, name); fs.mkdirSync(root);
  const file = path.join(root, 'compiler.cjs'); fs.writeFileSync(file, body);
  return { root, compiler: file, baseline: 83 };
}
test('the real process runner accepts a completed clean child', () => {
  assert.equal(measure(compiler('clean', 'process.exitCode = 0;')).accepted, true);
});
test('the real process runner measures the exact diagnostic boundary', () => {
  const options = compiler('boundary', `process.stdout.write(${JSON.stringify(diagnostic(2322).repeat(83))}); process.exitCode = 2;`);
  assert.equal(measure(options).errors, 83);
});
test('the original exit-127 false-success defect is permanently refused', () => {
  const options = compiler('startup-failure', "console.error('SYNTHETIC: compiler did not start'); process.exitCode = 127;");
  assert.equal(measure(options).accepted, false);
});
test('missing compiler files are refused without package-manager fallback', () => {
  assert.match(measure({ root: fixture, compiler: path.join(fixture, 'missing.cjs'), baseline: 83 }).reason, /missing/);
});
test('a compiler timeout is refused and its child is terminated', () => {
  assert.equal(measure({ ...compiler('timeout', 'setInterval(() => {}, 1000);'), timeoutMs: 50 }).accepted, false);
});
test('excessive output is refused rather than counted as a clean run', () => {
  assert.equal(measure(compiler('overflow', "process.stdout.write('x'.repeat(5 * 1024 * 1024));")).accepted, false);
});
test('stale build output is refused and left intact', () => {
  const options = compiler('stale', "throw new Error('Compiler must not run');");
  const generated = path.join(options.root, '.next'); fs.mkdirSync(generated);
  const marker = path.join(generated, 'keep.txt'); fs.writeFileSync(marker, 'retain');
  assert.match(measure(options).reason, /clean checkout/);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'retain');
});
test('the production runner has a finite timeout and does not accept an invalid one', () => {
  assert.match(measure({ root: fixture, baseline: 83, timeoutMs: 0 }).reason, /timeout/);
  assert.match(measure({ root: fixture, baseline: 83, timeoutMs: 180001 }).reason, /timeout/);
});
test('the hosted gate runs the refusal proofs and real compiler without swallowing failure', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/test.yml'), 'utf8');
  const job = workflow.slice(workflow.indexOf('\n  tsc-baseline:'));
  const ceiling = Number(job.match(/TSC_BASELINE:\s*(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(ceiling) && ceiling >= 0 && ceiling <= 83,
    'The frozen ceiling may be deliberately lowered, never raised above the reviewed maximum');
  assert.match(job, /run: node --test scripts\/tsc-baseline.check.cjs/);
  assert.match(job, /run: node scripts\/tsc-baseline.cjs/);
  assert.doesNotMatch(job, /\|\|\s*true|continue-on-error|npx tsc|rm -rf/);
});

// Exercise the actual maintained CLI, including its final process exit code,
// in a disposable project with a synthetic installed compiler. No override
// path or test-only bypass is added to the production CLI.
function cli(name, body, { baseline = '83', stale = false } = {}) {
  const root = path.join(fixture, 'cli-' + name); fs.mkdirSync(root);
  const script = path.join(root, 'scripts/tsc-baseline.cjs');
  fs.mkdirSync(path.dirname(script)); fs.copyFileSync(path.join(__dirname, 'tsc-baseline.cjs'), script);
  if (body !== null) {
    const installed = path.join(root, 'node_modules/typescript/bin/tsc');
    fs.mkdirSync(path.dirname(installed), { recursive: true }); fs.writeFileSync(installed, body);
  }
  if (stale) fs.mkdirSync(path.join(root, '.next'));
  const allowed = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP']);
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase()))),
    TSC_BASELINE: baseline };
  const child = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8', timeout: 10000,
    maxBuffer: 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(root, 'stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(root, 'stderr.log'), child.stderr || '');
  assert.ifError(child.error); return { ...child, root };
}
test('the actual CLI succeeds for a clean completed compiler', () => {
  const child = cli('clean', 'process.exitCode = 0;');
  assert.equal(child.status, 0); assert.match(child.stdout, /tsc errors: 0 \(baseline 83\)/);
});
test('the actual CLI accepts exactly 83 measured diagnostics', () => {
  const child = cli('boundary', `process.stdout.write(${JSON.stringify(diagnostic(2322).repeat(83))}); process.exitCode = 2;`);
  assert.equal(child.status, 0); assert.match(child.stdout, /tsc errors: 83 \(baseline 83\)/);
});
for (const [name, body] of [
  ['startup', "console.error('SYNTHETIC: compiler did not start'); process.exitCode = 127;"],
  ['silent-failure', 'process.exitCode = 2;'],
  ['syntax', `process.stdout.write(${JSON.stringify(diagnostic(1005))}); process.exitCode = 2;`],
  ['missing', null],
]) {
  test(`the actual CLI exits nonzero for ${name}`, () => {
    const child = cli(name, body); assert.equal(child.status, 1); assert.match(child.stderr, /Type gate refused:/);
    assert.doesNotMatch(child.stdout, /tsc improved|tsc errors: 0/);
  });
}
test('the actual CLI rejects a malformed baseline before invoking the compiler', () => {
  const child = cli('bad-baseline', "throw new Error('MUST NOT RUN');", { baseline: 'NaN' });
  assert.equal(child.status, 1); assert.match(child.stderr, /TSC_BASELINE/); assert.doesNotMatch(child.stderr, /MUST NOT RUN/);
});
test('the actual CLI rejects and retains stale build output', () => {
  const child = cli('stale', "throw new Error('MUST NOT RUN');", { stale: true });
  assert.equal(child.status, 1); assert.match(child.stderr, /clean checkout/);
  assert.ok(fs.existsSync(path.join(child.root, '.next')));
});
