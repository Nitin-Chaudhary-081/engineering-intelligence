import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store } from '../src/lib/store.js';
import { generateHandoff, handoffToMarkdown } from '../src/lib/handoff.js';

describe('handoff', () => {
  it('generates handoff with required fields', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-handoff-'));
    try {
      const store = new Store(dir);
      store.ensureBaseStructure();
      store.initManifest({ projectName: 'demo', projectType: 'node' });
      store.setProject({ projectType: 'node', languages: { primary: 'javascript' }, frameworks: [] });
      store.setArchitecture({ nodes: [], edges: [] });
      const h = generateHandoff(store, { projectType: 'node' }, { nodes: [], edges: [] }, null, null, []);
      assert.ok(h.project.name === 'demo');
      assert.ok(h.nextRecommendedActions.length > 0);
      const md = handoffToMarkdown(h);
      assert.match(md, /Handoff/);
      assert.match(md, /Next Recommended Actions/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
