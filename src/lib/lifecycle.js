/**
 * Lifecycle State — manages .engineering/lifecycle.yaml per b.md
 * Implements required outputs: lifecycle/state file, summary, phase, decisions,
 * risks/bottlenecks, open tasks/next actions, evidence links.
 * @module lifecycle
 */
import { VERIFICATION_STATES } from './constants.js';

export function buildInitialLifecycle({ store, projectInfo, lifecycleModel, graph, detectedSystems }) {
  const manifest = store.getManifest();
  const now = new Date().toISOString();
  const template = lifecycleModel.template;
  const phases = template.phases.map((p, idx) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    enteredAt: idx === 0 ? now : null,
    completedAt: null,
    evidence: idx === 0 ? [{ type: 'CODE', source: '.engineering/manifest.yaml', kind: 'FACT', details: 'Lifecycle initialized' }] : [],
  }));

  const projectSummary = `${manifest?.projectName || projectInfo?.projectType || 'Project'} — ${manifest?.description || template.description}. Type: ${lifecycleModel.modelId} (${lifecycleModel.template.category}). Primary: ${projectInfo?.languages?.primary || 'unknown'} (${Object.keys(projectInfo?.languages?.counts||{}).join(', ')||'none'}), frameworks: ${projectInfo?.frameworks?.join(', ')||'none'}, files: ${graph?.nodes?.length||0}, deps: ${Object.keys(projectInfo?.dependencies||{}).length}.`;

  const decisions = store.listDecisions().slice(0,5).map(d => ({ id: d.data.id, title: d.data.title, rationale: d.data.reason || d.data.rationale || '', evidence: d.data.evidence || [], date: d.data.date }));

  const risks = (template.defaultRisks || []).map((r, i) => ({
    id: `RISK-${String(i+1).padStart(3,'0')}`,
    description: r,
    category: 'default',
    impact: 'medium',
    mitigation: 'TBD — define mitigation and link evidence',
    status: 'OPEN',
    evidence: [],
    kind: 'INFERENCE',
  }));

  // Add UNKNOWN risks if no evidence
  const openTasks = store.listRequirements()
    .filter(r => r.data.status !== VERIFICATION_STATES.VERIFIED)
    .slice(0,10)
    .map(r => ({ id: r.data.id, title: r.data.title, status: r.data.status, priority: r.data.risk || 'MEDIUM', evidence: r.data.evidence || [] }));

  // If no requirements, generate placeholder next steps from template
  const nextSteps = openTasks.length ? openTasks.map(t => ({ id: t.id, task: t.title, priority: t.priority, status: t.status, evidence: t.evidence }))
    : template.phases.slice(1,3).map(p => ({ id: `NEXT-${p.id}`, task: `Complete phase ${p.name}: ${p.description}`, priority: 'MEDIUM', status: 'PENDING' }));

  return {
    schemaVersion: '1.0.0',
    project: {
      name: manifest?.projectName || 'unknown',
      type: lifecycleModel.modelId,
      category: lifecycleModel.template.category,
      summary: projectSummary,
    },
    lifecycleModel: {
      id: lifecycleModel.modelId,
      name: template.name,
      category: template.category,
      reason: lifecycleModel.reason,
      confidence: lifecycleModel.confidence,
      hints: lifecycleModel.hints || {},
    },
    detectedSystems: (detectedSystems||[]).map(d => ({ type: d.type, path: d.path, description: d.description })),
    currentPhase: phases.find(p=>p.status==='IN_PROGRESS')?.id || template.phases[0].id,
    currentStage: 'active',
    phases,
    keyDecisions: decisions,
    risksAndBottlenecks: risks,
    assumptions: [
      { id: 'A-001', description: 'Lifecycle state is durable and version-controlled in .engineering/', kind: 'FACT', evidence: [{ type: 'CODE', source: '.engineering/lifecycle.yaml', kind: 'FACT' }], status: 'VERIFIED' },
    ],
    openQuestions: [
      { id: 'Q-001', question: 'What is the next verifiable milestone?', status: 'OPEN', evidence: [] },
    ],
    openTasks,
    nextActions: nextSteps,
    evidenceLinks: [
      { type: 'CODE', source: '.engineering/manifest.yaml', kind: 'FACT', details: 'Manifest exists' },
      { type: 'CODE', source: '.engineering/project.yaml', kind: 'FACT', details: 'Project analysis' },
      { type: 'CODE', source: '.engineering/architecture/graph.yaml', kind: 'FACT', details: `Graph ${graph?.nodes?.length||0} files` },
    ],
    evidencePolicy: 'All claims require evidence; UNKNOWN is valid. See VERIFICATION_STATES.',
    history: [
      { timestamp: now, type: 'lifecycle_created', summary: `Lifecycle initialized with model ${lifecycleModel.modelId} (${lifecycleModel.confidence} confidence)`, model: lifecycleModel.modelId },
    ],
    generatedAt: now,
    updatedAt: now,
  };
}

export function updateLifecyclePhase(lifecycle, newPhaseId, reason = '') {
  const now = new Date().toISOString();
  const current = lifecycle.phases.find(p => p.id === lifecycle.currentPhase);
  const next = lifecycle.phases.find(p => p.id === newPhaseId);
  if (!next) throw new Error(`Phase ${newPhaseId} not found in template ${lifecycle.lifecycleModel.id}`);
  if (current) {
    current.status = 'COMPLETED';
    current.completedAt = now;
  }
  next.status = 'IN_PROGRESS';
  next.enteredAt = now;
  lifecycle.currentPhase = newPhaseId;
  lifecycle.updatedAt = now;
  lifecycle.history.push({ timestamp: now, type: 'phase_changed', from: current?.id||null, to: newPhaseId, reason });
  return lifecycle;
}

export function addLifecycleRisk(lifecycle, risk) {
  lifecycle.risksAndBottlenecks.push({ id: `RISK-${Date.now().toString().slice(-6)}`, status: 'OPEN', kind: 'INFERENCE', evidence: [], ...risk });
  lifecycle.updatedAt = new Date().toISOString();
  return lifecycle;
}

export function addLifecycleTask(lifecycle, task) {
  lifecycle.openTasks.push({ id: `TASK-${Date.now().toString().slice(-6)}`, status: 'PENDING', ...task });
  lifecycle.nextActions.push({ id: `TASK-${Date.now().toString().slice(-6)}`, status: 'PENDING', ...task });
  lifecycle.updatedAt = new Date().toISOString();
  return lifecycle;
}

export function getLifecycleSummary(lifecycle) {
  const curPhase = lifecycle.phases.find(p=>p.id===lifecycle.currentPhase);
  return {
    project: lifecycle.project.name,
    model: lifecycle.lifecycleModel.id,
    currentPhase: lifecycle.currentPhase,
    phaseName: curPhase?.name || lifecycle.currentPhase,
    totalPhases: lifecycle.phases.length,
    completedPhases: lifecycle.phases.filter(p=>p.status==='COMPLETED').length,
    risksOpen: lifecycle.risksAndBottlenecks.filter(r=>r.status==='OPEN').length,
    tasksOpen: lifecycle.openTasks.filter(t=>t.status!=='COMPLETED'&&t.status!=='VERIFIED').length,
    decisions: lifecycle.keyDecisions.length,
    updatedAt: lifecycle.updatedAt,
  };
}
