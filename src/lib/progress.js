/**
 * Engineering Completeness — multi-dimensional scoring
 * @module progress
 */
import { ENGINEERING_DIMENSIONS } from './constants.js';

const WEIGHTS = {
  requirements: 1.0,
  research: 0.8,
  architecture: 1.0,
  implementation: 1.2,
  integration: 0.9,
  testing: 1.0,
  security: 1.1,
  runtime_verification: 1.0,
  documentation: 0.6,
  observability: 0.7,
  deployment: 0.7,
  performance: 0.5,
};

export function scoreDimension(value, evidence) {
  // value 0-100, but adjust if evidence is weak
  if (!evidence || evidence.length === 0) return Math.min(value, 20); // cannot claim high without evidence
  return value;
}

export function computeCompleteness(scores) {
  // scores: { dimension: { value: 0-100, evidence: [] } }
  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown = {};
  for (const dim of ENGINEERING_DIMENSIONS) {
    const entry = scores[dim] || { value: 0, evidence: [] };
    const val = scoreDimension(entry.value, entry.evidence);
    const w = WEIGHTS[dim] || 1;
    breakdown[dim] = { value: val, weight: w, evidenceCount: entry.evidence?.length || 0, status: statusForScore(val) };
    totalWeight += w;
    weightedSum += val * w;
  }
  const engineeringCompleteness = totalWeight ? Math.round(weightedSum / totalWeight) : 0;

  // Production readiness weights security, testing, runtime more
  const prodWeights = { implementation: 1, testing: 1.2, security: 1.5, runtime_verification: 1.3, observability: 1, deployment: 1 };
  let prodSum = 0, prodWeight = 0;
  for (const [k, w] of Object.entries(prodWeights)) {
    const v = breakdown[k]?.value || 0;
    prodSum += v * w;
    prodWeight += w;
  }
  const productionReadiness = prodWeight ? Math.round(prodSum / prodWeight) : 0;

  return {
    breakdown,
    engineeringCompleteness,
    productionReadiness,
    explanation: explainScores(breakdown, engineeringCompleteness, productionReadiness),
  };
}

function statusForScore(v) {
  if (v >= 90) return 'excellent';
  if (v >= 70) return 'good';
  if (v >= 50) return 'partial';
  if (v >= 20) return 'poor';
  return 'missing';
}

function explainScores(breakdown, eng, prod) {
  const low = Object.entries(breakdown).filter(([, v]) => v.value < 50).map(([k, v]) => `${k} ${v.value}% (${v.evidenceCount} evidence)`).join(', ');
  const high = Object.entries(breakdown).filter(([, v]) => v.value >= 80).map(([k]) => k).join(', ');
  let txt = `Engineering completeness ${eng}% (weighted avg across ${ENGINEERING_DIMENSIONS.length} dims). Production readiness ${prod}%.`;
  if (low) txt += ` Weak areas: ${low}.`;
  if (high) txt += ` Strong areas: ${high}.`;
  txt += ` Scores capped when evidence missing to avoid fake precision.`;
  return txt;
}

export function progressFromState(state) {
  // state is aggregated from .engineering files
  // This is a lightweight heuristic — real scoring needs evidence
  const scores = {};
  for (const dim of ENGINEERING_DIMENSIONS) {
    const hasData = state[dim] !== undefined;
    scores[dim] = {
      value: hasData ? (state[dim].value ?? 0) : 0,
      evidence: state[dim]?.evidence || [],
    };
  }
  return computeCompleteness(scores);
}
