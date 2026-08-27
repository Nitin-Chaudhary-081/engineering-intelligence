/**
 * Risk Classification
 * @module risk
 */
import { RISK_LEVELS } from './constants.js';

const HIGH_RISK_PATTERNS = [
  /auth/i, /payment/i, /security/i, /crypto/i, /secret/i, /database/i, /migration/i,
  /infra/i, /deploy/i, /permission/i, /acl/i, /rbac/i, /oauth/i, /jwt/i,
];

const MEDIUM_RISK_PATTERNS = [
  /api/i, /dependency/i, /external/i, /queue/i, /cache/i, /config/i, /env/i,
];

export function classifyChange({ files = [], description = '', addsDependency = false, touchesAuth = false, touchesPayment = false, touchesDB = false, isRenameOnly = false }) {
  if (isRenameOnly && files.length <= 2) return { level: RISK_LEVELS.TRIVIAL, reason: 'Rename variable/file — isolated, trivial' };
  if (touchesPayment || touchesDB && files.some(f => /migration/i.test(f))) return { level: RISK_LEVELS.CRITICAL, reason: 'Payment or DB migration — critical risk' };
  if (touchesAuth) return { level: RISK_LEVELS.HIGH, reason: 'Authentication change — high risk' };
  if (addsDependency) return { level: RISK_LEVELS.MEDIUM, reason: 'New external dependency — medium risk' };
  if (files.length === 0 && description) {
    const d = description.toLowerCase();
    if (/auth|payment|security|migration|infrastructure/.test(d)) return { level: RISK_LEVELS.CRITICAL, reason: 'Description indicates critical area' };
  }
  const highHits = files.filter(f => HIGH_RISK_PATTERNS.some(r => r.test(f)));
  if (highHits.length > 0) {
    if (highHits.some(f => /payment|migration/i.test(f))) return { level: RISK_LEVELS.CRITICAL, reason: `Critical file touched: ${highHits[0]}` };
    return { level: RISK_LEVELS.HIGH, reason: `High-risk file touched: ${highHits[0]}` };
  }
  const medHits = files.filter(f => MEDIUM_RISK_PATTERNS.some(r => r.test(f)));
  if (medHits.length > 0) return { level: RISK_LEVELS.MEDIUM, reason: `Medium-risk area: ${medHits[0]}` };
  if (files.length <= 3) return { level: RISK_LEVELS.LOW, reason: 'Small isolated change — low risk' };
  return { level: RISK_LEVELS.LOW, reason: 'Default low risk for isolated utility change' };
}

export function requiresResearch(riskLevel) {
  return [RISK_LEVELS.MEDIUM, RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL].includes(riskLevel);
}

export function researchChecklist(riskLevel) {
  if (riskLevel === RISK_LEVELS.CRITICAL) return ['official docs', 'standards', 'security guidance', 'architecture patterns', 'compatibility', 'failure modes', 'alternatives'];
  if (riskLevel === RISK_LEVELS.HIGH) return ['official docs', 'security guidance', 'architecture patterns', 'compatibility'];
  if (riskLevel === RISK_LEVELS.MEDIUM) return ['library docs', 'compatibility', 'best practices'];
  return [];
}
