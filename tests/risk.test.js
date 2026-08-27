import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChange, requiresResearch } from '../src/lib/risk.js';

describe('risk', () => {
  it('trivial rename', () => {
    const r = classifyChange({ files: ['src/utils.js'], isRenameOnly: true });
    assert.equal(r.level, 'TRIVIAL');
  });
  it('critical payment', () => {
    const r = classifyChange({ files: ['src/payments/stripe.js'] });
    assert.equal(r.level, 'CRITICAL');
  });
  it('high auth', () => {
    const r = classifyChange({ files: ['src/auth/service.ts'], touchesAuth: true });
    assert.equal(r.level, 'HIGH');
  });
  it('medium new dep', () => {
    const r = classifyChange({ files: ['src/foo.js'], addsDependency: true });
    assert.equal(r.level, 'MEDIUM');
  });
  it('requiresResearch for medium+', () => {
    assert.equal(requiresResearch('MEDIUM'), true);
    assert.equal(requiresResearch('LOW'), false);
    assert.equal(requiresResearch('TRIVIAL'), false);
  });
});
