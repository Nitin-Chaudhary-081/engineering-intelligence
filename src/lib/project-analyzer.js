/**
 * Project Analyzer — reconstructs project understanding from repo evidence
 * Inspects languages, frameworks, dependencies, config, git history, etc.
 * @module project-analyzer
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const LANGUAGE_MAP = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.tsx': 'typescript', '.jsx': 'javascript',
  '.py': 'python', '.pyi': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp', '.cc': 'cpp', '.c': 'c', '.h': 'c',
  '.swift': 'swift', '.kt': 'kotlin',
  '.sh': 'shell', '.bash': 'shell',
  '.yaml': 'yaml', '.yml': 'yaml', '.json': 'json', '.toml': 'toml',
  '.md': 'markdown', '.sql': 'sql',
};

const FRAMEWORK_HINTS = [
  { file: 'package.json', check: (j) => j.dependencies?.next || j.devDependencies?.next, name: 'next.js' },
  { file: 'package.json', check: (j) => j.dependencies?.react || j.devDependencies?.react, name: 'react' },
  { file: 'package.json', check: (j) => j.dependencies?.vue, name: 'vue' },
  { file: 'package.json', check: (j) => j.dependencies?.express, name: 'express' },
  { file: 'package.json', check: (j) => j.dependencies?.fastify, name: 'fastify' },
  { file: 'package.json', check: (j) => j.dependencies?.['@nestjs/core'], name: 'nestjs' },
  { file: 'requirements.txt', check: () => true, name: 'python-requirements' },
  { file: 'pyproject.toml', check: () => true, name: 'python-pyproject' },
  { file: 'Cargo.toml', check: () => true, name: 'rust-cargo' },
  { file: 'go.mod', check: () => true, name: 'go-modules' },
  { file: 'Gemfile', check: () => true, name: 'ruby-bundler' },
  { file: 'pom.xml', check: () => true, name: 'maven' },
  { file: 'build.gradle', check: () => true, name: 'gradle' },
];

export function detectLanguages(rootDir, limit = 5000) {
  const counts = {};
  let total = 0;
  const ignoreDirs = new Set(['node_modules', '.git', '.engineering', 'dist', 'build', '.next', 'vendor', '__pycache__', '.venv', 'coverage']);
  function walk(dir) {
    if (total > limit) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (total > limit) break;
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(path.join(dir, entry.name));
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const lang = LANGUAGE_MAP[ext];
        if (lang) { counts[lang] = (counts[lang] || 0) + 1; total++; }
      }
    }
  }
  try { walk(rootDir); } catch {}
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return { counts, primary: sorted[0]?.[0] || 'unknown', totalFiles: total };
}

export function detectFrameworks(rootDir) {
  const found = [];
  for (const hint of FRAMEWORK_HINTS) {
    const fp = path.join(rootDir, hint.file);
    if (!fs.existsSync(fp)) continue;
    try {
      if (hint.file.endsWith('.json')) {
        const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
        if (hint.check(j)) found.push(hint.name);
      } else {
        if (hint.check(null)) found.push(hint.name);
      }
    } catch {}
  }
  return [...new Set(found)];
}

export function detectPackageManagers(rootDir) {
  const pms = [];
  if (fs.existsSync(path.join(rootDir, 'package.json'))) {
    if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) pms.push('pnpm');
    else if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) pms.push('yarn');
    else if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) pms.push('npm');
    else if (fs.existsSync(path.join(rootDir, 'bun.lockb'))) pms.push('bun');
    else pms.push('npm');
  }
  if (fs.existsSync(path.join(rootDir, 'requirements.txt')) || fs.existsSync(path.join(rootDir, 'pyproject.toml')) || fs.existsSync(path.join(rootDir, 'Pipfile'))) pms.push('python');
  if (fs.existsSync(path.join(rootDir, 'Cargo.toml'))) pms.push('cargo');
  if (fs.existsSync(path.join(rootDir, 'go.mod'))) pms.push('go');
  return pms;
}

export function detectEntryPoints(rootDir) {
  const candidates = ['src/index.js', 'src/index.ts', 'src/main.js', 'src/main.ts', 'index.js', 'index.ts', 'app.js', 'app.py', 'main.py', 'main.go', 'cmd/main.go'];
  return candidates.filter(c => fs.existsSync(path.join(rootDir, c)));
}

export function detectConfig(rootDir) {
  const configs = [];
  const patterns = ['.env', '.env.example', 'docker-compose.yml', 'Dockerfile', '.gitignore', 'tsconfig.json', 'eslint.config.js', '.eslintrc', 'jest.config.js', 'vite.config.js', 'next.config.js', 'pyproject.toml', 'Makefile'];
  for (const p of patterns) if (fs.existsSync(path.join(rootDir, p))) configs.push(p);
  return configs;
}

export function getGitInfo(rootDir) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const log = execSync('git log --oneline -10', { cwd: rootDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const status = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' }).trim();
    return { branch, commit, log, dirty: status.length > 0, status: status.split('\n').filter(Boolean) };
  } catch {
    return { branch: 'unknown', commit: 'unknown', log: [], dirty: false, status: [] };
  }
}

export function getEnvVars(rootDir) {
  const envFiles = ['.env', '.env.example'];
  const vars = [];
  for (const f of envFiles) {
    const fp = path.join(rootDir, f);
    if (!fs.existsSync(fp)) continue;
    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
      if (m) vars.push(m[1]);
    }
  }
  return [...new Set(vars)];
}

export function inferProjectType(languages, frameworks, files) {
  // Robotics hints (b.md: automation/robotics project types) — priority before generic software
  const hasRos = files.includes('package.xml') || files.includes('platformio.ini') || files.some(f => f.endsWith('.urdf') || f.endsWith('.ino'));
  if (hasRos) return 'robotics-project';
  const hasAutomation = files.includes('Makefile') || files.includes('Dockerfile') || files.includes('docker-compose.yml') || files.includes('docker-compose.yaml') || files.includes('Jenkinsfile');
  const hasWorkflows = files.includes('.github');
  if (hasAutomation && frameworks.length === 0 && ['unknown','shell','python','javascript'].includes(languages.primary)) {
    if (languages.primary !== 'python' || !files.includes('requirements.txt')) return 'automation-project';
  }
  if (hasWorkflows && frameworks.length === 0 && !files.includes('package.json') && !files.includes('pyproject.toml')) {
    return 'automation-project';
  }
  if (frameworks.includes('next.js')) return 'web-saas-nextjs';
  if (frameworks.includes('nestjs')) return 'web-saas-nestjs';
  if (frameworks.includes('express') || frameworks.includes('fastify')) return 'web-api';
  if (frameworks.includes('react') || frameworks.includes('vue')) return 'web-frontend';
  if (languages.primary === 'python' && frameworks.length === 0) {
    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) return 'python-service';
  }
  if (languages.primary === 'go') return 'go-service';
  if (languages.primary === 'rust') return 'rust-service';
  if (languages.counts['python'] && languages.counts['javascript']) return 'fullstack';
  if (languages.primary !== 'unknown') return `${languages.primary}-project`;
  return 'unknown';
}

export function analyzeProject(rootDir) {
  const languages = detectLanguages(rootDir);
  const frameworks = detectFrameworks(rootDir);
  const packageManagers = detectPackageManagers(rootDir);
  const entryPoints = detectEntryPoints(rootDir);
  const config = detectConfig(rootDir);
  const git = getGitInfo(rootDir);
  const envVars = getEnvVars(rootDir);
  const topFiles = fs.readdirSync(rootDir).filter(f => !f.startsWith('.')).slice(0, 30);
  const projectType = inferProjectType(languages, frameworks, topFiles);

  // dependencies
  let dependencies = {};
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {}
  }

  // directory structure
  const structure = [];
  try {
    for (const e of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') structure.push(e.name + '/');
      else if (e.isFile() && !e.name.startsWith('.')) structure.push(e.name);
    }
  } catch {}

  return {
    languages,
    frameworks,
    packageManagers,
    entryPoints,
    config,
    git,
    envVars,
    dependencies,
    structure,
    projectType,
    analyzedAt: new Date().toISOString(),
  };
}
