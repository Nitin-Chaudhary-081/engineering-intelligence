import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store } from '../src/lib/store.js';
import { verifyAll, detectConflicts } from '../src/lib/verify.js';

describe('verify', () => {
  it('flags missing files as CONFLICTING', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-verify-'));
    try {
      const store = new Store(dir);
      store.ensureBaseStructure();
      store.initManifest({ projectName: 'x', projectType: 'test' });
      store.setRequirement('R-001', { id: 'R-001', title: 'Foo', status: 'VERIFIED', evidence: [{type:'CODE', source:'missing.js', kind:'FACT'}], files: ['missing.js'] });
      const { results } = verifyAll(store, {}, null);
      const r = results.find(x => x.id === 'R-001');
      assert.equal(r.status, 'CONFLICTING');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('UNKNOWN when no evidence', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-verify2-'));
    try {
      const store = new Store(dir);
      store.ensureBaseStructure();
      store.initManifest({ projectName: 'x', projectType: 'test' });
      store.setRequirement('R-002', { id: 'R-002', title: 'Bar', status: 'UNKNOWN', evidence: [], files: [] });
      const { results } = verifyAll(store, {}, null);
      const r = results.find(x=>x.id==='R-002');
      assert.equal(r.status, 'UNKNOWN');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('detectConflicts project type mismatch', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-verify3-'));
    try {
      const store = new Store(dir);
      store.ensureBaseStructure();
      store.initManifest({ projectName: 'x', projectType: 'test' });
      store.setProject({ projectType: 'python' });
      const c = detectConflicts(store);
      assert.ok(c.some(x=>x.type==='project_type_mismatch'));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
