/**
 * Architecture Graph — builds dependency graph from repo evidence
 * Uses static analysis (regex) + evidence levels, supports impact analysis
 * @module graph
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IMPORT_REGEX = {
  js: /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|import\(['"]([^'"]+)['"]\))/g,
  py: /(?:from\s+(\S+)\s+import|import\s+([a-zA-Z0-9_\.]+))/g,
  go: /import\s+(?:\(\s*([^\)]+)\s*\)|"([^"]+)")/g,
};

// Evidence states importance
export function buildFileIndex(rootDir, limit = 2000) {
  const files = [];
  const ignoreDirs = new Set(['node_modules', '.git', '.engineering', 'dist', 'build', '.next', 'vendor', '__pycache__', '.venv', 'coverage', '.opencode']);
  let count = 0;
  function walk(dir) {
    if (count > limit) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (count > limit) break;
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(path.join(dir, entry.name));
      } else {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootDir, full);
        const ext = path.extname(entry.name);
        if (['.js','.ts','.mjs','.cjs','.jsx','.tsx','.py','.go','.rs','.java','.rb','.php','.json','.yaml','.yml','.md'].includes(ext)) {
          try {
            const stat = fs.statSync(full);
            if (stat.size > 500_000) continue; // skip large
            const hash = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0, 12);
            files.push({ path: rel, ext, size: stat.size, hash, language: ext.replace('.','') });
            count++;
          } catch {}
        }
      }
    }
  }
  try { walk(rootDir); } catch {}
  return files;
}

export function extractImports(filePath, content) {
  const ext = path.extname(filePath);
  const deps = [];
  if (['.js','.mjs','.cjs','.ts','.tsx','.jsx'].includes(ext)) {
    let m;
    const re = new RegExp(IMPORT_REGEX.js.source, 'g');
    while ((m = re.exec(content)) !== null) {
      const imp = m[1] || m[2] || m[3];
      if (imp) deps.push({ raw: imp, type: imp.startsWith('.') ? 'local' : 'external' });
    }
  } else if (ext === '.py') {
    let m;
    const re = new RegExp(IMPORT_REGEX.py.source, 'g');
    while ((m = re.exec(content)) !== null) {
      const imp = m[1] || m[2];
      if (imp) deps.push({ raw: imp, type: imp.includes('.') && !imp.startsWith('.') ? 'external' : 'local' });
    }
  }
  return deps;
}

export function buildGraph(rootDir) {
  const files = buildFileIndex(rootDir);
  const nodes = files.map(f => ({
    id: f.path,
    type: 'File',
    label: path.basename(f.path),
    ...f,
    evidence: 'CODE',
    verification: 'VERIFIED',
  }));

  const edges = [];
  for (const f of files) {
    const full = path.join(rootDir, f.path);
    try {
      const content = fs.readFileSync(full, 'utf8');
      const imports = extractImports(f.path, content);
      for (const imp of imports) {
        // resolve local imports naively
        let target = imp.raw;
        if (imp.type === 'local') {
          // normalize relative
          const base = path.dirname(f.path);
          let resolved = path.normalize(path.join(base, target));
          // try to find file with extension
          const candidates = [resolved, resolved + '.js', resolved + '.ts', path.join(resolved, 'index.js'), path.join(resolved, 'index.ts')];
          let found = candidates.find(c => files.some(fl => fl.path === c));
          target = found || resolved;
        }
        edges.push({
          from: f.path,
          to: target,
          relationship: imp.type === 'local' ? 'imports' : 'depends_on',
          evidence: imp.type === 'local' ? 'INFERRED' : 'INFERRED',
        });
      }
    } catch {}
  }

  // Deduplicate edges
  const seen = new Set();
  const deduped = [];
  for (const e of edges) {
    const key = `${e.from}->${e.to}:${e.relationship}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(e); }
  }

  return { nodes, edges, builtAt: new Date().toISOString() };
}

export function impactAnalysis(graph, target) {
  // BFS forward and backward
  const forward = new Set([target]);
  const backward = new Set([target]);
  let changed = true;

  // forward: what depends on target (reverse edges)
  // Actually edges from -> to means from depends on to, so forward impact = find all that depend on target
  const reverseMap = new Map(); // to -> [from]
  const forwardMap = new Map(); // from -> [to]
  for (const e of graph.edges) {
    if (!forwardMap.has(e.from)) forwardMap.set(e.from, []);
    forwardMap.get(e.from).push(e.to);
    if (!reverseMap.has(e.to)) reverseMap.set(e.to, []);
    reverseMap.get(e.to).push(e.from);
  }

  // BFS: dependents
  let queue = [target];
  while (queue.length) {
    const cur = queue.shift();
    const dependents = reverseMap.get(cur) || [];
    for (const dep of dependents) {
      if (!forward.has(dep)) { forward.add(dep); queue.push(dep); }
    }
  }

  // BFS: dependencies (what target depends on)
  queue = [target];
  while (queue.length) {
    const cur = queue.shift();
    const deps = forwardMap.get(cur) || [];
    for (const dep of deps) {
      if (!backward.has(dep)) { backward.add(dep); queue.push(dep); }
    }
  }

  // Find affected components: if nodes have component metadata, but fallback to files
  return {
    target,
    directDependents: reverseMap.get(target) || [],
    transitiveDependents: [...forward].filter(x => x !== target),
    directDependencies: forwardMap.get(target) || [],
    transitiveDependencies: [...backward].filter(x => x !== target),
    totalAffected: forward.size - 1,
    evidence: 'INFERRED',
    note: 'Static import analysis; runtime dependencies may differ. Marked INFERRED until verified.',
  };
}

export function detectCycles(graph) {
  // Simple DFS cycle detection
  const adj = new Map();
  for (const e of graph.edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (e.relationship === 'imports' || e.relationship === 'depends_on') adj.get(e.from).push(e.to);
  }
  const visited = new Set();
  const stack = new Set();
  const cycles = [];
  function dfs(node, path) {
    if (stack.has(node)) {
      const idx = path.indexOf(node);
      cycles.push(path.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    for (const neigh of adj.get(node) || []) {
      dfs(neigh, path.concat(neigh));
    }
    stack.delete(node);
  }
  for (const n of graph.nodes) dfs(n.id, [n.id]);
  return cycles;
}
