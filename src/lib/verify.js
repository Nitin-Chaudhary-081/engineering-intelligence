/**
 * Verification — compare claims vs evidence
 * @module verify
 */
import fs from 'node:fs';
import path from 'node:path';
import { VERIFICATION_STATES } from './constants.js';

export function verifyAll(store, projectInfo, graph) {
  const results = [];
  const requirements = store.listRequirements();
  for (const { data: r } of requirements) {
    const files = r.files || r.implementation?.files || [];
    let status = r.status || VERIFICATION_STATES.UNKNOWN;
    const evidence = r.evidence || [];
    let reason = r.reason || '';

    // Check if files actually exist
    const missing = files.filter(f => !fs.existsSync(path.join(store.rootDir, f)));
    if (missing.length > 0 && files.length > 0) {
      status = VERIFICATION_STATES.CONFLICTING;
      reason = `Requirement claims files ${files.join(', ')} but missing: ${missing.join(', ')}`;
    } else if (evidence.length === 0) {
      status = VERIFICATION_STATES.UNKNOWN;
      reason = 'No evidence; Unknown; verification evidence does not exist.';
    } else if (status === VERIFICATION_STATES.VERIFIED && evidence.length === 0) {
      status = VERIFICATION_STATES.CONFLICTING;
      reason = 'Marked VERIFIED but no evidence';
    }

    // Check tests evidence
    const hasTest = evidence.some(e => e.type === 'TEST');
    if (status === VERIFICATION_STATES.VERIFIED && !hasTest) {
      // still VERIFIED if runtime evidence exists
      const hasRuntime = evidence.some(e => e.type === 'RUNTIME');
      if (!hasRuntime) reason += ' (verified without test evidence — consider adding tests)';
    }

    results.push({ id: r.id, title: r.title, status, reason, evidenceCount: evidence.length, files, missing });
  }

  // Check architecture claims
  const arch = store.getArchitecture();
  if (arch) {
    const nodesExist = (arch.nodes || []).every(n => n.evidence);
    results.push({
      id: 'ARCH-001',
      title: 'Architecture documented',
      status: nodesExist ? VERIFICATION_STATES.IMPLEMENTED : VERIFICATION_STATES.INFERRED,
      reason: nodesExist ? 'Graph has evidence fields' : 'No evidence per node',
      evidenceCount: arch.nodes?.length || 0,
    });
  }

  // Security: already handled in security.js but include summary
  const sec = store.getSecurity();
  if (sec?.findings) {
    for (const f of sec.findings) {
      results.push({ id: f.id, title: f.claim, status: f.status, reason: f.note || '', evidenceCount: f.evidence?.length || 0 });
    }
  }

  // Detect stale
  const summary = {
    total: results.length,
    verified: results.filter(r => r.status === VERIFICATION_STATES.VERIFIED).length,
    implemented: results.filter(r => r.status === VERIFICATION_STATES.IMPLEMENTED).length,
    unknown: results.filter(r => r.status === VERIFICATION_STATES.UNKNOWN).length,
    failed: results.filter(r => r.status === VERIFICATION_STATES.FAILED).length,
    conflicting: results.filter(r => r.status === VERIFICATION_STATES.CONFLICTING).length,
  };

  return { results, summary, verifiedAt: new Date().toISOString() };
}

export function detectConflicts(store) {
  const conflicts = [];
  const reqs = store.listRequirements();
  // Check duplicate IDs
  const ids = reqs.map(r => r.data.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) conflicts.push({ type: 'duplicate_requirement', ids: [...new Set(dupes)], status: VERIFICATION_STATES.CONFLICTING });

  // Check git vs state
  // If manifest says python but project is node, flag inferred
  const manifest = store.getManifest();
  const project = store.getProject();
  if (manifest && project && manifest.projectType !== project.projectType && project.projectType !== 'unknown') {
    conflicts.push({ type: 'project_type_mismatch', manifest: manifest.projectType, detected: project.projectType, status: VERIFICATION_STATES.CONFLICTING });
  }

  return conflicts;
}
