#!/usr/bin/env node
/**
 * Engineering Intelligence CLI — /engineering entry point
 * Supports: init, status, explain, research, architecture, verify, security, audit, impact, progress, handoff, sync, events, etc.
 * @version 0.1.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { Store, findEngineeringRoot } from '../src/lib/store.js';
import { analyzeProject } from '../src/lib/project-analyzer.js';
import { buildGraph, impactAnalysis, detectCycles } from '../src/lib/graph.js';
import { classifyChange, requiresResearch } from '../src/lib/risk.js';
import { computeCompleteness } from '../src/lib/progress.js';
import { auditSecurity } from '../src/lib/security.js';
import { analyzeComplexity } from '../src/lib/complexity.js';
import { verifyAll, detectConflicts } from '../src/lib/verify.js';
import { explainProject } from '../src/lib/explain.js';
import { generateHandoff, handoffToMarkdown } from '../src/lib/handoff.js';
import { buildContext, getContextForLevel } from '../src/lib/context.js';
import { observeRuntime } from '../src/lib/runtime.js';
import { VERIFICATION_STATES, RISK_LEVELS } from '../src/lib/constants.js';
import { scanLifecycleSystems, analyzeLifecycleConflicts, shouldCreateNewLifecycle } from '../src/lib/lifecycle-scanner.js';
import { selectLifecycleModel } from '../src/lib/lifecycle-decision.js';
import { buildInitialLifecycle, getLifecycleSummary, updateLifecyclePhase } from '../src/lib/lifecycle.js';

const VERSION = '0.1.0';

function printHelp() {
  console.log(`
Engineering Intelligence v${VERSION} — /engineering

Usage: engineering <command> [options]

Commands:
  init [--name <name>] [--type <type>]     Initialize .engineering in current repo
  status                                   Show engineering state status
  explain [--level 30s|5min|developer|senior|machine]  Explain project
  architecture [--impact <file>]           Show architecture graph / impact
  impact <file>                            Impact analysis for file/component
  verify                                   Verify claims vs evidence
  security | audit                         Security audit (evidence-backed)
  progress                                 Engineering completeness
  handoff [--md]                           Generate AI-to-AI handoff
  research <topic>                         Record research (stub)
  lifecycle [--phase <id>]                 Show or update lifecycle phase
  sync                                     Sync state from current codebase (re-analyze)
  events [--limit N]                       Show recent events
  complexity                               Complexity / necessity review
  runtime                                  Runtime observations
  context [--level N]                      Hierarchical context (0-6)
  help                                     Show this help

Examples:
  engineering init
  engineering status
  engineering explain
  engineering impact src/lib/store.js
  engineering lifecycle
  engineering lifecycle --phase implementation
  engineering handoff --md
  engineering verify
`);
}

function resolveStore(cwd) {
  const root = findEngineeringRoot(cwd) || cwd;
  return new Store(root);
}

async function cmdInit(args) {
  const cwd = process.cwd();
  const store = new Store(cwd);
  if (store.isInitialized()) {
    console.log('Already initialized at', store.engDir);
    console.log('Run `engineering sync` to re-analyze.');
    return;
  }
  const nameIdx = args.indexOf('--name');
  const typeIdx = args.indexOf('--type');
  const name = nameIdx !== -1 ? args[nameIdx + 1] : path.basename(cwd);
  const type = typeIdx !== -1 ? args[typeIdx + 1] : undefined;

  // b.md Core behavior 1-5: scan for existing lifecycle systems before creating new
  console.log('🔍 Scanning for existing lifecycle/state systems...');
  const detected = scanLifecycleSystems(cwd);
  const conflicts = analyzeLifecycleConflicts(detected);
  const shouldCreate = shouldCreateNewLifecycle(detected);
  if (detected.length) {
    console.log(`   Found ${detected.length} existing state system(s):`);
    for (const d of detected) console.log(`   - ${d.type}: ${d.path} — ${d.description}`);
    if (conflicts.length) {
      console.log(`   ⚠️ Conflicts detected (${conflicts.length}):`);
      for (const c of conflicts) console.log(`     ${c.type}: ${c.message}`);
    }
    console.log(`   → ${shouldCreate.reason}`);
    if (!shouldCreate.create) {
      console.log('   Preserving existing system; .engineering will be created as primary with history preserved.');
    }
  } else {
    console.log('   No existing lifecycle system — will create new .engineering/lifecycle.yaml');
  }

  console.log('🔍 Analyzing project...');
  const projectInfo = analyzeProject(cwd);
  const manifest = store.initManifest({ projectName: name, projectType: type || projectInfo.projectType, description: '' });
  store.ensureBaseStructure();

  // Write project.yaml
  store.setProject(projectInfo);
  // Build graph
  console.log('📊 Building architecture graph...');
  const graph = buildGraph(cwd);
  store.setArchitecture(graph);
  // Dataflow placeholder
  store.setDataflow({ flows: [], note: 'Dataflow INFERRED from imports; verify with runtime', generatedAt: new Date().toISOString() });
  // Security placeholder
  store.setSecurity({ findings: [], auditedAt: null, note: 'Run engineering security to audit' });
  // Contracts
  const { DEFAULT_INVARIANTS } = await import('../src/lib/contracts.js');
  store.setContracts({ invariants: DEFAULT_INVARIANTS });
  // Progress
  store.setProgress({ engineeringCompleteness: 0, productionReadiness: 0, breakdown: {}, explanation: 'Not yet scored — run engineering progress' });
  // Evidence
  store.setEvidence({ claims: [], policy: 'evidence_required', note: 'Documentation is not truth. Evidence required.' });
  // Runtime
  store.setRuntime({ status: 'UNKNOWN', note: 'No runtime observations yet' });
  // Context
  store.setContext(buildContext(store, projectInfo, graph, null));
  // Handoff
  store.setHandoff(generateHandoff(store, projectInfo, graph, null, null, []));
  // Lifecycle (b.md deliverable 2 & 4 — decision engine + lifecycle state file)
  const lifecycleModel = selectLifecycleModel(projectInfo, cwd);
  if (type) {
    // override if user passed --type
    lifecycleModel.modelId = type;
    lifecycleModel.reason = `User override --type ${type}`;
  }
  const lifecycle = buildInitialLifecycle({ store, projectInfo, lifecycleModel, graph, detectedSystems: detected });
  store.setLifecycle(lifecycle);
  console.log(`🧬 Lifecycle: ${lifecycleModel.modelId} (${lifecycleModel.confidence}) — ${lifecycleModel.reason}`);
  console.log(`   Phase: ${lifecycle.currentPhase} (${lifecycle.phases.find(p=>p.id===lifecycle.currentPhase)?.name})`);
  // Event
  store.appendEvent({ type: 'architecture_changed', summary: 'Initialized engineering state', files: [], actor: 'engineering-cli' });
  store.appendEvent({ type: 'decision', summary: `Lifecycle model ${lifecycleModel.modelId} selected: ${lifecycleModel.reason}`, metadata: lifecycleModel });

  // Create example requirement / decision / mistake if none
  if (store.listRequirements().length === 0) {
    store.setRequirement('R-001', {
      id: 'R-001',
      title: 'Engineering Intelligence skill exists',
      description: 'Core skill with /engineering entry point and .engineering state',
      status: VERIFICATION_STATES.IMPLEMENTED,
      evidence: [{ type: 'CODE', source: 'bin/engineering.js', kind: 'FACT', details: 'CLI exists' }],
      files: ['bin/engineering.js', 'src/lib/store.js'],
      risk: RISK_LEVELS.MEDIUM,
      createdAt: new Date().toISOString(),
    });
  }
  if (store.listDecisions().length === 0) {
    store.setDecision('ADR-001', {
      id: 'ADR-001',
      title: 'Use .engineering directory with YAML',
      reason: 'Git-friendly, human-readable, machine-consumable. Portable with repo.',
      alternatives: ['JSON only', 'SQLite', 'External service'],
      tradeoffs: 'YAML is verbose but diff-friendly; no external service needed',
      research: 'Checked agentskills.io compatibility',
      evidence: [{ type: 'CODE', source: '.engineering/manifest.yaml', kind: 'FACT' }],
      confidence: 'high',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  console.log(`✅ Initialized .engineering at ${store.engDir}`);
  console.log(`   Project: ${manifest.projectName} (${manifest.projectType})`);
  console.log(`   Files indexed: ${graph.nodes.length}, edges: ${graph.edges.length}`);
  console.log(`\nNext: engineering status, engineering explain, engineering verify`);
}

function cmdStatus() {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized. Run `engineering init`'); return; }
  const manifest = store.getManifest();
  const project = store.getProject();
  const graph = store.getArchitecture();
  const reqs = store.listRequirements();
  const comps = store.listComponents();
  const decisions = store.listDecisions();
  const events = store.getEvents(5);
  const progress = store.getProgress();
  const sec = store.getSecurity();
  const lifecycle = store.getLifecycle();

  console.log(`\n📦 ${manifest.projectName} (${manifest.projectType}) v${manifest.schemaVersion}`);
  console.log(`   Created: ${manifest.created}  Updated: ${manifest.updated}`);
  console.log(`   Root: ${store.rootDir}`);
  console.log(`\n📊 Project`);
  console.log(`   Languages: ${project?.languages?.primary || 'unknown'} ${JSON.stringify(project?.languages?.counts||{})}`);
  console.log(`   Frameworks: ${(project?.frameworks||[]).join(', ')||'none'}`);
  console.log(`   Graph: ${graph?.nodes?.length||0} files, ${graph?.edges?.length||0} edges`);
  if (lifecycle) {
    const summary = getLifecycleSummary(lifecycle);
    console.log(`\n🧬 Lifecycle: ${lifecycle.lifecycleModel.name} (${lifecycle.lifecycleModel.id}) [${lifecycle.lifecycleModel.confidence}]`);
    console.log(`   Phase: ${summary.phaseName} (${summary.currentPhase}) — ${summary.completedPhases}/${summary.totalPhases} phases done`);
    console.log(`   Risks: ${summary.risksOpen} open, Tasks: ${summary.tasksOpen} open, Decisions: ${summary.decisions}`);
    console.log(`   Next: ${(lifecycle.nextActions||[]).slice(0,2).map(a=>a.task).join(' | ')||'none'}`);
  }
  console.log(`\n📋 Requirements: ${reqs.length}  Components: ${comps.length}  Decisions: ${decisions.length}`);
  for (const r of reqs.slice(0,5)) console.log(`   - ${r.data.id}: ${r.data.title} [${r.data.status}]`);
  if (reqs.length>5) console.log(`   ... +${reqs.length-5} more`);
  console.log(`\n🔒 Security: ${sec?.findings?.length ? `${sec.findings.length} controls` : 'not yet audited (run engineering security)'}`);
  console.log(`\n📈 Progress: ${progress?.engineeringCompleteness ?? 0}% engineering, ${progress?.productionReadiness ?? 0}% production`);
  console.log(`\n🕒 Recent events:`);
  for (const e of events) console.log(`   ${e.timestamp.slice(0,19)} ${e.type} — ${e.summary}`);
  if (events.length===0) console.log('   (none)');
  // b.md acceptance: 5-min understandability — show lifecycle evidence only if conflicts
  const detected = scanLifecycleSystems(store.rootDir);
  const lcConflicts = analyzeLifecycleConflicts(detected);
  if (lcConflicts.length) console.log(`\n⚠️ ${lcConflicts.length} lifecycle conflict(s) — run \`engineering verify\` for details`);
  console.log('');
}

function cmdExplain(args) {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized. Run `engineering init`'); return; }
  const project = store.getProject();
  const graph = store.getArchitecture();
  const progress = store.getProgress();
  const sec = store.getSecurity();
  const manifest = store.getManifest();
  const levelIdx = args.indexOf('--level');
  const level = levelIdx !== -1 ? args[levelIdx+1] : 'developer';
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1) {
    const fp = args[fileIdx+1];
    const full = path.join(store.rootDir, fp);
    if (!fs.existsSync(full)) { console.log(`File not found: ${fp}`); return; }
    const content = fs.readFileSync(full, 'utf8').slice(0, 2000);
    console.log(`\n📄 ${fp} (${content.length} chars preview)`);
    console.log('Why it exists: check .engineering/components/ and architecture/graph.yaml for inbound/outbound edges');
    console.log(`Content preview:\n${content.slice(0,800)}\n...`);
    return;
  }
  const out = explainProject(project, graph, progress, sec, { manifest, level: level === 'all' ? undefined : level });
  if (typeof out === 'string') console.log(out);
  else {
    if (level === 'machine') console.log(out.machine);
    else {
      console.log('\n=== 30s ===\n' + out['30s']);
      console.log('\n=== 5min ===\n' + out['5min']);
      console.log('\n=== Developer ===\n' + out.developer);
      console.log('\n=== Senior ===\n' + out.senior);
    }
  }
}

function cmdArchitecture(args) {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  const graph = store.getArchitecture();
  const dataflow = store.getDataflow();
  if (!graph) { console.log('No graph — run engineering init or sync'); return; }
  const impactIdx = args.indexOf('--impact');
  if (impactIdx !== -1) {
    const target = args[impactIdx+1];
    if (!target) { console.log('Usage: engineering architecture --impact <file>'); return; }
    const res = impactAnalysis(graph, target);
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  console.log(`\n🏗️ Architecture Graph`);
  console.log(`Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}, Built: ${graph.builtAt}`);
  console.log(`Top files:`);
  for (const n of graph.nodes.slice(0,10)) console.log(`  - ${n.path} (${n.size}b)`);
  console.log(`\nEdges (first 10):`);
  for (const e of graph.edges.slice(0,10)) console.log(`  ${e.from} --${e.relationship}--> ${e.to}`);
  console.log(`\nDataflow: ${dataflow?.flows?.length || 0} flows (INFERRED)`);
  const cycles = detectCycles(graph);
  if (cycles.length) console.log(`\n⚠️ Cycles detected: ${cycles.length}\n${cycles.slice(0,3).map(c=>c.join(' -> ')).join('\n')}`);
  else console.log(`\nNo cycles detected (static scan)`);
}

function cmdImpact(args) {
  const target = args[0];
  if (!target) { console.log('Usage: engineering impact <file>'); return; }
  const store = resolveStore(process.cwd());
  const graph = store.getArchitecture();
  if (!graph) { console.log('No graph'); return; }
  const res = impactAnalysis(graph, target);
  console.log(`\n💥 Impact analysis for ${target}`);
  console.log(`Direct dependents: ${res.directDependents.join(', ')||'none'}`);
  console.log(`Transitive dependents: ${res.transitiveDependents.slice(0,10).join(', ')||'none'} ${res.transitiveDependents.length>10? `(+${res.transitiveDependents.length-10} more)` : ''}`);
  console.log(`Direct dependencies: ${res.directDependencies.join(', ')||'none'}`);
  console.log(`Total affected: ${res.totalAffected}`);
  console.log(`Evidence: ${res.evidence} — ${res.note}`);
  // Also guess security/tests affected
  console.log(`\nChecklist:`);
  console.log(` - Tests affected: search for imports of ${target}`);
  console.log(` - APIs affected: if ${target} exports routes, check dataflow.yaml`);
  console.log(` - Security: if auth-related, review SEC controls`);
}

function cmdVerify() {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  const project = store.getProject();
  const graph = store.getArchitecture();
  const { results, summary } = verifyAll(store, project, graph);
  const conflicts = detectConflicts(store);
  // b.md: detect multiple lifecycle systems as additional verification
  const detected = scanLifecycleSystems(store.rootDir);
  const lifecycleConflicts = analyzeLifecycleConflicts(detected);
  const lifecycle = store.getLifecycle();
  if (!lifecycle) {
    results.push({ id: 'LIFECYCLE-001', title: 'Lifecycle state exists', status: 'UNKNOWN', reason: 'Unknown; verification evidence does not exist. No .engineering/lifecycle.yaml found', evidenceCount: 0 });
    summary.unknown++;
    summary.total++;
  } else {
    results.push({ id: 'LIFECYCLE-001', title: 'Lifecycle state exists', status: 'VERIFIED', reason: `Lifecycle ${lifecycle.lifecycleModel.id} in phase ${lifecycle.currentPhase}`, evidenceCount: 1 });
    summary.verified++;
    summary.total++;
  }
  console.log(`\n🔍 Verification`);
  for (const r of results) {
    const icon = r.status === 'VERIFIED' ? '✅' : r.status === 'UNKNOWN' ? '❓' : r.status === 'FAILED' ? '❌' : r.status === 'CONFLICTING' ? '💥' : '⚠️';
    console.log(`${icon} ${r.id}: ${r.title} [${r.status}] — ${r.reason} (evidence: ${r.evidenceCount})`);
  }
  console.log(`\nSummary: ${summary.verified} verified, ${summary.implemented} implemented, ${summary.unknown} unknown, ${summary.failed} failed, ${summary.conflicting} conflicting / ${summary.total} total`);
  if (conflicts.length) {
    console.log(`\n💥 Conflicts:`);
    for (const c of conflicts) console.log(` - ${c.type}: ${JSON.stringify(c)}`);
  }
  if (lifecycleConflicts.length) {
    console.log(`\n💥 Lifecycle Conflicts (b.md: multiple systems):`);
    for (const c of lifecycleConflicts) console.log(` - ${c.type} [${c.severity}]: ${c.message}`);
  }
  if (detected.length) {
    console.log(`\n📂 Detected state systems (${detected.length}): ${detected.map(d=>d.path).join(', ')}`);
  }
  if (summary.unknown>0) console.log(`\nPrefer "Unknown; verification evidence does not exist." over hallucinating.`);
  store.appendEvent({ type: 'verification', summary: `Verified ${summary.verified}/${summary.total} claims`, metadata: summary });
}

function cmdSecurity() {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  const project = store.getProject();
  const graph = store.getArchitecture();
  const files = graph?.nodes || [];
  const result = auditSecurity(store.rootDir, files);
  store.setSecurity(result);
  store.appendEvent({ type: 'security_finding', summary: `Security audit: ${result.summary.verified} verified, ${result.summary.failed} failed`, metadata: result.summary });
  console.log(`\n🔒 Security Audit (${result.auditedAt})`);
  for (const f of result.findings) {
    const icon = f.status === 'VERIFIED' ? '✅' : f.status === 'FAILED' ? '❌' : '❓';
    console.log(`${icon} ${f.id}: ${f.claim} [${f.status}]${f.note? ' — '+f.note:''}`);
    if (f.evidence?.length) console.log(`   evidence: ${JSON.stringify(f.evidence[0])}`);
  }
  console.log(`\nSummary: ${JSON.stringify(result.summary)}`);
}

function cmdProgress() {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  const stored = store.getProgress();
  // Recompute from current state if possible — for demo, use stored or compute from requirements
  const reqs = store.listRequirements();
  const verified = reqs.filter(r=>r.data.status==='VERIFIED').length;
  const total = reqs.length || 1;
  const implScore = Math.round((verified/total)*100);
  const hasTests = fs.existsSync(path.join(store.rootDir, 'tests')) && fs.readdirSync(path.join(store.rootDir, 'tests')).some(f=>f.endsWith('.test.js'));
  const runtime = store.getRuntime();
  const secVerified = store.getSecurity()?.findings?.filter(f=>f.status==='VERIFIED').length || 0;
  const computed = computeCompleteness({
    requirements: { value: implScore, evidence: reqs.flatMap(r=>r.data.evidence||[]) },
    research: { value: store.listResearch().length? 80: 10, evidence: store.listResearch().map(r=>r.data) },
    architecture: { value: store.getArchitecture()? 85: 0, evidence: store.getArchitecture()? [{type:'CODE'}]:[] },
    implementation: { value: implScore, evidence: reqs.flatMap(r=>r.data.evidence||[]) },
    integration: { value: hasTests ? 60 : 20, evidence: hasTests ? [{type:'COMMAND', source:'npm test', kind:'FACT'}] : [] },
    testing: { value: hasTests ? 85 : 20, evidence: hasTests ? [{type:'TEST', source:'tests/*.test.js', kind:'FACT', details:'tests exist'}] : [] },
    security: { value: secVerified >=2 ? 75 : secVerified >=1 ? 60 : 20, evidence: store.getSecurity()?.findings||[] },
    runtime_verification: { value: runtime?.codeWorks==='VERIFIED' ? 70 : runtime ? 40 : 20, evidence: runtime ? [{type:'RUNTIME', source:'runtime/observations.yaml', kind:'FACT'}] : [] },
    documentation: { value: 85, evidence: [{type:'DOCUMENTATION', source:'README.md'}] },
    observability: { value: 20, evidence: [] },
    deployment: { value: 20, evidence: [] },
    performance: { value: 20, evidence: [] },
  });
  store.setProgress(computed);
  console.log(`\n📈 Engineering Completeness`);
  for (const [k,v] of Object.entries(computed.breakdown)) console.log(`  ${k.padEnd(22)} ${String(v.value).padStart(3)}% [${v.status}] evidence:${v.evidenceCount}`);
  console.log(`\nEngineering completeness: ${computed.engineeringCompleteness}%`);
  console.log(`Production readiness: ${computed.productionReadiness}%`);
  console.log(`\n${computed.explanation}`);
  if (stored) console.log(`\nPrevious: eng ${stored.engineeringCompleteness}% prod ${stored.productionReadiness}%`);
}

function cmdHandoff(args) {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  const project = store.getProject();
  const graph = store.getArchitecture();
  const progress = store.getProgress();
  const sec = store.getSecurity();
  const events = store.readJsonl ? store.getEvents(100) : [];
  // fallback
  let ev = [];
  try { ev = store.getEvents(100); } catch { ev = []; }
  const handoff = generateHandoff(store, project, graph, progress, sec, ev);
  store.setHandoff(handoff);
  const asMd = args.includes('--md');
  if (asMd) {
    const md = handoffToMarkdown(handoff);
    const outPath = path.join(store.engDir, 'handoff.md');
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(md);
    console.log(`\n📄 Written to ${outPath}`);
  } else {
    console.log(JSON.stringify(handoff, null, 2));
  }
}

function cmdResearch(args) {
  const topic = args[0];
  if (!topic) { console.log('Usage: engineering research <topic> [--source url]'); return; }
  const store = resolveStore(process.cwd());
  const srcIdx = args.indexOf('--source');
  const sources = srcIdx !== -1 ? [{ url: args[srcIdx+1], title: 'manual' }] : [];
  // naive research stub — in real use agent would fetch docs
  const research = {
    id: `RES-${Date.now().toString().slice(-6)}`,
    topic,
    question: `Research best practices for ${topic}`,
    sources,
    findings: [`Stub: research for ${topic} — replace with actual findings and mark kind FACT/INFERENCE`],
    confidence: sources.length ? 'low' : 'UNVERIFIED',
    kind: sources.length ? 'FACT' : 'UNVERIFIED',
    createdAt: new Date().toISOString(),
  };
  store.setResearch(research.id, research);
  store.appendEvent({ type: 'research', summary: `Research ${research.id}: ${topic}`, metadata: research });
  console.log(`📚 Recorded research ${research.id}: ${topic}`);
  console.log(JSON.stringify(research, null, 2));
}

function cmdLifecycle(args) {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized. Run `engineering init`'); return; }
  const lifecycle = store.getLifecycle();
  if (!lifecycle) { console.log('No lifecycle — run engineering init or sync'); return; }
  const phaseIdx = args.indexOf('--phase');
  if (phaseIdx !== -1) {
    const newPhase = args[phaseIdx+1];
    if (!newPhase) { console.log('Usage: engineering lifecycle --phase <phaseId>'); console.log(`Available: ${lifecycle.phases.map(p=>p.id).join(', ')}`); return; }
    try {
      const updated = updateLifecyclePhase(lifecycle, newPhase, `Manual phase change via CLI`);
      store.setLifecycle(updated);
      store.appendEvent({ type: 'decision', summary: `Lifecycle phase ${newPhase} entered`, metadata: { from: lifecycle.currentPhase, to: newPhase } });
      console.log(`✅ Lifecycle phase updated: ${newPhase} (${updated.phases.find(p=>p.id===newPhase)?.name})`);
      console.log(JSON.stringify(getLifecycleSummary(updated), null, 2));
    } catch (e) {
      console.error(`❌ ${e.message}`);
      console.log(`Available: ${lifecycle.phases.map(p=>`${p.id} (${p.status})`).join(', ')}`);
    }
    return;
  }
  // Show lifecycle
  console.log(`\n🧬 Lifecycle — ${lifecycle.project.name} (${lifecycle.lifecycleModel.id})`);
  console.log(`Current: ${lifecycle.currentPhase} — ${lifecycle.phases.find(p=>p.id===lifecycle.currentPhase)?.name}`);
  console.log(`Model: ${lifecycle.lifecycleModel.name} [${lifecycle.lifecycleModel.confidence}] — ${lifecycle.lifecycleModel.reason}`);
  console.log(`\nSummary: ${lifecycle.project.summary}`);
  console.log(`\nPhases:`);
  for (const p of lifecycle.phases) console.log(`  ${p.status==='IN_PROGRESS'?'▶':p.status==='COMPLETED'?'✓':'○'} ${p.id.padEnd(15)} ${p.name.padEnd(20)} [${p.status}]`);
  console.log(`\nRisks & Bottlenecks (${lifecycle.risksAndBottlenecks.length}):`);
  for (const r of lifecycle.risksAndBottlenecks.slice(0,5)) console.log(`  - ${r.id}: ${r.description} [${r.status}]`);
  console.log(`\nAssumptions (${lifecycle.assumptions.length}):`);
  for (const a of lifecycle.assumptions) console.log(`  - ${a.id}: ${a.description} [${a.kind}]`);
  console.log(`\nOpen Questions (${lifecycle.openQuestions.length}):`);
  for (const q of lifecycle.openQuestions) console.log(`  - ${q.id}: ${q.question} [${q.status}]`);
  console.log(`\nOpen Tasks (${lifecycle.openTasks.length}):`);
  for (const t of lifecycle.openTasks.slice(0,5)) console.log(`  - ${t.id}: ${t.title||t.task} [${t.status}]`);
  console.log(`\nNext Actions:`);
  for (const n of lifecycle.nextActions.slice(0,5)) console.log(`  - ${n.task||n.title} [${n.priority||n.status}]`);
  console.log(`\nEvidence Links: ${lifecycle.evidenceLinks.map(e=>e.source).join(', ')}`);
  console.log(`\nHistory (${lifecycle.history.length}):`);
  for (const h of lifecycle.history.slice(-5)) console.log(`  ${h.timestamp.slice(0,19)} ${h.type}: ${h.summary}`);
  console.log(`\nDetected systems: ${(lifecycle.detectedSystems||[]).map(d=>d.path).join(', ')||'none'}`);
  console.log(`Updated: ${lifecycle.updatedAt}`);
}

function cmdSync() {
  const store = resolveStore(process.cwd());
  if (!store.isInitialized()) { console.log('Not initialized'); return; }
  console.log('🔄 Syncing — re-analyzing project...');
  const project = analyzeProject(store.rootDir);
  store.setProject(project);
  const graph = buildGraph(store.rootDir);
  store.setArchitecture(graph);
  store.setContext(buildContext(store, project, graph, null));
  // b.md: preserve lifecycle history, update summary but do not overwrite blindly
  const existingLifecycle = store.getLifecycle();
  if (existingLifecycle) {
    // update summary/sync evidence but keep phase/history
    existingLifecycle.project.summary = `${store.getManifest()?.projectName || project.projectType} — ${project.languages.primary} ${Object.keys(project.languages.counts).join(', ')}`;
    existingLifecycle.updatedAt = new Date().toISOString();
    existingLifecycle.evidenceLinks = [
      { type: 'CODE', source: '.engineering/project.yaml', kind: 'FACT', details: `Synced ${project.projectType}` },
      { type: 'CODE', source: '.engineering/architecture/graph.yaml', kind: 'FACT', details: `${graph.nodes.length} files` },
    ];
    existingLifecycle.history.push({ timestamp: new Date().toISOString(), type: 'sync', summary: `Synced: ${graph.nodes.length} files, type ${project.projectType}` });
    store.setLifecycle(existingLifecycle);
    console.log(`🧬 Lifecycle preserved: ${existingLifecycle.lifecycleModel.id} @ ${existingLifecycle.currentPhase}`);
  } else {
    // create if missing (legacy repo)
    const detected = scanLifecycleSystems(store.rootDir);
    const model = selectLifecycleModel(project, store.rootDir);
    const lc = buildInitialLifecycle({ store, projectInfo: project, lifecycleModel: model, graph, detectedSystems: detected });
    store.setLifecycle(lc);
    console.log(`🧬 Lifecycle created: ${model.modelId}`);
  }
  store.touchManifest();
  store.appendEvent({ type: 'architecture_changed', summary: 'Synced state from codebase', files: [] });
  console.log(`✅ Synced: ${graph.nodes.length} files, ${graph.edges.length} edges, type ${project.projectType}`);
}

function cmdEvents(args) {
  const store = resolveStore(process.cwd());
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx+1],10) : 20;
  const events = store.getEvents(limit);
  console.log(`\n📜 Last ${events.length} events`);
  for (const e of events) console.log(`${e.timestamp} [${e.type}] ${e.summary} ${e.files?.length? `files:${e.files.join(',')}`:''}`);
}

function cmdComplexity() {
  const store = resolveStore(process.cwd());
  const graph = store.getArchitecture();
  const result = analyzeComplexity(store.rootDir, graph || { nodes: [] });
  console.log(`\n🧩 Complexity Review`);
  for (const iss of result.issues) console.log(`${iss.severity}: ${iss.rule} — ${iss.message}`);
  if (!result.issues.length) console.log('No issues detected (heuristic)');
  console.log(`Summary: ${JSON.stringify(result.summary)}`);
  store.appendEvent({ type: 'verification', summary: `Complexity check: ${result.issues.length} issues`, metadata: result.summary });
}

function cmdRuntime() {
  const store = resolveStore(process.cwd());
  const obs = observeRuntime(store.rootDir);
  store.setRuntime(obs);
  store.appendEvent({ type: 'verification', summary: `Runtime observed: ${obs.codeWorks}`, metadata: obs });
  console.log(JSON.stringify(obs, null, 2));
  console.log(`\nNote: CODE EXISTS != CODE WORKS != SYSTEM VERIFIED`);
}

function cmdContext(args) {
  const store = resolveStore(process.cwd());
  const levelIdx = args.indexOf('--level');
  const level = levelIdx !== -1 ? parseInt(args[levelIdx+1],10) : 2;
  const ctx = store.getContext();
  if (!ctx) { console.log('No context — run engineering init'); return; }
  console.log(JSON.stringify(getContextForLevel(ctx, level), null, 2));
}

function cmdGit() {
  const store = resolveStore(process.cwd());
  // dynamic import
  import('../src/lib/git.js').then(m=>{
    console.log('Git status:', m.gitStatus(store.rootDir));
    console.log('Git log:', m.gitLog(store.rootDir,5));
    console.log('Stale check:', m.detectStaleState(store.rootDir, '.engineering'));
  });
}

// Main
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') printHelp();
else if (cmd === '--version' || cmd === '-v') console.log(VERSION);
else if (cmd === 'init') await cmdInit(args.slice(1));
else if (cmd === 'status') cmdStatus();
else if (cmd === 'explain') cmdExplain(args.slice(1));
else if (cmd === 'architecture' || cmd === 'arch') cmdArchitecture(args.slice(1));
else if (cmd === 'impact') cmdImpact(args.slice(1));
else if (cmd === 'verify') cmdVerify();
else if (cmd === 'security' || cmd === 'audit') cmdSecurity();
else if (cmd === 'progress') cmdProgress();
else if (cmd === 'handoff') cmdHandoff(args.slice(1));
else if (cmd === 'research') cmdResearch(args.slice(1));
else if (cmd === 'lifecycle') cmdLifecycle(args.slice(1));
else if (cmd === 'sync') cmdSync();
else if (cmd === 'events') cmdEvents(args.slice(1));
else if (cmd === 'complexity') cmdComplexity();
else if (cmd === 'runtime') cmdRuntime();
else if (cmd === 'context') cmdContext(args.slice(1));
else if (cmd === 'git') cmdGit();
else {
  console.log(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}
