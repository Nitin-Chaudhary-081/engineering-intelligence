# Universal Engineering Protocol

Model-independent, agent-independent.

## Entities

| Entity | File | Key fields |
|--------|------|------------|
| Project | `project.yaml` | languages, frameworks, packageManagers, entryPoints, structure, git, envVars, projectType |
| Requirement | `requirements/R-*.yaml` | id, title, description, status, evidence[], files[], risk |
| Constraint | `requirements` or `contracts` | invariant string, severity |
| Component | `components/*.yaml` | id, name, type, files[], depends_on[], status |
| File | `architecture/graph.yaml` nodes | path, hash, size, language, evidence |
| Function/Class | `context/levels.yaml` level5 | signature, invariant (INFERRED placeholder) |
| Dependency | `project.yaml` dependencies + graph edges | from, to, relationship=depends_on/imports |
| Architecture | `architecture/graph.yaml` | nodes[], edges[] |
| Data Flow | `architecture/dataflow.yaml` | flows: [{from, to, via, evidence}] |
| Decision | `decisions/ADR-*.yaml` | id, title, reason, alternatives, tradeoffs, research, confidence, date |
| Security Control | `security/controls.yaml` findings | id, claim, status, evidence[], note |
| Threat | `security/controls.yaml` | same as control, type=threat |
| Test | `evidence.yaml` or `runtime` | type=TEST, source test file, kind FACT |
| Runtime Observation | `runtime/observations.yaml` | timestamp, tests{status}, startup, codeWorks |
| Evidence | `evidence.yaml` + per-entity evidence[] | type (CODE/TEST/RUNTIME/GIT/COMMAND/RESEARCH...), source, kind (FACT/INFERENCE/ASSUMPTION...), timestamp |
| Event | `events/events.jsonl` | timestamp, type, actor, summary, files[], metadata |
| Risk | inline `risk` field + `research` | level TRIVIAL..CRITICAL |
| Failure/Mistake | `mistakes/*.yaml` | problem, attempt, rootCause, resolution, doNotRepeat, evidence |
| Invariant/Contract | `contracts/invariants.yaml` | id, invariant, severity |
| Progress | `progress/completeness.yaml` | breakdown{dim:{value, weight, evidenceCount, status}}, engineeringCompleteness, productionReadiness, explanation |
| Handoff | `handoff.yaml` + `handoff.md` | project, objective, arch, completed/incomplete, bugs, decisions, constraints, security, runtime, recentChanges, unverifiedAssumptions, conflicts, risks, nextActions |

## Schemas

See `src/schemas/*.schema.json` — JSON Schema draft-07 for manifest, requirement, architecture. Others follow similar pattern: `id` + `status` + `evidence[]`.

## Evidence Rules

- Every `status` needs `evidence[]` unless `UNKNOWN`
- `VERIFIED` requires `FACT` with `CODE`/`TEST`/`RUNTIME`
- `UNKNOWN` when `evidence.length===0` → "Unknown; verification evidence does not exist."
- Security claims with only `DOCUMENTATION` evidence stay `UNKNOWN`

## Verification

`engineering verify` cross-checks:
- Declared `files[]` exist on disk
- `VERIFIED` without test/runtime → downgrade or warn
- Duplicate IDs, projectType mismatch → `CONFLICTING`

## Handoff Compactness

Machine `handoff.yaml` + human `handoff.md` under ~2 pages, not dump. Includes only recent 5 decisions, 10 events, incomplete requirements, failed approaches.

## Versioning

`manifest.schemaVersion` semver. CLI checks compatibility; major bump requires migration.

## Portability

- Clone repo → `.engineering/` travels
- Next agent runs `engineering status` + `handoff` + `explain` to bootstrap, no re-scan from zero
- No cloud, no API keys in `.engineering/`
