/**
 * Contracts & Invariants
 * @module contracts
 */

export const DEFAULT_INVARIANTS = [
  { id: 'INV-001', invariant: 'Secrets must never be committed', severity: 'CRITICAL', check: 'no_secret_in_repo' },
  { id: 'INV-002', invariant: 'Passwords must never be logged', severity: 'CRITICAL', check: 'no_password_logging' },
  { id: 'INV-003', invariant: 'Public APIs must remain backward compatible', severity: 'HIGH', check: 'manual' },
  { id: 'INV-004', invariant: 'Payments must never be processed twice', severity: 'CRITICAL', check: 'idempotency' },
  { id: 'INV-005', invariant: 'Tenant A must never access Tenant B data', severity: 'CRITICAL', check: 'tenant_isolation' },
  { id: 'INV-006', invariant: 'Every database migration must be reversible', severity: 'HIGH', check: 'migration_reversible' },
];

export function checkContracts(invariants, changeDescription, files) {
  const violations = [];
  const text = (changeDescription + ' ' + files.join(' ')).toLowerCase();
  for (const inv of invariants) {
    if (inv.check === 'no_secret_in_repo' && /secret|key|token|password/.test(text) && /commit|add/.test(text)) {
      violations.push({ invariant: inv.id, message: `Potential violation: ${inv.invariant}`, severity: inv.severity });
    }
  }
  return violations;
}
