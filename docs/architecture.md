# Architecture

## Overview

Engineering Intelligence is a local-first, evidence-driven state layer that sits beside your repository. It does not require cloud services, vector DBs, or a specific LLM.

```
Claude Skill ──┐
Codex Skill ───┼──> Universal Protocol  ──>  .engineering/ (YAML + JSONL)
OpenCode Skill ┘            │
                            ▼
                    Architecture Graph (File → Component → Requirement → Evidence)
```

Core principle: **Documentation is NOT truth.** Every claim links to evidence (code, git, test, runtime, research) and carries a verification state.

## Components

- **CLI** (`bin/engineering.js`): Node.js, zero build, `js-yaml` only dep. Handles `init/status/explain/architecture/impact/verify/security/progress/handoff/sync/*`
- **Store** (`src/lib/store.js`): Atomic YAML/JSONL I/O for `.engineering/`
- **Project Analyzer** (`src/lib/project-analyzer.js`): Detects languages, frameworks, PMs, entry points, config, git, env vars
- **Graph** (`src/lib/graph.js`): Builds file index (hash, size), extracts imports via regex (JS/TS/Python), deduplicates edges, supports `impactAnalysis` (BFS) and cycle detection
- **Evidence** (`src/lib/evidence.js`): `FACT/INFERENCE/ASSUMPTION` + `assessClaim()` → `VERIFIED/IMPLEMENTED/UNKNOWN/...`
- **Progress** (`src/lib/progress.js`): Weighted multi-dimensional completeness (12 dims) → engineeringCompleteness + productionReadiness, evidence-capped to avoid fake precision
- **Security** (`src/lib/security.js`): Static secret patterns + control checks (auth/injection/secrets/validation), marked `UNKNOWN` until verified
- **Risk** (`src/lib/risk.js`): Classifies `TRIVIAL..CRITICAL`, indicates if research required
- **Verify** (`src/lib/verify.js`): Cross-checks declared files vs disk, detects `CONFLICTING`/`STALE`/`UNKNOWN`
- **Complexity** (`src/lib/complexity.js`): Heuristic duplicate-file, large-file, many-deps checks
- **Handoff** (`src/lib/handoff.js`): Compact YAML+MD transfer pack for next agent (project, objective, arch, completed/incomplete, decisions, invariants, security, runtime, recentChanges, nextActions)
- **Context** (`src/lib/context.js`): Levels 0–6 (30s summary → full source) for small-context models
- **Events/Git/Runtime/Contracts/Research**: Append JSONL, git status/log/diff, invariant checks

## .engineering Storage

```
.engineering/
  manifest.yaml          # schemaVersion, projectName/Type, created/updated
  project.yaml           # languages/frameworks/deps/structure/git
  requirements/*.yaml    # id, title, status, evidence[], files[], risk
  architecture/
    graph.yaml           # nodes[], edges[]
    dataflow.yaml        # flows[] (INFERRED)
  components/*.yaml      # component registry
  decisions/*.yaml       # ADR with reason, alternatives, tradeoffs, research, confidence
  contracts/invariants.yaml
  research/*.yaml        # sources[] with FACT/INFERENCE distinction
  security/controls.yaml # findings[] with status+evidence
  runtime/observations.yaml
  progress/completeness.yaml
  events/events.jsonl    # append-only
  context/levels.yaml
  handoff.yaml + handoff.md
  evidence.yaml
  snapshots/
  impact/  (cache)
  mistakes/*.yaml
```

- Atomic writes via temp+rename
- SHA256 (truncated) for file identity
- Git-friendly: one file per entity, no binary

## Sync & Performance

- Incremental: `hash` + `mtime` could be added for large repos (currently full rescan but capped at 5000 files)
- `engineering sync` re-runs analyzer + graph, updates context/handoff
- Avoids unnecessary model calls; state is the ground truth

## Verification States

`VERIFIED | IMPLEMENTED | PARTIALLY_IMPLEMENTED | NOT_IMPLEMENTED | FAILED | UNKNOWN | ASSUMED | INFERRED | STALE | CONFLICTING` — `UNKNOWN` is first-class.

## Relationships

`depends_on, implements, calls, imports, reads, writes, produces, consumes, tested_by, protected_by, configured_by, deployed_by, derived_from, affects, contradicts, replaces`

Graph supports `impactAnalysis(target)` → direct+transitive dependents/dependencies.

## Security Model

Each control has `claim + evidence[] + status`. Example: "SQL injection protection exists" → needs parameterized-query evidence + security test to be `VERIFIED`, otherwise `UNKNOWN`. Never mark security as implemented from docs alone.

## Design Decisions

- Node.js CLI (no compile) for portability across agents; `js-yaml` only dep to keep install simple (vs Python which agents may not have)
- YAML for human readability + Git diffs; JSONL for events
- Regex-based import extraction (not full AST) for MVP — marked `INFERRED`; future: tree-sitter
- Weighted completeness avoids `Feature X = 100%` single metric
