/**
 * Engineering Intelligence - Core constants
 * @module constants
 */

// Evidence-backed states - documentation is NOT source of truth
export const VERIFICATION_STATES = Object.freeze({
  VERIFIED: 'VERIFIED',               // evidence + passing verification
  IMPLEMENTED: 'IMPLEMENTED',         // code exists, not yet verified
  PARTIALLY_IMPLEMENTED: 'PARTIALLY_IMPLEMENTED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN',                 // legitimate state, prefer over hallucination
  ASSUMED: 'ASSUMED',
  INFERRED: 'INFERRED',
  STALE: 'STALE',
  CONFLICTING: 'CONFLICTING',
});

export const RISK_LEVELS = Object.freeze({
  TRIVIAL: 'TRIVIAL',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

export const EVIDENCE_TYPES = Object.freeze({
  CODE: 'CODE',
  TEST: 'TEST',
  RUNTIME: 'RUNTIME',
  GIT: 'GIT',
  COMMAND: 'COMMAND',
  RESEARCH: 'RESEARCH',
  INFERENCE: 'INFERENCE',
  DOCUMENTATION: 'DOCUMENTATION',
});

export const EVIDENCE_KIND = Object.freeze({
  FACT: 'FACT',
  INFERENCE: 'INFERENCE',
  ASSUMPTION: 'ASSUMPTION',
  OPINION: 'OPINION',
  UNVERIFIED: 'UNVERIFIED',
});

export const RELATIONSHIPS = Object.freeze([
  'depends_on',
  'implements',
  'calls',
  'imports',
  'reads',
  'writes',
  'produces',
  'consumes',
  'tested_by',
  'protected_by',
  'configured_by',
  'deployed_by',
  'derived_from',
  'affects',
  'contradicts',
  'replaces',
]);

export const EVENT_TYPES = Object.freeze({
  USER_REQUEST: 'user_request',
  RESEARCH: 'research',
  DECISION: 'decision',
  FILE_CREATED: 'file_created',
  FILE_MODIFIED: 'file_modified',
  FILE_DELETED: 'file_deleted',
  DEPENDENCY_ADDED: 'dependency_added',
  DEPENDENCY_REMOVED: 'dependency_removed',
  COMMAND_EXECUTED: 'command_executed',
  TEST_EXECUTED: 'test_executed',
  TEST_FAILED: 'test_failed',
  TEST_PASSED: 'test_passed',
  RUNTIME_FAILURE: 'runtime_failure',
  BUG_DISCOVERED: 'bug_discovered',
  BUG_FIXED: 'bug_fixed',
  ARCHITECTURE_CHANGED: 'architecture_changed',
  SECURITY_FINDING: 'security_finding',
  VERIFICATION: 'verification',
});

export const COMPLEXITY_SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  BLOCK: 'BLOCK',
});

export const ENGINEERING_DIMENSIONS = Object.freeze([
  'requirements',
  'research',
  'architecture',
  'implementation',
  'integration',
  'testing',
  'security',
  'runtime_verification',
  'documentation',
  'observability',
  'deployment',
  'performance',
]);

export const MANIFEST_VERSION = '1.0.0';
export const ENGINEERING_DIR = '.engineering';
