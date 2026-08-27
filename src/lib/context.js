/**
 * Hierarchical Context System
 * Levels 0-6: 30s summary -> full source
 * @module context
 */

export const CONTEXT_LEVELS = {
  0: { name: '30-second summary', tokens: 300, description: 'One paragraph: what project does' },
  1: { name: 'Architecture', tokens: 1000, description: 'High-level architecture, decisions, data flow' },
  2: { name: 'Subsystem summaries', tokens: 2000, description: 'Per-subsystem purpose + interfaces' },
  3: { name: 'Component summaries', tokens: 4000, description: 'Per-component API + dependencies' },
  4: { name: 'File summaries', tokens: 8000, description: 'Per-file purpose + exports' },
  5: { name: 'Function/class details', tokens: 16000, description: 'Signatures, invariants' },
  6: { name: 'Full source', tokens: 100000, description: 'Actual code' },
};

export function buildContext(store, projectInfo, graph, handoff) {
  const manifest = store.getManifest();
  return {
    level0: `Project ${manifest?.projectName || 'unknown'} — ${manifest?.description || projectInfo?.projectType || 'unknown type'}. Primary language ${projectInfo?.languages?.primary || 'unknown'}. ${graph?.nodes?.length || 0} files, ${graph?.edges?.length || 0} dependencies.`,
    level1: {
      architecture: store.getArchitecture() || 'Not yet modeled — run engineering architecture',
      dataflow: store.getDataflow() || 'Not yet modeled',
      decisions: store.listDecisions().slice(-5),
      graphSummary: { nodes: graph?.nodes?.length, edges: graph?.edges?.length },
    },
    level2: {
      subsystems: (store.listComponents().map(c=>c.data) || []).filter(c=>c.type==='subsystem'),
      structure: projectInfo?.structure,
    },
    level3: {
      components: store.listComponents().map(c=>c.data),
    },
    level4: {
      files: (graph?.nodes || []).slice(0, 20).map(n=>({ path: n.path, size: n.size, hash: n.hash })),
      note: `Showing 20/${graph?.nodes?.length || 0} files. Full list in architecture/graph.yaml`,
    },
    level5: 'Use `engineering explain --file <path>` for function/class details (requires AST parsing — INFERRED until implemented)',
    level6: 'Actual source code lives in repository. Context system avoids loading all files; request specific file via read.',
    generatedAt: new Date().toISOString(),
  };
}

export function getContextForLevel(ctx, level) {
  const result = {};
  for (let i = 0; i <= level; i++) result[`level${i}`] = ctx[`level${i}`];
  return result;
}
