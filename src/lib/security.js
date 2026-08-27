/**
 * Security Intelligence — evidence-backed controls
 * @module security
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { VERIFICATION_STATES } from './constants.js';

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  /password\s*=\s*["'][^"']+["']/i,
  /api[_-]?key\s*=\s*["'][^"']+["']/i,
];

const SECURITY_CHECKS = [
  {
    id: 'SEC-AUTH-001',
    claim: 'Authentication exists',
    check: (content) => /auth|passport|jwt|oauth|session/i.test(content),
    evidenceType: 'CODE',
  },
  {
    id: 'SEC-INJECTION-001',
    claim: 'SQL injection protection exists',
    check: (content) => /parameterized|preparedStatement|placeholder|\?\s*,|\$\d/.test(content) || /sequelize|prisma|knex/i.test(content),
    evidenceType: 'CODE',
  },
  {
    id: 'SEC-SECRETS-001',
    claim: 'Secrets not committed',
    check: (content, filePath) => !SECRET_PATTERNS.some(r => r.test(content)),
    evidenceType: 'CODE',
  },
  {
    id: 'SEC-VALIDATION-001',
    claim: 'Input validation exists',
    check: (content) => /zod|joi|yup|validate|sanitize/i.test(content),
    evidenceType: 'CODE',
  },
];

export function auditSecurity(rootDir, fileList) {
  const findings = [];
  let fileContents = new Map();
  for (const f of fileList.slice(0, 50)) {
    try {
      const full = path.join(rootDir, f.path || f);
      if (fs.existsSync(full) && fs.statSync(full).size < 200000) {
        fileContents.set(f.path || f, fs.readFileSync(full, 'utf8'));
      }
    } catch {}
  }
  const allContent = [...fileContents.values()].join('\n');

  for (const check of SECURITY_CHECKS) {
    let passed = false;
    let evidence = [];
    let status = VERIFICATION_STATES.UNKNOWN;
    try {
      if (check.id === 'SEC-SECRETS-001') {
        // check each file — exclude test fixtures and docs that intentionally show patterns
        let leakFile = null;
        for (const [fp, content] of fileContents.entries()) {
          if (fp.startsWith('tests/') || fp.startsWith('examples/')) continue;
          if (!check.check(content, fp)) { leakFile = fp; break; }
        }
        if (leakFile) {
          passed = false;
          evidence = [{ type: 'CODE', source: leakFile, kind: 'FACT', details: 'Potential secret pattern detected' }];
          status = VERIFICATION_STATES.FAILED;
        } else {
          passed = true;
          evidence = [{ type: 'CODE', source: 'scan', kind: 'FACT', details: 'No secret patterns detected in sampled files' }];
          status = VERIFICATION_STATES.VERIFIED;
        }
      } else {
        passed = check.check(allContent);
        if (passed) {
          evidence = [{ type: 'CODE', source: 'static scan', kind: 'FACT', details: `Pattern matched for ${check.claim}` }];
          status = VERIFICATION_STATES.IMPLEMENTED; // needs test to be VERIFIED
        } else {
          evidence = [];
          status = VERIFICATION_STATES.UNKNOWN;
        }
      }
    } catch {}

    findings.push({
      id: check.id,
      claim: check.claim,
      status,
      evidence,
      verified: status === VERIFICATION_STATES.VERIFIED,
      note: status === VERIFICATION_STATES.UNKNOWN ? 'Unknown; verification evidence does not exist.' : undefined,
    });
  }

  // Dependency vulnerabilities — try npm audit
  {
    let depsStatus = VERIFICATION_STATES.UNKNOWN;
    let depsEvidence = [];
    let depsNote = 'Run `npm audit` or platform audit to verify. Unknown until audit evidence exists.';
    try {
      const auditOut = execSync('npm audit --json 2>&1', { cwd: rootDir, encoding: 'utf8', timeout: 8000 });
      // npm audit may output non-JSON prefix; find JSON
      const jsonStart = auditOut.indexOf('{');
      const audit = JSON.parse(jsonStart >= 0 ? auditOut.slice(jsonStart) : auditOut);
      const vuln = audit.metadata?.vulnerabilities?.total ?? 0;
      if (vuln === 0) {
        depsStatus = VERIFICATION_STATES.VERIFIED;
        depsEvidence = [{ type: 'COMMAND', source: 'npm audit', kind: 'FACT', details: '0 vulnerabilities' }];
        depsNote = undefined;
      } else {
        depsStatus = VERIFICATION_STATES.FAILED;
        depsEvidence = [{ type: 'COMMAND', source: 'npm audit', kind: 'FACT', details: `${vuln} vulnerabilities` }];
        depsNote = `${vuln} vulnerabilities found`;
      }
    } catch (e) {
      // keep UNKNOWN
    }
    findings.push({
      id: 'SEC-DEPS-001',
      claim: 'Dependencies have no known vulnerabilities',
      status: depsStatus,
      evidence: depsEvidence,
      note: depsNote,
      verified: depsStatus === VERIFICATION_STATES.VERIFIED,
    });
  }

  return {
    findings,
    summary: {
      total: findings.length,
      verified: findings.filter(f => f.status === VERIFICATION_STATES.VERIFIED).length,
      failed: findings.filter(f => f.status === VERIFICATION_STATES.FAILED).length,
      unknown: findings.filter(f => f.status === VERIFICATION_STATES.UNKNOWN).length,
    },
    auditedAt: new Date().toISOString(),
  };
}

export function checkInvariant(contract, change) {
  // contracts: { invariant: string, check: fn? }
  // For MVP, simple string matching
  const violations = [];
  if (/secret/i.test(contract.invariant) && /secret|key|token/i.test(change)) {
    violations.push({ contract: contract.id, message: `Change may violate: ${contract.invariant}` });
  }
  return violations;
}
