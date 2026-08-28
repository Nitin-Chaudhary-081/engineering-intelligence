/**
 * Lifecycle Scanner — detects existing lifecycle/state/memory systems per b.md
 * Core behavior 1 & 6: scan repo for lifecycle, memory, handoff, architecture,
 * project-state, engineering-state files; report conflicts.
 * @module lifecycle-scanner
 */
import fs from 'node:fs';
import path from 'node:path';

export const LIFECYCLE_PATTERNS = [
  // Engineering Intelligence (primary)
  { id: 'engineering-state', type: 'engineering-state', path: '.engineering/manifest.yaml', description: 'Engineering Intelligence state (.engineering/)', priority: 1 },
  { id: 'engineering-lifecycle', type: 'lifecycle', path: '.engineering/lifecycle.yaml', description: 'Engineering lifecycle file', priority: 1 },
  { id: 'engineering-handoff', type: 'handoff', path: '.engineering/handoff.yaml', description: 'Engineering handoff', priority: 1 },
  { id: 'engineering-graph', type: 'architecture', path: '.engineering/architecture/graph.yaml', description: 'Architecture graph', priority: 1 },
  // Generic lifecycle / project-state
  { id: 'lifecycle-yaml', type: 'lifecycle', path: 'lifecycle.yaml', description: 'Generic lifecycle.yaml', priority: 2 },
  { id: 'lifecycle-yml', type: 'lifecycle', path: 'lifecycle.yml', description: 'Generic lifecycle.yml', priority: 2 },
  { id: 'lifecycle-md', type: 'lifecycle', path: 'lifecycle.md', description: 'Generic lifecycle.md', priority: 2 },
  { id: 'project-state', type: 'project-state', path: 'project-state.yaml', description: 'project-state.yaml', priority: 2 },
  { id: 'project-state-json', type: 'project-state', path: 'project-state.json', description: 'project-state.json', priority: 2 },
  { id: 'state-yaml', type: 'project-state', path: 'state.yaml', description: 'state.yaml', priority: 3 },
  { id: 'state-yml', type: 'project-state', path: 'state.yml', description: 'state.yml', priority: 3 },
  // Memory
  { id: 'memory-md', type: 'memory', path: 'MEMORY.md', description: 'MEMORY.md', priority: 2 },
  { id: 'memory-dir', type: 'memory', path: 'memory', description: 'memory/ directory', priority: 3, isDir: true },
  { id: 'agents-memory', type: 'memory', path: '.agents/memory', description: '.agents/memory', priority: 2, isDir: true },
  { id: 'claude-memory', type: 'memory', path: '.claude/memory.md', description: 'Claude memory', priority: 2 },
  { id: 'cursor-memory', type: 'memory', path: '.cursor/memory.md', description: 'Cursor memory', priority: 3 },
  // Handoff
  { id: 'handoff-md', type: 'handoff', path: 'HANDOFF.md', description: 'HANDOFF.md', priority: 2 },
  { id: 'handoff-yaml', type: 'handoff', path: 'handoff.yaml', description: 'handoff.yaml', priority: 2 },
  { id: 'docs-handoff', type: 'handoff', path: 'docs/handoff.md', description: 'docs/handoff.md', priority: 3 },
  // Architecture
  { id: 'architecture-md', type: 'architecture', path: 'ARCHITECTURE.md', description: 'ARCHITECTURE.md', priority: 2 },
  { id: 'docs-architecture-md', type: 'architecture', path: 'docs/architecture.md', description: 'docs/architecture.md', priority: 2 },
  { id: 'docs-design-md', type: 'architecture', path: 'docs/design.md', description: 'docs/design.md', priority: 3 },
  // Agent-specific
  { id: 'claude-skills', type: 'agent-state', path: '.claude/skills', description: 'Claude skills', priority: 3, isDir: true },
  { id: 'agents-skills', type: 'agent-state', path: '.agents/skills', description: 'Codex agents skills', priority: 3, isDir: true },
  { id: 'opencode-skills', type: 'agent-state', path: '.opencode/skills', description: 'OpenCode skills', priority: 3, isDir: true },
  { id: 'cursor-rules', type: 'agent-state', path: '.cursor/rules', description: 'Cursor rules', priority: 3, isDir: true },
  // Robotics / automation specific state hints
  { id: 'ros-package', type: 'robotics-state', path: 'package.xml', description: 'ROS package.xml', priority: 4 },
  { id: 'platformio', type: 'robotics-state', path: 'platformio.ini', description: 'PlatformIO config', priority: 4 },
];

export function scanLifecycleSystems(rootDir) {
  const detected = [];
  for (const pat of LIFECYCLE_PATTERNS) {
    const full = path.join(rootDir, pat.path);
    try {
      const exists = pat.isDir ? fs.existsSync(full) && fs.statSync(full).isDirectory() : fs.existsSync(full);
      if (exists) {
        let contentPreview = null;
        let size = null;
        try {
          const stat = fs.statSync(full);
          size = pat.isDir ? null : stat.size;
          if (!pat.isDir && stat.size < 100000 && stat.isFile()) {
            contentPreview = fs.readFileSync(full, 'utf8').slice(0, 2000);
          }
        } catch {}
        detected.push({ ...pat, exists: true, fullPath: full, size, contentPreview });
      }
    } catch {}
  }
  // Also scan for any file containing lifecycle/state in name (broad)
  try {
    const extra = findExtraStateFiles(rootDir);
    for (const f of extra) {
      if (!detected.some(d => d.path === f.rel)) {
        detected.push({ id: `extra-${f.rel}`, type: 'unknown-state', path: f.rel, description: `Extra state-like file ${f.rel}`, priority: 5, exists: true, fullPath: f.full, size: f.size });
      }
    }
  } catch {}
  return detected;
}

function findExtraStateFiles(rootDir, limit = 20) {
  const results = [];
  const queue = [rootDir];
  const ignore = new Set(['node_modules', '.git', '.engineering', 'dist', 'build', '.next', 'vendor', '__pycache__', 'src', 'tests', 'node_modules', '.opencode']);
  let scanned = 0;
  while (queue.length && results.length < limit) {
    const dir = queue.shift();
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (results.length >= limit) break;
        if (entry.isDirectory()) {
          if (ignore.has(entry.name) || entry.name.startsWith('.')) continue;
          queue.push(path.join(dir, entry.name));
        } else {
          scanned++;
          if (scanned > 2000) break;
          const lower = entry.name.toLowerCase();
          const isStateExt = lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.json') || lower.endsWith('.md');
          if (!isStateExt) continue;
          if (lower.includes('lifecycle') || lower.includes('project-state') || (lower.includes('state') && isStateExt)) {
            const full = path.join(dir, entry.name);
            const rel = path.relative(rootDir, full);
            if (rel.startsWith('.engineering')) continue;
            // Exclude code that merely implements lifecycle logic, not state file
            if (rel.startsWith('src/') || rel.startsWith('tests/')) continue;
            try {
              const stat = fs.statSync(full);
              results.push({ rel, full, size: stat.size });
            } catch {}
          }
        }
      }
    } catch {}
  }
  return results;
}

export function analyzeLifecycleConflicts(detected) {
  const byType = {};
  for (const d of detected) {
    if (!byType[d.type]) byType[d.type] = [];
    byType[d.type].push(d);
  }
  const conflicts = [];
  // Multiple lifecycle systems — only count external lifecycle files vs engineering root, not internal .engineering files
  const externalLifecycle = detected.filter(d => (d.type === 'lifecycle' || d.type === 'project-state') && !d.path.startsWith('.engineering/'));
  const hasEngineering = detected.some(d => d.type === 'engineering-state');
  if (hasEngineering && externalLifecycle.length > 0) {
    const ids = [detected.find(d=>d.type==='engineering-state')?.path, ...externalLifecycle.map(d=>d.path)].filter(Boolean);
    conflicts.push({ type: 'multiple_lifecycle_systems', severity: 'WARNING', message: `Multiple lifecycle/state systems detected: ${ids.join(', ')} — may cause conflict; prefer .engineering/ as primary`, files: ids, status: 'CONFLICTING' });
  } else if (!hasEngineering && externalLifecycle.length > 1) {
    const ids = externalLifecycle.map(d=>d.path);
    conflicts.push({ type: 'multiple_lifecycle_systems', severity: 'WARNING', message: `Multiple external lifecycle systems: ${ids.join(', ')} — choose one, prefer .engineering/`, files: ids, status: 'CONFLICTING' });
  }
  // Multiple memory systems
  if ((byType['memory']?.length || 0) > 1) {
    conflicts.push({ type: 'multiple_memory_systems', severity: 'INFO', message: `Multiple memory systems: ${byType['memory'].map(m=>m.path).join(', ')}`, files: byType['memory'].map(m=>m.path), status: 'CONFLICTING' });
  }
  // Stale: .engineering exists but also legacy handoff outside
  if (byType['engineering-state'] && byType['handoff']) {
    const hasEngHandoff = detected.some(d => d.path === '.engineering/handoff.yaml');
    const hasExternalHandoff = detected.some(d => d.path === 'HANDOFF.md' || d.path === 'handoff.yaml');
    if (hasEngHandoff && hasExternalHandoff) {
      conflicts.push({ type: 'duplicate_handoff', severity: 'INFO', message: 'Both .engineering/handoff.yaml and external HANDOFF.md exist — keep .engineering as source of truth', status: 'CONFLICTING' });
    }
  }
  return conflicts;
}

export function getPrimaryLifecycleSystem(detected) {
  if (!detected.length) return null;
  // Priority: engineering-state > lifecycle > project-state > others
  const sorted = [...detected].sort((a,b) => a.priority - b.priority);
  return sorted[0];
}

export function shouldCreateNewLifecycle(detected) {
  // Per b.md: if existing lifecycle system found, read it first and follow it; do not overwrite blindly
  // Only create new if no high-priority lifecycle exists
  const hasEngineering = detected.some(d => d.type === 'engineering-state');
  const hasLifecycle = detected.some(d => d.type === 'lifecycle' || d.type === 'project-state');
  if (hasEngineering) return { create: false, reason: 'Engineering state (.engineering/) already exists — update carefully, preserve history', primary: detected.find(d=>d.type==='engineering-state') };
  if (hasLifecycle) return { create: false, reason: `Existing lifecycle system ${hasLifecycle? detected.find(d=>['lifecycle','project-state'].includes(d.type)).path : ''} found — read first, do not overwrite blindly`, primary: detected.find(d=>['lifecycle','project-state'].includes(d.type)) };
  return { create: true, reason: 'No existing lifecycle system — will infer project type and create .engineering/lifecycle.yaml', primary: null };
}
