import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store } from '../src/lib/store.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eng-test-'));
}

describe('Store', () => {
  let dir, store;
  beforeEach(() => { dir = tmpDir(); store = new Store(dir); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('init manifest and isInitialized', () => {
    assert.equal(store.isInitialized(), false);
    const m = store.initManifest({ projectName: 'test-proj', projectType: 'node', description: 'desc' });
    assert.equal(m.projectName, 'test-proj');
    assert.equal(store.isInitialized(), true);
    const re = store.getManifest();
    assert.equal(re.manifestVersion || re.schemaVersion, m.schemaVersion);
  });

  it('write/read yaml requirement', () => {
    store.ensureBaseStructure();
    store.setRequirement('R-001', { id: 'R-001', title: 'Foo', status: 'UNKNOWN' });
    const r = store.getRequirement('R-001');
    assert.equal(r.title, 'Foo');
    assert.equal(store.listRequirements().length, 1);
  });

  it('events append/read', () => {
    store.ensureBaseStructure();
    store.appendEvent({ type: 'user_request', summary: 'hello' });
    store.appendEvent({ type: 'decision', summary: 'decided' });
    const ev = store.getEvents(10);
    assert.equal(ev.length, 2);
    assert.equal(ev[0].type, 'user_request');
  });

  it('evidence UNKNOWN when no evidence', async () => {
    const { assessClaim } = await import('../src/lib/evidence.js');
    const res = assessClaim({ claim: 'X', evidence: [] });
    assert.equal(res.status, 'UNKNOWN');
  });

  it('hashFile', () => {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'hello');
    const h = store.hashFile('a.txt');
    assert.ok(h && h.length === 16);
    assert.equal(store.hashFile('missing.txt'), null);
  });
});
