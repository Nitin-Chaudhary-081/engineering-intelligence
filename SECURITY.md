# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Reporting a vulnerability

Do not open a public issue. Email maintainers or use GitHub private reporting.

Include:

- Description, impact, reproduction
- Affected files/commit
- Suggested fix if known

We aim to respond within 3 business days.

## Security model (this project)

- Local-first, no external upload; no API keys in `.engineering/`
- Controls tracked in `.engineering/security/controls.yaml`, evidence-backed
- `engineering security` runs static checks (auth/injection/secrets/validation) — `UNKNOWN` until verified, not assumed
- Invariants in `.engineering/contracts/invariants.yaml` (secrets never committed, passwords never logged, tenant isolation, etc.)
- Run `engineering verify` to detect stale/conflicting security claims

## Secret handling

- `.gitignore` excludes `.env`, `*.key`, `*.pem`, `secrets.yaml`
- Store references/metadata, not secret contents, in `.engineering/`
- CI should run secret scanning (e.g., gitleaks)

## Dependency security

- Run `npm audit` before release; record in `security/controls.yaml` with evidence
- Keep `js-yaml` updated
