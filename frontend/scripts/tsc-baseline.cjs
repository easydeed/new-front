// Measure the compiler, not just text resembling its diagnostics. No deletion,
// package lookup/download, network call, or application configuration loading.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TIMEOUT_MS = 180000;
const MAX_BUFFER = 4 * 1024 * 1024;

function readBaseline(raw) {
  if (typeof raw !== 'string' || !/^(0|[1-9]\d*)$/.test(raw)
      || !Number.isSafeInteger(Number(raw))) {
    throw new Error('TSC_BASELINE must be an explicit non-negative integer');
  }
  return Number(raw);
}

function classify(result, baseline) {
  const refuse = reason => ({ accepted: false, errors: null, reason });
  if (!Number.isSafeInteger(baseline) || baseline < 0) return refuse('Invalid baseline');
  if (!result || result.error || result.signal || !Number.isInteger(result.status)) {
    return refuse('Compiler did not complete normally');
  }
  if (![0, 1, 2].includes(result.status)) return refuse('Unrecognized compiler exit status');
  if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
    return refuse('Missing compiler output measurement');
  }
  const text = result.stdout + '\n' + result.stderr;
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (result.status === 0) {
    return lines.length ? refuse('Successful compiler emitted unexpected output')
      : { accepted: true, errors: 0, improved: baseline > 0 };
  }
  const diagnostics = [];
  for (const line of lines) {
    // Non-pretty TypeScript uses source locations for type debt and indented
    // continuation lines. Global/configuration errors are not baseline debt.
    const match = line.match(/^.+\(\d+,\d+\): error TS([1-9]\d{3,4}):/);
    if (match) diagnostics.push(Number(match[1]));
    else if (!/^\s{2,}\S/.test(line)) return refuse('Unrecognized or global compiler diagnostic');
  }
  if (!diagnostics.length) return refuse('Compiler failed without measured source diagnostics');
  if (diagnostics.some(code => code >= 1000 && code < 2000)) return refuse('A source file failed to parse');
  if (diagnostics.length > baseline) return refuse(`Type errors exceed baseline: ${diagnostics.length} > ${baseline}`);
  return { accepted: true, errors: diagnostics.length, improved: diagnostics.length < baseline };
}

function measure({ root = ROOT, compiler = path.join(root, 'node_modules/typescript/bin/tsc'),
  baseline, timeoutMs = TIMEOUT_MS } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TIMEOUT_MS) {
    return { accepted: false, errors: null, reason: 'Invalid compiler timeout' };
  }
  // A previous build changes the source set via generated route types. Refuse
  // it rather than deleting potentially user-owned build output.
  if (fs.existsSync(path.join(root, '.next'))) {
    return { accepted: false, errors: null, reason: 'Use a clean checkout without generated .next output' };
  }
  try {
    if (!fs.statSync(compiler).isFile()) throw new Error('Not a compiler file');
  } catch {
    return { accepted: false, errors: null, reason: 'The installed TypeScript compiler is missing' };
  }
  const result = spawnSync(process.execPath,
    [compiler, '--noEmit', '--incremental', 'false', '--pretty', 'false'],
    { cwd: root, encoding: 'utf8', timeout: timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true });
  return { ...classify(result, baseline), output: (result.stdout || '') + (result.stderr || '') };
}

function main() {
  let baseline;
  try { baseline = readBaseline(process.env.TSC_BASELINE); }
  catch (error) { console.error(`Type gate refused: ${error.message}`); return 1; }
  const verdict = measure({ baseline });
  if (!verdict.accepted) {
    console.error(`Type gate refused: ${verdict.reason}`);
    return 1;
  }
  if (verdict.output) process.stdout.write(verdict.output);
  console.log(`tsc errors: ${verdict.errors} (baseline ${baseline})`);
  if (verdict.improved) console.log(`::notice::tsc improved to ${verdict.errors}; lower TSC_BASELINE deliberately to lock in the gain.`);
  return 0;
}

module.exports = { readBaseline, classify, measure };
if (require.main === module) process.exitCode = main();
