# Contributing

## Principles

- Evidence over documentation. If you claim it, prove it with code/test/runtime/git.
- `UNKNOWN` is valid — prefer it over hallucination.
- Keep `.engineering/` Git-friendly: one YAML per entity, no secrets.
- Small, incremental, verifiable.

## Setup

```bash
git clone https://github.com/example/engineering-intelligence
cd engineering-intelligence
npm install
node bin/engineering.js init
node bin/engineering.js status
npm test
```

## Workflow (risk-based)

- TRIVIAL/LOW (rename, isolated utility): direct PR
- MEDIUM (new dep): add research note in `research/`, then PR
- HIGH/CRITICAL (auth, payment, DB migration): ADR in `decisions/`, architecture update, security review, then PR

## Adding a requirement

```bash
# edit .engineering/requirements/R-XXX.yaml
status: IMPLEMENTED
evidence:
  - type: CODE
    source: src/lib/foo.js
    kind: FACT
files: [src/lib/foo.js]
```

Then `node bin/engineering.js verify`.

## Code style

- Node >=18, ES modules, no build step
- `js-yaml` only production dep; keep deps minimal
- Atomic writes (tmp+rename), SHA for files
- Add tests in `tests/` (`node --test`)

## PR checklist

- [ ] `npm test` passes
- [ ] `node bin/engineering.js verify` no CONFLICTING
- [ ] `node bin/engineering.js complexity` reviewed
- [ ] `.engineering/` updated (requirements/decisions/events/handoff)
- [ ] No secrets committed (`engineering security`)

## Reporting security issues

See [SECURITY.md](SECURITY.md) — do not open public issue for sensitive vulns.
