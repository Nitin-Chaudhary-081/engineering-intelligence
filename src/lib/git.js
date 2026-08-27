/**
 * Git Integration
 * @module git
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function gitStatus(rootDir) {
  try {
    const porcelain = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    return { porcelain: porcelain.split('\n').filter(Boolean), branch, commit, dirty: porcelain.length > 0 };
  } catch {
    return { porcelain: [], branch: 'unknown', commit: 'unknown', dirty: false, error: 'not a git repo' };
  }
}

export function gitDiffStat(rootDir, base = 'HEAD') {
  try {
    const out = execSync(`git diff --stat ${base}`, { cwd: rootDir, encoding: 'utf8' }).trim();
    const nameOnly = execSync(`git diff --name-only ${base}`, { cwd: rootDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return { stat: out, files: nameOnly };
  } catch {
    return { stat: '', files: [] };
  }
}

export function gitLog(rootDir, n = 20) {
  try {
    const out = execSync(`git log --oneline -${n} --pretty=format:"%h %s %ad" --date=short`, { cwd: rootDir, encoding: 'utf8' }).trim();
    return out.split('\n').filter(Boolean).map(l => {
      const [hash, ...rest] = l.split(' ');
      return { hash, message: rest.join(' ') };
    });
  } catch {
    return [];
  }
}

export function detectStaleState(rootDir, engDir) {
  // Check if code changed but .engineering not updated
  try {
    const engFiles = execSync(`git diff --name-only HEAD -- ${engDir}`, { cwd: rootDir, encoding: 'utf8' }).trim();
    const codeDiff = execSync('git diff --name-only HEAD', { cwd: rootDir, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const codeChanged = codeDiff.filter(f => !f.startsWith(engDir) && !f.startsWith('.git'));
    const engChanged = engFiles.length > 0;
    if (codeChanged.length > 0 && !engChanged) {
      return { stale: true, reason: `Code changed (${codeChanged.length} files) but .engineering not updated`, files: codeChanged };
    }
    return { stale: false };
  } catch {
    return { stale: false, reason: 'git not available' };
  }
}

export function linkCommitToRequirement(commitMessage) {
  const match = commitMessage.match(/(R-[0-9]+|REQ-[0-9]+)/g);
  return match || [];
}
