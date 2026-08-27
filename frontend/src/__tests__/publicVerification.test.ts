import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const page = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'verify', '[code]', 'page.tsx'),
  'utf8',
);

describe('the public verification page uses the bounded contract', () => {
  it('calls the one rate-limited v1 verification endpoint', () => {
    expect(page).toContain('${apiUrl}/api/v1/verify/${code}');
    expect(page).not.toContain('${apiUrl}/api/verify/');
  });

  it('does not render deed contents or verification telemetry', () => {
    for (const sensitiveField of [
      'propertyAddress',
      'apn',
      'grantor',
      'grantee',
      'contentHash',
      'verificationCount',
    ]) {
      expect(page).not.toContain(sensitiveField);
    }
  });
});
