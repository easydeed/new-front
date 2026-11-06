import * as path from 'path';
import { describe, expect, it } from '@jest/globals';
import { relativeSourcePath } from '../test-support/sourceText';

describe('source scanner allowlist paths', () => {
  it('uses the same key for Windows and POSIX checkouts', () => {
    expect(relativeSourcePath('C:\\repo\\src', 'C:\\repo\\src\\lib\\trial.ts', path.win32))
      .toBe('lib/trial.ts');
    expect(relativeSourcePath('/repo/src', '/repo/src/lib/trial.ts', path.posix))
      .toBe('lib/trial.ts');
  });
});
