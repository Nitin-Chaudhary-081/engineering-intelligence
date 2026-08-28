/**
 * Lifecycle Decision Engine — selects most suitable lifecycle model per b.md §4
 * Infers project type and chooses template; supports software/automation/robotics.
 * @module lifecycle-decision
 */
import fs from 'node:fs';
import path from 'node:path';

export const LIFECYCLE_TEMPLATES = {
  'javascript-project': {
    id: 'javascript-project',
    name: 'JavaScript Project',
    category: 'software',
    description: 'Generic JS/TS project (no framework)',
    phases: [
      { id: 'init', name: 'Initialization', description: 'Repo scanned, .engineering bootstrapped' },
      { id: 'planning', name: 'Planning', description: 'Requirements and architecture defined' },
      { id: 'implementation', name: 'Implementation', description: 'Code + tests being built' },
      { id: 'verification', name: 'Verification', description: 'Tests, security, runtime checks' },
      { id: 'release', name: 'Release', description: 'Docs, handoff, deployment' },
    ],
    defaultRisks: ['Missing tests', 'Secrets leakage', 'Dependency vulnerabilities'],
    requiredFiles: ['package.json', 'README.md'],
    evidence: ['CODE', 'TEST', 'RUNTIME'],
  },
  'web-saas': {
    id: 'web-saas',
    name: 'Web SaaS (Next.js/NestJS)',
    category: 'software',
    description: 'Web SaaS with frontend + API',
    phases: [
      { id: 'discovery', name: 'Discovery', description: 'User/research validation' },
      { id: 'design', name: 'Design', description: 'UI/API contracts' },
      { id: 'build', name: 'Build', description: 'Frontend/backend implementation' },
      { id: 'integrate', name: 'Integration', description: 'Auth, payments, DB wiring' },
      { id: 'harden', name: 'Hardening', description: 'Security, performance, observability' },
      { id: 'launch', name: 'Launch', description: 'Deployment, handoff' },
    ],
    defaultRisks: ['Auth bypass', 'Data leakage', 'Payment failure', 'Scale bottleneck'],
    requiredFiles: ['package.json', 'src/'],
    evidence: ['CODE', 'TEST', 'SECURITY', 'RUNTIME'],
  },
  'web-api': {
    id: 'web-api',
    name: 'Web API Service',
    category: 'software',
    description: 'Express/Fastify/NestJS API',
    phases: [
      { id: 'spec', name: 'Spec', description: 'OpenAPI/contracts defined' },
      { id: 'implement', name: 'Implement', description: 'Routes + middleware + DB' },
      { id: 'secure', name: 'Secure', description: 'Auth, validation, injection protection' },
      { id: 'verify', name: 'Verify', description: 'Integration + load tests' },
      { id: 'deploy', name: 'Deploy', description: 'CI/CD, observability' },
    ],
    defaultRisks: ['Injection', 'Broken auth', 'Missing validation', 'No rate limit'],
    requiredFiles: ['package.json', 'src/'],
    evidence: ['CODE', 'TEST', 'SECURITY'],
  },
  'python-service': {
    id: 'python-service',
    name: 'Python Service',
    category: 'software',
    description: 'Python backend/service/ML',
    phases: [
      { id: 'setup', name: 'Setup', description: 'Env, deps, structure' },
      { id: 'prototype', name: 'Prototype', description: 'Core logic + data flow' },
      { id: 'robustify', name: 'Robustify', description: 'Tests, type hints, error handling' },
      { id: 'secure', name: 'Secure', description: 'Input validation, secrets, deps audit' },
      { id: 'operate', name: 'Operate', description: 'Logging, metrics, deployment' },
    ],
    defaultRisks: ['Env drift', 'Version pinning', 'Secrets in code', 'No type checks'],
    requiredFiles: ['pyproject.toml|requirements.txt', 'src/ or .py files'],
    evidence: ['CODE', 'TEST'],
  },
  'automation-project': {
    id: 'automation-project',
    name: 'Automation Project',
    category: 'automation',
    description: 'Scripts, CI/CD, infra automation (Makefile, Docker, workflows)',
    phases: [
      { id: 'catalog', name: 'Catalog', description: 'Inventory scripts/workflows/targets' },
      { id: 'harden', name: 'Harden', description: 'Idempotency, error handling, secrets' },
      { id: 'automate', name: 'Automate', description: 'CI triggers, scheduling' },
      { id: 'observe', name: 'Observe', description: 'Logs, alerts, retries' },
      { id: 'handover', name: 'Handover', description: 'Docs, runbooks' },
    ],
    defaultRisks: ['Non-idempotent runs', 'Hardcoded secrets', 'Silent failures', 'No rollback'],
    requiredFiles: ['Makefile|Dockerfile|.github/workflows'],
    evidence: ['CODE', 'COMMAND', 'RUNTIME'],
  },
  'robotics-project': {
    id: 'robotics-project',
    name: 'Robotics Project',
    category: 'robotics',
    description: 'ROS2 / Arduino / PlatformIO / hardware-software integration',
    phases: [
      { id: 'model', name: 'Model', description: 'URDF, topics, nodes/services defined' },
      { id: 'simulate', name: 'Simulate', description: 'Gazebo / simulation validation' },
      { id: 'implement', name: 'Implement', description: 'Nodes, drivers, controllers' },
      { id: 'integrate', name: 'Integrate', description: 'Hardware bring-up, telemetry' },
      { id: 'validate', name: 'Validate', description: 'Field tests, safety checks' },
      { id: 'ops', name: 'Ops', description: 'Calibration, logs, handoff to ops' },
    ],
    defaultRisks: ['Hardware mismatch', 'Topic/service misconfig', 'Safety bypass', 'Telemetry loss', 'Calibration drift'],
    requiredFiles: ['package.xml|platformio.ini|*.urdf|*.ino'],
    evidence: ['CODE', 'RUNTIME', 'TEST'],
  },
  'go-service': {
    id: 'go-service',
    name: 'Go Service',
    category: 'software',
    description: 'Go microservice',
    phases: [
      { id: 'scaffold', name: 'Scaffold', description: 'Module, layout' },
      { id: 'implement', name: 'Implement', description: 'Handlers, deps' },
      { id: 'harden', name: 'Harden', description: 'Context, timeouts, retries' },
      { id: 'verify', name: 'Verify', description: 'Tests, race detector' },
      { id: 'ship', name: 'Ship', description: 'Docker, deploy' },
    ],
    defaultRisks: ['Context leaks', 'Race conditions', 'No graceful shutdown'],
    requiredFiles: ['go.mod', 'main.go'],
    evidence: ['CODE', 'TEST'],
  },
  'fullstack': {
    id: 'fullstack',
    name: 'Full-Stack (JS + Python)',
    category: 'software',
    description: 'Mixed JS frontend + Python backend',
    phases: [
      { id: 'contracts', name: 'Contracts', description: 'API contracts, data shapes' },
      { id: 'parallel-build', name: 'Parallel Build', description: 'Frontend + backend in parallel' },
      { id: 'integrate', name: 'Integrate', description: 'CORS, auth, end-to-end' },
      { id: 'quality', name: 'Quality', description: 'E2E tests, security' },
      { id: 'release', name: 'Release', description: 'Deploy both tiers' },
    ],
    defaultRisks: ['Contract drift', 'CORS', 'Dual deploy complexity'],
    requiredFiles: ['package.json + pyproject.toml'],
    evidence: ['CODE', 'TEST', 'INTEGRATION'],
  },
};

export function detectRoboticsHints(rootDir, filesList) {
  const hints = [];
  if (fs.existsSync(path.join(rootDir, 'package.xml'))) hints.push('package.xml (ROS)');
  if (fs.existsSync(path.join(rootDir, 'platformio.ini'))) hints.push('platformio.ini');
  if (fs.existsSync(path.join(rootDir, 'CMakeLists.txt'))) {
    try {
      const c = fs.readFileSync(path.join(rootDir, 'CMakeLists.txt'), 'utf8');
      if (c.includes('ament_cmake') || c.includes('find_package') && c.includes('rclcpp')) hints.push('CMakeLists.txt with ament_cmake/rclcpp');
    } catch {}
  }
  // Check for .ino, .urdf, .sdf
  try {
    const all = filesList || fs.readdirSync(rootDir);
    const hasIno = all.some(f => f.endsWith('.ino'));
    const hasUrdf = all.some(f => f.endsWith('.urdf') || f.endsWith('.sdf'));
    // deeper scan
    if (hasIno || hasUrdf) hints.push(`hardware files: ${hasIno?'*.ino ':''}${hasUrdf?'*.urdf/*.sdf':''}`);
    // ros2 directories
    if (fs.existsSync(path.join(rootDir, 'src')) ) {
      try {
        const srcFiles = fs.readdirSync(path.join(rootDir, 'src'));
        if (srcFiles.some(f => f.includes('msg') || f.includes('srv') || f.includes('action'))) hints.push('ROS msg/srv/action');
      } catch {}
    }
  } catch {}
  return hints;
}

export function detectAutomationHints(rootDir) {
  const hints = [];
  if (fs.existsSync(path.join(rootDir, 'Makefile'))) hints.push('Makefile');
  if (fs.existsSync(path.join(rootDir, 'Dockerfile'))) hints.push('Dockerfile');
  if (fs.existsSync(path.join(rootDir, 'docker-compose.yml')) || fs.existsSync(path.join(rootDir, 'docker-compose.yaml'))) hints.push('docker-compose');
  if (fs.existsSync(path.join(rootDir, '.github/workflows'))) hints.push('.github/workflows');
  if (fs.existsSync(path.join(rootDir, 'Jenkinsfile'))) hints.push('Jenkinsfile');
  if (fs.existsSync(path.join(rootDir, 'ansible.cfg')) || fs.existsSync(path.join(rootDir, 'playbook.yml'))) hints.push('ansible');
  if (fs.existsSync(path.join(rootDir, 'scripts')) ) hints.push('scripts/');
  return hints;
}

export function selectLifecycleModel(projectInfo, rootDir) {
  const languages = projectInfo?.languages || { primary: 'unknown', counts: {} };
  const frameworks = projectInfo?.frameworks || [];
  const structure = projectInfo?.structure || [];
  const files = fs.existsSync(rootDir) ? fs.readdirSync(rootDir) : [];

  const roboticsHints = rootDir ? detectRoboticsHints(rootDir, files) : [];
  const automationHints = rootDir ? detectAutomationHints(rootDir) : [];

  // Priority 1: robotics hints strongly indicate robotics-project even if language is js/python
  if (roboticsHints.length >= 1) {
    return {
      modelId: 'robotics-project',
      template: LIFECYCLE_TEMPLATES['robotics-project'],
      reason: `Robotics hints: ${roboticsHints.join(', ')}`,
      confidence: roboticsHints.length >= 2 ? 'high' : 'medium',
      hints: { roboticsHints, automationHints },
    };
  }

  // Priority 2: automation hints if no strong software framework
  if (automationHints.length >= 2 && frameworks.length === 0 && ['unknown','shell','python'].includes(languages.primary)) {
    return {
      modelId: 'automation-project',
      template: LIFECYCLE_TEMPLATES['automation-project'],
      reason: `Automation hints: ${automationHints.join(', ')}; no web framework`,
      confidence: 'medium',
      hints: { roboticsHints, automationHints },
    };
  }
  if (automationHints.length >= 3) {
    return {
      modelId: 'automation-project',
      template: LIFECYCLE_TEMPLATES['automation-project'],
      reason: `Strong automation signals: ${automationHints.join(', ')}`,
      confidence: 'medium',
      hints: { roboticsHints, automationHints },
    };
  }

  // Software selection based on projectInfo.projectType and frameworks/languages
  const pt = projectInfo?.projectType || 'unknown';
  // Map projectType to template
  const mapping = {
    'web-saas-nextjs': 'web-saas',
    'web-saas-nestjs': 'web-saas',
    'web-api': 'web-api',
    'web-frontend': 'web-saas',
    'python-service': 'python-service',
    'go-service': 'go-service',
    'rust-service': 'javascript-project', // generic fallback until rust template added
    'fullstack': 'fullstack',
    'javascript-project': 'javascript-project',
    'typescript-project': 'javascript-project',
    'unknown': 'javascript-project',
  };
  // Framework-specific override
  if (frameworks.includes('next.js') || frameworks.includes('nestjs')) {
    return { modelId: 'web-saas', template: LIFECYCLE_TEMPLATES['web-saas'], reason: `Framework ${frameworks.join(', ')} → web-saas`, confidence: 'high', hints: { roboticsHints, automationHints } };
  }
  if (frameworks.includes('express') || frameworks.includes('fastify')) {
    return { modelId: 'web-api', template: LIFECYCLE_TEMPLATES['web-api'], reason: `Framework ${frameworks.join(', ')} → web-api`, confidence: 'high', hints: { roboticsHints, automationHints } };
  }
  if (pt.includes('python')) {
    return { modelId: 'python-service', template: LIFECYCLE_TEMPLATES['python-service'], reason: `projectType ${pt} → python-service`, confidence: 'high', hints: { roboticsHints, automationHints } };
  }
  if (pt.includes('go')) {
    return { modelId: 'go-service', template: LIFECYCLE_TEMPLATES['go-service'], reason: `projectType ${pt} → go-service`, confidence: 'high', hints: { roboticsHints, automationHints } };
  }
  const mapped = mapping[pt] || 'javascript-project';
  const template = LIFECYCLE_TEMPLATES[mapped] || LIFECYCLE_TEMPLATES['javascript-project'];
  return {
    modelId: mapped,
    template,
    reason: `projectType ${pt} mapped to ${mapped} (primary: ${languages.primary}, frameworks: ${frameworks.join(', ')||'none'})`,
    confidence: pt === 'unknown' ? 'low' : 'medium',
    hints: { roboticsHints, automationHints },
  };
}

export function listAvailableTemplates() {
  return Object.values(LIFECYCLE_TEMPLATES).map(t => ({ id: t.id, name: t.name, category: t.category, description: t.description, phases: t.phases.map(p=>p.id) }));
}
