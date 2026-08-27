import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCompleteness } from '../src/lib/progress.js';

describe('progress', () => {
  it('computes weighted completeness', () => {
    const res = computeCompleteness({
      requirements: { value: 100, evidence: [{type:'CODE'}] },
      research: { value: 100, evidence: [{type:'RESEARCH'}] },
      architecture: { value: 100, evidence: [{type:'CODE'}] },
      implementation: { value: 100, evidence: [{type:'CODE'}] },
      integration: { value: 100, evidence: [{type:'CODE'}] },
      testing: { value: 100, evidence: [{type:'TEST'}] },
      security: { value: 100, evidence: [{type:'TEST'}] },
      runtime_verification: { value: 100, evidence: [{type:'RUNTIME'}] },
      documentation: { value: 100, evidence: [{type:'DOCUMENTATION'}] },
      observability: { value: 100, evidence: [{type:'CODE'}] },
      deployment: { value: 100, evidence: [{type:'CODE'}] },
      performance: { value: 100, evidence: [{type:'CODE'}] },
    });
    assert.equal(res.engineeringCompleteness, 100);
    assert.equal(res.productionReadiness, 100);
  });

  it('caps without evidence', () => {
    const res = computeCompleteness({
      requirements: { value: 100, evidence: [] }, // no evidence → capped to 20
    });
    assert.ok(res.breakdown.requirements.value < 100);
    assert.match(res.explanation, /evidence/);
  });

  it('low dims handled', () => {
    const res = computeCompleteness({
      requirements: { value: 0, evidence: [] },
      testing: { value: 0, evidence: [] },
    });
    assert.ok(res.engineeringCompleteness < 30);
  });
});
