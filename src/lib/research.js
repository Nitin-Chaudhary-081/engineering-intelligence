/**
 * Research workflow — records sources, distinguishes FACT/INFERENCE etc.
 * @module research
 */
import { EVIDENCE_KIND } from './constants.js';

export function createResearch({ topic, question, sources = [], findings = [], confidence = 'UNKNOWN', kind = EVIDENCE_KIND.FACT }) {
  return {
    id: `RES-${Date.now().toString().slice(-6)}`,
    topic,
    question,
    sources: sources.map(s => ({ url: s.url, title: s.title, accessedAt: new Date().toISOString(), kind: s.kind || EVIDENCE_KIND.FACT })),
    findings,
    confidence,
    kind,
    createdAt: new Date().toISOString(),
  };
}

export function confidenceForResearch(sources) {
  if (sources.length === 0) return 'UNVERIFIED';
  const hasOfficial = sources.some(s => s.url?.includes('official') || s.url?.includes('docs.'));
  if (hasOfficial && sources.length >= 3) return 'high';
  if (sources.length >= 2) return 'medium';
  return 'low';
}
