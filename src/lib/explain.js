/**
 * Human Explanation System — multiple levels
 * @module explain
 */

export function explainProject(projectInfo, graph, progress, security, opts = {}) {
  const manifest = opts.manifest;
  const level = opts.level || 'developer';

  const thirtySec = `${manifest?.projectName || 'This project'} is a ${projectInfo.projectType} built with ${projectInfo.languages.primary} (${Object.keys(projectInfo.languages.counts).join(', ')}). It has ${graph?.nodes?.length || 0} files, uses ${Object.keys(projectInfo.dependencies).length} dependencies, and entry points at ${(projectInfo.entryPoints||[]).join(', ')||'none detected'}.`;

  const fiveMin = `${thirtySec}
Architecture: ${projectInfo.frameworks.length ? `uses ${projectInfo.frameworks.join(', ')}` : 'no major framework detected, custom structure'}.
Structure: ${(projectInfo.structure||[]).slice(0,10).join(', ')}.
Config: ${(projectInfo.config||[]).join(', ')||'no docker/config detected'}.
Use \`engineering architecture\` for graph, \`engineering progress\` for completeness, \`engineering security\` for audit.`;

  const developer = `# Developer View

## Overview
${thirtySec}

## Languages & Frameworks
- Primary: ${projectInfo.languages.primary} (${JSON.stringify(projectInfo.languages.counts)})
- Frameworks: ${projectInfo.frameworks.join(', ') || 'none'}
- Package managers: ${projectInfo.packageManagers.join(', ')}

## Dependencies (top 10)
${Object.entries(projectInfo.dependencies).slice(0,10).map(([k,v])=>`- ${k}: ${v}`).join('\n') || '- none'}

## Architecture
- Nodes: ${graph?.nodes?.length || 0}, Edges: ${graph?.edges?.length || 0}
- Entry points: ${projectInfo.entryPoints.join(', ') || 'unknown'}

## Progress
- Engineering completeness: ${progress?.engineeringCompleteness ?? 'unknown'}%
- Production readiness: ${progress?.productionReadiness ?? 'unknown'}%

## Security
- Findings: ${security?.summary ? `${security.summary.verified} verified, ${security.summary.failed} failed, ${security.summary.unknown} unknown` : 'not yet audited'}
`;

  const senior = `${developer}

## Tradeoffs & Risks
- Evidence policy: UNKNOWN is legitimate; documentation not truth
- Graph is INFERRED via static import scan; runtime deps may differ
- Security controls require test/runtime evidence to be VERIFIED
- Check \`engineering verify\` and \`engineering impact <file>\` before changes

## Next Steps for Senior Engineer
- Review \`.engineering/decisions/\` for ADRs
- Review \`.engineering/contracts/invariants.yaml\` for invariants
- Run \`engineering handoff\` for AI transfer pack
`;

  const machine = {
    thirtySec,
    fiveMin,
    projectInfo,
    graphSummary: { nodes: graph?.nodes?.length, edges: graph?.edges?.length },
    progress,
    securitySummary: security?.summary,
  };

  if (level === '30s') return thirtySec;
  if (level === '5min') return fiveMin;
  if (level === 'developer') return developer;
  if (level === 'senior') return senior;
  if (level === 'machine') return JSON.stringify(machine, null, 2);
  // default: all levels
  return { '30s': thirtySec, '5min': fiveMin, developer, senior, machine };
}
