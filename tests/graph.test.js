import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildGraph, impactAnalysis, detectCycles, extractImports } from '../src/lib/graph.js';

describe('graph', () => {
  it('extractImports js', () => {
    const imps = extractImports('a.js', `import foo from './bar'; const x = require('lodash'); import('dynamic')`);
    assert.ok(imps.some(i => i.raw === './bar'));
    assert.ok(imps.some(i => i.raw === 'lodash'));
  });

  it('buildGraph and impact', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-graph-'));
    try {
      fs.writeFileSync(path.join(dir, 'a.js'), `import b from './b.js';`);
      fs.writeFileSync(path.join(dir, 'b.js'), `import c from './c.js';`);
      fs.writeFileSync(path.join(dir, 'c.js'), `export default {};`);
      const g = buildGraph(dir);
      assert.equal(g.nodes.length, 3);
      assert.ok(g.edges.some(e => e.from === 'a.js' && e.to === 'b.js'));
      const impact = impactAnalysis(g, 'c.js');
      assert.ok(impact.transitiveDependents.includes('a.js'));
      assert.ok(impact.transitiveDependents.includes('b.js'));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('detect cycles', () => {
    const g = { nodes: [{id:'a'},{id:'b'}], edges: [{from:'a', to:'b', relationship:'imports'}, {from:'b', to:'a', relationship:'imports'}] };
    const cycles = detectCycles(g);
    assert.ok(cycles.length > 0);
  });

  it('no false cycles', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-graph2-'));
    try {
      fs.writeFileSync(path.join(dir, 'x.js'), `import y from './y.js';`);
      fs.writeFileSync(path.join(dir, 'y.js'), `export default {};`);
      const g = buildGraph(dir);
      const cycles = detectCycles(g);
      assert.equal(cycles.length, 0);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
