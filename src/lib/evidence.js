/**
 * Evidence Model — distinguishes actual state from documentation claims
 * @module evidence
 */
import { VERIFICATION_STATES, EVIDENCE_TYPES, EVIDENCE_KIND } from './constants.js';

export function createEvidence({ type, source, kind = EVIDENCE_KIND.FACT, timestamp, verifiedBy, details }) {
  return {
    type, // CODE, TEST, RUNTIME, GIT, COMMAND, etc.
    source, // file path, command, test name
    kind, // FACT, INFERENCE, ASSUMPTION, etc.
    timestamp: timestamp || new Date().toISOString(),
    verifiedBy: verifiedBy || null,
    details: details || null,
  };
}

export function assessClaim({ claim, evidence }) {
  if (!evidence || evidence.length === 0) {
    return {
      claim,
      status: VERIFICATION_STATES.UNKNOWN,
      reason: 'No evidence provided; documentation is not truth. Unknown; verification evidence does not exist.',
      evidence: [],
    };
  }
  const hasVerified = evidence.some(e => e.kind === EVIDENCE_KIND.FACT && [EVIDENCE_TYPES.CODE, EVIDENCE_TYPES.TEST, EVIDENCE_TYPES.RUNTIME].includes(e.type));
  const hasFact = evidence.some(e => e.kind === EVIDENCE_KIND.FACT);
  const hasOnlyInference = evidence.every(e => e.kind === EVIDENCE_KIND.INFERENCE || e.kind === EVIDENCE_KIND.ASSUMPTION);
  const hasUnverified = evidence.some(e => e.kind === EVIDENCE_KIND.UNVERIFIED);

  if (hasVerified) {
    return { claim, status: VERIFICATION_STATES.VERIFIED, reason: 'Backed by factual code/test/runtime evidence', evidence };
  }
  if (hasFact) {
    return { claim, status: VERIFICATION_STATES.IMPLEMENTED, reason: 'Factual evidence exists but not runtime verified', evidence };
  }
  if (hasUnverified) {
    return { claim, status: VERIFICATION_STATES.UNKNOWN, reason: 'Evidence is unverified', evidence };
  }
  if (hasOnlyInference) {
    return { claim, status: VERIFICATION_STATES.INFERRED, reason: 'Only inferred/assumed evidence', evidence };
  }
  return { claim, status: VERIFICATION_STATES.UNKNOWN, reason: 'Insufficient evidence', evidence };
}

export function verifyFileClaim(fileExists, testPasses, runtimeWorks) {
  if (runtimeWorks) return VERIFICATION_STATES.VERIFIED;
  if (testPasses) return VERIFICATION_STATES.IMPLEMENTED;
  if (fileExists) return VERIFICATION_STATES.IMPLEMENTED;
  return VERIFICATION_STATES.NOT_IMPLEMENTED;
}

// Quick helper to check security claim
export function securityClaimStatus(claim, evidence) {
  const result = assessClaim({ claim, evidence });
  if (result.status === VERIFICATION_STATES.VERIFIED) return result;
  // Do not mark security as implemented based on docs alone
  if (evidence.some(e => e.type === EVIDENCE_TYPES.DOCUMENTATION && evidence.length === 1)) {
    return { ...result, status: VERIFICATION_STATES.UNKNOWN, reason: 'Security claim based solely on documentation — UNKNOWN until verified by code/test' };
  }
  return result;
}
