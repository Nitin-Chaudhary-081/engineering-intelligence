/**
 * Engineering Store — handles .engineering directory I/O, atomic writes, and schema defaults
 * @module store
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import { ENGINEERING_DIR, MANIFEST_VERSION } from './constants.js';

export class Store {
  constructor(rootDir) {
    this.rootDir = path.resolve(rootDir);
    this.engDir = path.join(this.rootDir, ENGINEERING_DIR);
  }

  // ---- low-level helpers ----
  exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

  ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

  readYaml(filePath, fallback = null) {
    const full = path.join(this.engDir, filePath);
    if (!this.exists(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8');
    if (!raw.trim()) return fallback;
    return yaml.load(raw);
  }

  writeYaml(filePath, data) {
    const full = path.join(this.engDir, filePath);
    this.ensureDir(path.dirname(full));
    const tmp = full + '.tmp.' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, yaml.dump(data, { noRefs: true, lineWidth: 100 }), 'utf8');
    fs.renameSync(tmp, full);
  }

  readJson(filePath, fallback = null) {
    const full = path.join(this.engDir, filePath);
    if (!this.exists(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  }

  writeJson(filePath, data) {
    const full = path.join(this.engDir, filePath);
    this.ensureDir(path.dirname(full));
    const tmp = full + '.tmp.' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, full);
  }

  appendJsonl(filePath, obj) {
    const full = path.join(this.engDir, filePath);
    this.ensureDir(path.dirname(full));
    fs.appendFileSync(full, JSON.stringify(obj) + '\n', 'utf8');
  }

  readJsonl(filePath) {
    const full = path.join(this.engDir, filePath);
    if (!this.exists(full)) return [];
    const lines = fs.readFileSync(full, 'utf8').split('\n').filter(Boolean);
    return lines.map(l => JSON.parse(l));
  }

  listYaml(dir) {
    const full = path.join(this.engDir, dir);
    if (!this.exists(full)) return [];
    return fs.readdirSync(full).filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).map(f => path.join(dir, f));
  }

  hashFile(relPath) {
    const full = path.join(this.rootDir, relPath);
    if (!this.exists(full)) return null;
    const buf = fs.readFileSync(full);
    return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  }

  // ---- high-level state ----
  isInitialized() { return this.exists(path.join(this.engDir, 'manifest.yaml')); }

  getManifest() { return this.readYaml('manifest.yaml', null); }

  initManifest({ projectName, projectType, description }) {
    const now = new Date().toISOString();
    const manifest = {
      schemaVersion: MANIFEST_VERSION,
      projectName: projectName || path.basename(this.rootDir),
      projectType: projectType || 'unknown',
      description: description || '',
      created: now,
      updated: now,
      engineeringStateVersion: 1,
      evidencePolicy: 'evidence_required',
    };
    this.writeYaml('manifest.yaml', manifest);
    return manifest;
  }

  touchManifest() {
    const m = this.getManifest();
    if (m) { m.updated = new Date().toISOString(); this.writeYaml('manifest.yaml', m); }
  }

  // Project
  getProject() { return this.readYaml('project.yaml', null); }
  setProject(data) { this.writeYaml('project.yaml', data); }

  // Requirements
  listRequirements() { return this.listYaml('requirements').map(f => ({ file: f, data: this.readYaml(f) })); }
  getRequirement(id) { return this.readYaml(`requirements/${id}.yaml`, null); }
  setRequirement(id, data) { this.writeYaml(`requirements/${id}.yaml`, data); }

  // Components
  listComponents() { return this.listYaml('components').map(f => ({ file: f, data: this.readYaml(f) })); }
  setComponent(id, data) { this.writeYaml(`components/${id}.yaml`, data); }

  // Architecture
  getArchitecture() { return this.readYaml('architecture/graph.yaml', null); }
  setArchitecture(data) { this.writeYaml('architecture/graph.yaml', data); }
  getDataflow() { return this.readYaml('architecture/dataflow.yaml', null); }
  setDataflow(data) { this.writeYaml('architecture/dataflow.yaml', data); }

  // Decisions
  listDecisions() { return this.listYaml('decisions').map(f => ({ file: f, data: this.readYaml(f) })); }
  setDecision(id, data) { this.writeYaml(`decisions/${id}.yaml`, data); }

  // Research
  listResearch() { return this.listYaml('research').map(f => ({ file: f, data: this.readYaml(f) })); }
  setResearch(id, data) { this.writeYaml(`research/${id}.yaml`, data); }

  // Security
  getSecurity() { return this.readYaml('security/controls.yaml', null); }
  setSecurity(data) { this.writeYaml('security/controls.yaml', data); }

  // Contracts
  getContracts() { return this.readYaml('contracts/invariants.yaml', null); }
  setContracts(data) { this.writeYaml('contracts/invariants.yaml', data); }

  // Mistakes
  listMistakes() { return this.listYaml('mistakes').map(f => ({ file: f, data: this.readYaml(f) })); }
  setMistake(id, data) { this.writeYaml(`mistakes/${id}.yaml`, data); }

  // Evidence
  getEvidence() { return this.readYaml('evidence.yaml', null); }
  setEvidence(data) { this.writeYaml('evidence.yaml', data); }

  // Runtime
  getRuntime() { return this.readYaml('runtime/observations.yaml', null); }
  setRuntime(data) { this.writeYaml('runtime/observations.yaml', data); }

  // Progress
  getProgress() { return this.readYaml('progress/completeness.yaml', null); }
  setProgress(data) { this.writeYaml('progress/completeness.yaml', data); }

  // Handoff
  getHandoff() { return this.readYaml('handoff.yaml', null); }
  setHandoff(data) { this.writeYaml('handoff.yaml', data); }

  // Lifecycle (b.md: project lifecycle/state file)
  getLifecycle() { return this.readYaml('lifecycle.yaml', null); }
  setLifecycle(data) { this.writeYaml('lifecycle.yaml', data); }

  // Events
  appendEvent(evt) { this.appendJsonl('events/events.jsonl', { timestamp: new Date().toISOString(), ...evt }); }
  getEvents(limit = 100) { const all = this.readJsonl('events/events.jsonl'); return all.slice(-limit); }

  // Context levels
  getContext() { return this.readYaml('context/levels.yaml', null); }
  setContext(data) { this.writeYaml('context/levels.yaml', data); }

  // Snapshots
  createSnapshot(name, data) { this.writeJson(`snapshots/${name}.json`, data); }

  // Ensure base structure
  ensureBaseStructure() {
    const dirs = [
      'requirements',
      'architecture',
      'components',
      'decisions',
      'contracts',
      'research',
      'security',
      'runtime',
      'progress',
      'events',
      'snapshots',
      'context',
      'impact',
      'mistakes',
    ];
    for (const d of dirs) this.ensureDir(path.join(this.engDir, d));
    if (!this.exists(path.join(this.engDir, '.gitkeep'))) {
      // no-op
    }
  }
}

export function findEngineeringRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, ENGINEERING_DIR, 'manifest.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
