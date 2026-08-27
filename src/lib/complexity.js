/**
 * Complexity & Necessity Gate
 * @module complexity
 */
import fs from 'node:fs';
import path from 'node:path';
import { COMPLEXITY_SEVERITY } from './constants.js';

export function analyzeComplexity(rootDir, fileGraph) {
  const issues = [];

  // Check for duplicated logic (simple: hash files with same size and similar content)
  const bySize = new Map();
  for (const n of fileGraph.nodes || []) {
    if (!bySize.has(n.size)) bySize.set(n.size, []);
    bySize.get(n.size).push(n);
  }
  for (const [size, group] of bySize.entries()) {
    if (group.length > 1 && size > 500 && size < 20000) {
      // potential duplicate if same hash prefix? For MVP compare basename
      const names = group.map(g => path.basename(g.path));
      const uniqueNames = new Set(names);
      if (uniqueNames.size === 1 && group.length > 1) {
        issues.push({
          severity: COMPLEXITY_SEVERITY.WARNING,
          rule: 'duplicate-file',
          message: `Possible duplicated file: ${group.map(g => g.path).join(', ')}`,
          files: group.map(g => g.path),
        });
      }
    }
  }

  // Unnecessary abstraction: many small files
  const smallFiles = (fileGraph.nodes || []).filter(n => n.size < 100).length;
  if (smallFiles > 20) {
    issues.push({
      severity: COMPLEXITY_SEVERITY.INFO,
      rule: 'many-small-files',
      message: `${smallFiles} very small files (<100 bytes) — check if abstraction is necessary`,
      count: smallFiles,
    });
  }

  // Unnecessary dependencies: check package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (Object.keys(deps).length > 50) {
      issues.push({
        severity: COMPLEXITY_SEVERITY.WARNING,
        rule: 'many-dependencies',
        message: `${Object.keys(deps).length} dependencies — review necessity`,
        count: Object.keys(deps).length,
      });
    }
  } catch {}

  // Large files
  for (const n of fileGraph.nodes || []) {
    if (n.size > 50000) {
      issues.push({
        severity: COMPLEXITY_SEVERITY.WARNING,
        rule: 'large-file',
        message: `Large file ${n.path} (${n.size} bytes) — consider splitting`,
        file: n.path,
      });
    }
  }

  // Unnecessary comments? Heuristic: files with >30% comment lines (skip for MVP)

  return {
    issues,
    summary: {
      info: issues.filter(i => i.severity === COMPLEXITY_SEVERITY.INFO).length,
      warning: issues.filter(i => i.severity === COMPLEXITY_SEVERITY.WARNING).length,
      review: issues.filter(i => i.severity === COMPLEXITY_SEVERITY.REVIEW_REQUIRED).length,
      block: issues.filter(i => i.severity === COMPLEXITY_SEVERITY.BLOCK).length,
    },
    checkedAt: new Date().toISOString(),
  };
}

export function necessityQuestions(context) {
  return [
    { q: 'Is this code actually required?', answer: context.required ? 'yes' : 'unknown' },
    { q: 'Does equivalent functionality already exist?', answer: context.duplicate ? 'yes — reuse existing' : 'no' },
    { q: 'Can an existing abstraction be reused?', answer: 'check' },
    { q: 'Is this duplicating logic?', answer: context.duplicate ? 'yes' : 'unknown' },
    { q: 'Is this abstraction necessary?', answer: 'evaluate' },
    { q: 'Is this dependency necessary?', answer: context.newDep ? 'review' : 'n/a' },
    { q: 'Can this be implemented more simply?', answer: 'review' },
    { q: 'Does this increase maintenance cost?', answer: 'consider' },
  ];
}
