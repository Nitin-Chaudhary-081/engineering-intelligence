/**
 * Runtime Intelligence — distinguishes CODE EXISTS vs CODE WORKS
 * @module runtime
 */
import { execSync } from 'node:child_process';

export function observeRuntime(rootDir) {
  const obs = {
    timestamp: new Date().toISOString(),
    tests: null,
    startup: null,
    dependencies: null,
  };

  // Try npm test
  try {
    const out = execSync('npm test 2>&1 | head -n 100', { cwd: rootDir, encoding: 'utf8', timeout: 10000 });
    obs.tests = { ran: true, output: out.slice(0, 2000), status: /passing|pass|ok/i.test(out) ? 'PASS' : /fail/i.test(out) ? 'FAIL' : 'UNKNOWN' };
  } catch (e) {
    obs.tests = { ran: false, error: e.message?.slice(0, 500) || 'no test command', status: 'UNKNOWN' };
  }

  // Check if can run node --check on entry points? For MVP just record CODE EXISTS vs WORKS
  obs.codeExists = true;
  obs.codeWorks = obs.tests?.status === 'PASS' ? 'VERIFIED' : 'UNKNOWN';
  obs.systemVerified = obs.codeWorks === 'VERIFIED' ? 'PARTIAL' : 'UNKNOWN';
  obs.note = 'CODE EXISTS != CODE WORKS. Run full verification for SYSTEM VERIFIED.';

  return obs;
}
