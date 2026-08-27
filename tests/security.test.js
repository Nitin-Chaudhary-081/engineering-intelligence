import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { auditSecurity } from '../src/lib/security.js';

describe('security', () => {
  it('detects secret leak as FAILED', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-sec-'));
    try {
      fs.writeFileSync(path.join(dir, 'bad.js'), `const key = "sk-12345678901234567890abcdef";`);
      const res = auditSecurity(dir, [{ path: 'bad.js' }]);
      const secret = res.findings.find(f => f.id === 'SEC-SECRETS-001');
      assert.equal(secret.status, 'FAILED');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('unknown when no evidence for deps', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-sec2-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.js'), `console.log('hi')`);
      const res = auditSecurity(dir, [{ path: 'a.js' }]);
      const deps = res.findings.find(f => f.id === 'SEC-DEPS-001');
      assert.equal(deps.status, 'UNKNOWN');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
