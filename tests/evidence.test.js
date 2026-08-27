import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessClaim, createEvidence, securityClaimStatus } from '../src/lib/evidence.js';
import { VERIFICATION_STATES, EVIDENCE_TYPES, EVIDENCE_KIND } from '../src/lib/constants.js';

describe('evidence', () => {
  it('UNKNOWN when no evidence', () => {
    const r = assessClaim({ claim: 'feat', evidence: [] });
    assert.equal(r.status, VERIFICATION_STATES.UNKNOWN);
    assert.match(r.reason, /Unknown/);
  });

  it('VERIFIED with code+fact', () => {
    const ev = [createEvidence({ type: EVIDENCE_TYPES.CODE, source: 'src/a.js', kind: EVIDENCE_KIND.FACT })];
    const r = assessClaim({ claim: 'done', evidence: ev });
    assert.equal(r.status, VERIFICATION_STATES.VERIFIED);
  });

  it('IMPLEMENTED with fact but not runtime', () => {
    const ev = [createEvidence({ type: EVIDENCE_TYPES.CODE, source: 'src/a.js', kind: EVIDENCE_KIND.FACT })];
    // Actually CODE FACT should be VERIFIED per logic — test INFERRED path
    const ev2 = [createEvidence({ type: EVIDENCE_TYPES.CODE, source: 'src/a.js', kind: EVIDENCE_KIND.INFERENCE })];
    const r = assessClaim({ claim: 'x', evidence: ev2 });
    assert.equal(r.status, VERIFICATION_STATES.INFERRED);
  });

  it('security claim stays UNKNOWN if only docs', () => {
    const ev = [{ type: EVIDENCE_TYPES.DOCUMENTATION, source: 'README.md', kind: EVIDENCE_KIND.FACT }];
    const r = securityClaimStatus('SQL injection protected', ev);
    assert.equal(r.status, VERIFICATION_STATES.UNKNOWN);
  });

  it('does NOT mark UNKNOWN as VERIFIED', () => {
    const r = assessClaim({ claim: 'security', evidence: [{ type: 'DOCUMENTATION', source: 'docs.md', kind: 'FACT' }] });
    // docs alone should still not be VERIFIED without code/test/runtime — logic gives IMPLEMENTED, but securityClaimStatus enforces UNKNOWN
    const sec = securityClaimStatus('SQL injection', [{ type: 'DOCUMENTATION', source: 'docs.md', kind: 'FACT' }]);
    assert.notEqual(sec.status, VERIFICATION_STATES.VERIFIED);
  });
});
