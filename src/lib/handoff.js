/**
 * AI-to-AI Handoff — compact machine + human readable
 * @module handoff
 */

export function generateHandoff(store, projectInfo, graph, progress, security, events) {
  const recentEvents = events.slice(-10);
  const manifest = store.getManifest();
  const requirements = store.listRequirements();
  const decisions = store.listDecisions();
  const mistakes = store.listMistakes();
  const contracts = store.getContracts();
  const runtime = store.getRuntime();

  const incomplete = requirements.filter(r => r.data.status !== 'VERIFIED' && r.data.status !== 'IMPLEMENTED');
  const unverified = security?.findings?.filter(f => f.status === 'UNKNOWN') || [];

  const handoff = {
    project: {
      name: manifest?.projectName || 'unknown',
      type: manifest?.projectType || projectInfo?.projectType || 'unknown',
      description: manifest?.description || '',
      root: store.rootDir,
    },
    currentObjective: manifest?.currentObjective || 'Not set — define in manifest.yaml',
    currentArchitecture: {
      type: projectInfo?.projectType,
      languages: projectInfo?.languages,
      frameworks: projectInfo?.frameworks,
      components: store.listComponents().map(c => c.data.name || c.data.id),
      graphSummary: { nodes: graph?.nodes?.length || 0, edges: graph?.edges?.length || 0 },
    },
    completedWork: requirements.filter(r => r.data.status === 'VERIFIED').map(r => r.data.title || r.data.id),
    incompleteWork: incomplete.map(r => ({ id: r.data.id, title: r.data.title, status: r.data.status })),
    knownBugs: mistakes.filter(m => m.data.severity === 'bug').map(m => m.data),
    knownFailedApproaches: mistakes.map(m => ({ problem: m.data.problem, doNotRepeat: m.data.doNotRepeat })),
    importantDecisions: decisions.slice(-5).map(d => d.data),
    constraints: contracts?.invariants || [],
    invariants: contracts?.invariants || [],
    securityRequirements: security?.findings || [],
    runtimeState: runtime || { status: 'UNKNOWN', note: 'No runtime observations recorded' },
    recentChanges: recentEvents,
    unverifiedAssumptions: unverified.map(f => f.claim),
    conflicts: [], // filled by conflict detection
    highestRisks: incomplete.filter(r => r.data.risk === 'HIGH' || r.data.risk === 'CRITICAL').map(r => r.data.id),
    nextRecommendedActions: generateNextActions(incomplete, mistakes, security),
    generatedAt: new Date().toISOString(),
    evidencePolicy: 'All claims require evidence; UNKNOWN is valid. See evidence.yaml',
  };

  return handoff;
}

function generateNextActions(incomplete, mistakes, security) {
  const actions = [];
  if (incomplete.length) actions.push(`Implement ${incomplete[0].data.id}: ${incomplete[0].data.title}`);
  const failedSec = security?.findings?.filter(f => f.status === 'FAILED')[0];
  if (failedSec) actions.push(`Fix security finding ${failedSec.id}: ${failedSec.claim}`);
  if (mistakes.length) actions.push(`Review mistake memory before retrying failed approaches`);
  if (actions.length === 0) actions.push('Run `engineering verify` to check current state, then `engineering progress`');
  return actions;
}

export function handoffToMarkdown(handoff) {
  return `# Handoff — ${handoff.project.name}

> Generated ${handoff.generatedAt} — compact AI-to-AI transfer

## Project
- **Name:** ${handoff.project.name}
- **Type:** ${handoff.project.type}
- **Description:** ${handoff.project.description}

## Current Objective
${handoff.currentObjective}

## Architecture
- Type: ${handoff.currentArchitecture.type}
- Languages: ${JSON.stringify(handoff.currentArchitecture.languages)}
- Frameworks: ${(handoff.currentArchitecture.frameworks||[]).join(', ') || 'none'}
- Graph: ${handoff.currentArchitecture.graphSummary.nodes} files, ${handoff.currentArchitecture.graphSummary.edges} edges

## Completed Work
${handoff.completedWork.length ? handoff.completedWork.map(w=>`- ${w}`).join('\n') : '- None yet'}

## Incomplete Work
${handoff.incompleteWork.length ? handoff.incompleteWork.map(w=>`- ${w.id}: ${w.title} [${w.status}]`).join('\n') : '- None — all requirements verified'}

## Known Failed Approaches — DO NOT REPEAT
${handoff.knownFailedApproaches.length ? handoff.knownFailedApproaches.map(m=>`- ${m.problem} → ${m.doNotRepeat}`).join('\n') : '- None recorded'}

## Important Decisions
${handoff.importantDecisions.length ? handoff.importantDecisions.map(d=>`- ${d.title || d.id}: ${d.reason||''}`).join('\n') : '- None'}

## Invariants / Contracts
${handoff.invariants.length ? handoff.invariants.map(c=>`- ${c.id || ''}: ${c.invariant||c}`).join('\n') : '- None defined — consider adding invariants'}

## Security (unverified = UNKNOWN)
${handoff.securityRequirements.length ? handoff.securityRequirements.map(s=>`- ${s.id}: ${s.claim} [${s.status}]`).join('\n') : '- No audit yet — run `engineering security`'}

## Runtime State
\`\`\`yaml
${JSON.stringify(handoff.runtimeState, null, 2)}
\`\`\`

## Recent Changes
${handoff.recentChanges.length ? handoff.recentChanges.map(e=>`- ${e.timestamp} ${e.type}: ${e.summary||''}`).join('\n') : '- No events recorded'}

## Highest Risks
${handoff.highestRisks.length ? handoff.highestRisks.join(', ') : 'None flagged'}

## Next Recommended Actions
${handoff.nextRecommendedActions.map((a,i)=>`${i+1}. ${a}`).join('\n')}

---
*Evidence policy: claims without evidence are UNKNOWN. Prefer "Unknown; verification evidence does not exist." over hallucination.*
`;
}
