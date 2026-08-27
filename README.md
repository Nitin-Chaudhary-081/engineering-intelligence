# Engineering Intelligence

**Persistent engineering-state layer for AI coding agents.**

> AI can write code fast. Humans and the next AI often cannot understand what was built, why, how it works, what remains, what assumptions were made, what security actually exists, what changed, what broke, and what will be affected next.

Engineering Intelligence solves this with a portable, evidence-driven layer inside your repository that survives across humans, models, and agents.

- **One directory:** `.engineering/` travels with `git clone`
- **One skill:** `/engineering` works in Claude Code, Codex, OpenCode, and future agents (agentskills.io)
- **One principle:** *Documentation is NOT truth.* Every claim links to evidence (`VERIFIED` vs `UNKNOWN`).

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Node >=18](https://img.shields.io/badge/node-%3E%3D18-green) ![Evidence: Required](https://img.shields.io/badge/evidence-required-blue)

## Why it exists

- AI commits look complete but miss tests, security, runtime verification
- Docs drift from code; next agent re-learns from scratch
- No trace from requirement → architecture → file → test → evidence
- Impact of deleting `AuthService` is unknown until production breaks

This skill makes the project **understandable, traceable, verifiable, explainable, transferable**.

## How it works

```
User: "Explain this project"
  ↓ skill loads .engineering/project.yaml + architecture/graph.yaml
  ↓ CLI runs static analysis if needed
  ↓ returns Level 1 (architecture) in ~1000 tokens
  ↓ deeper levels on demand (hierarchical context)
```

- **Agent → CLI → .engineering → Git/code/tests/runtime evidence**
- **Hierarchical context** (levels 0–6: 30s summary → full source) lets small-context models work on large repos
- **Graph** (`File → Function → Dependency → Test → Evidence`) supports impact analysis: `engineering impact src/auth/service.ts`

## Installation

```bash
# 1. get the skill
git clone https://github.com/example/engineering-intelligence
cd engineering-intelligence && npm install

# 2. use in any project
cd your-project
node /path/to/engineering-intelligence/bin/engineering.js init
node /path/to/engineering-intelligence/bin/engineering.js status
```

**Agent-specific** (see [docs/installation.md](docs/installation.md)):

```bash
# Claude Code (project)
mkdir -p .claude/skills/engineering && cp skills/engineering/SKILL.md .claude/skills/engineering/SKILL.md
# Codex
mkdir -p .agents/skills/engineering && cp skills/engineering/SKILL.md .agents/skills/engineering/SKILL.md
# OpenCode
mkdir -p .opencode/skills/engineering && cp skills/engineering/SKILL.md .opencode/skills/engineering/SKILL.md
```

Then `/engineering` or natural language: *"What has AI actually built? What remains?"*

## Commands

| Command | Purpose |
|---------|---------|
| `engineering init` | Initialize `.engineering/` (analyzes languages, frameworks, graph) |
| `engineering status` | State summary: reqs, graph, security, progress |
| `engineering explain [--level 30s|5min|developer|senior|machine] [--file path]` | Multi-level human + machine explanations |
| `engineering architecture [--impact <file>]` | Graph + dataflow + cycles |
| `engineering impact <file>` | Direct+transitive dependents, tests/APIs/security affected |
| `engineering verify` | Cross-check claims vs evidence; highlights `UNKNOWN`/`CONFLICTING` |
| `engineering security` | Evidence-backed audit (auth, injection, secrets, validation, deps) |
| `engineering progress` | Multi-dim completeness: 12 dims → eng % + prod readiness, explainable |
| `engineering handoff [--md]` | Compact AI-to-AI pack (objective, arch, completed/incomplete, decisions, risks, next actions) |
| `engineering sync` | Re-analyze codebase incrementally |
| `engineering complexity` | Duplication, large files, many deps |
| `engineering runtime` | Capture `CODE EXISTS` vs `CODE WORKS` vs `SYSTEM VERIFIED` |
| `engineering events` | Recent engineering events |
| `engineering context --level 0..6` | Hierarchical context slice |
| `engineering research <topic>` | Record research with `FACT/INFERENCE/ASSUMPTION` |

## .engineering Structure

```
.engineering/
├── manifest.yaml           # projectName, type, created/updated, evidencePolicy
├── project.yaml            # languages, frameworks, PMs, entryPoints, structure, git, envVars
├── requirements/
│   └── R-001.yaml          # id, title, status (VERIFIED/UNKNOWN...), evidence[], files[], risk
├── architecture/
│   ├── graph.yaml          # nodes[] (File/Component), edges[] (depends_on/imports...)
│   └── dataflow.yaml       # flows
├── components/
├── decisions/              # ADR: reason, alternatives, tradeoffs, research, confidence
├── contracts/invariants.yaml
├── research/
├── security/controls.yaml  # findings[] with evidence
├── runtime/observations.yaml
├── progress/completeness.yaml
├── events/events.jsonl     # append-only
├── context/levels.yaml     # 0:30s → 6:source
├── handoff.yaml + handoff.md
├── evidence.yaml
├── snapshots/
└── mistakes/               # failed approaches — do not repeat
```

All YAML is Git-friendly (one file per entity, atomic tmp+rename, SHA hashes).

## Evidence Model

```yaml
status: VERIFIED   # needs CODE+TEST/RUNTIME FACT
status: UNKNOWN    # no evidence — "Unknown; verification evidence does not exist."
```

Prefer `UNKNOWN` over hallucination. Security claim with only docs evidence stays `UNKNOWN`.

Example decision:

```yaml
id: ADR-001
title: Use PostgreSQL
reason: JSONB, reliability
alternatives: MySQL, SQLite
tradeoffs: Heavier ops vs richer queries
research: [{url: https://..., kind: FACT}]
evidence: [{type: CODE, source: schema.sql, kind: FACT}]
confidence: high
```

## Progress Model

Not `Feature X = 100%`. Instead 12 dimensions weighted:

```
requirements 100%  research 60%  architecture 80%  implementation 92%
integration 50%    testing 40%    security 60%      runtime 30%
documentation 70%  observability 20% deployment 20% performance 20%

Engineering completeness 52% (weighted)  Production readiness 38%
```

Every % explainable; evidence-capped to avoid fake precision.

## Security Model

First-class. Controls: auth, injection, secrets, validation, deps, etc. Each:

```yaml
- id: SEC-SECRETS-001
  claim: Secrets not committed
  status: FAILED  # or VERIFIED/UNKNOWN
  evidence: [{type: CODE, source: src/auth.js, kind: FACT}]
```

Run `engineering security` to refresh; `verify` cross-checks.

## Impact Analysis

```bash
engineering impact src/payments/service.ts
# → direct dependents: src/api/checkout.ts
# → transitive: src/web/CheckoutPage.tsx (7 more)
# → checklist: tests, APIs, DB, security, config
```

Uses static import graph (INFERRED until runtime verified).

## Hierarchical Context

| Level | Name | Use |
|-------|------|-----|
|0|30s summary|~300 tokens|
|1|Architecture|~1000|
|2|Subsystem|~2000|
|3|Component|~4000|
|4|File summaries|~8000|
|5|Function details|~16000|
|6|Full source|full|

`engineering context --level 1` for planning without loading repo.

## Examples

```bash
engineering explain --level 30s
# → "Engineering Intelligence is a ... 12 files, node, express..."

engineering verify
# ❓ R-002: OAuth [UNKNOWN] — Unknown; verification evidence does not exist.
# ✅ R-001: CLI exists [VERIFIED] — factual code evidence

engineering handoff --md > HANDOFF.md
# → give to next agent; it runs `engineering status` + reads handoff.md

engineering research "rate limiting Redis"
# → records sources, distinguishes FACT vs INFERENCE
```

See `examples/` for sample `.engineering/` snapshots.

## Development

```bash
npm test          # node --test
node bin/engineering.js verify
node bin/engineering.js complexity
```

[Architecture](docs/architecture.md) • [Protocol](docs/protocol.md) • [Installation](docs/installation.md) • [CHANGELOG](CHANGELOG.md) • [CONTRIBUTING](CONTRIBUTING.md) • [SECURITY](SECURITY.md)

## Roadmap / Limitations

Implemented now: init, status, explain (levels), graph+impact+cycles, evidence model, risk, research stub, verify, security audit, progress scoring, handoff (yaml+md), hierarchical context, events, git integration, complexity, runtime, dogfooded self-analysis.

`NOT_IMPLEMENTED` (explicit):

- Full AST parsing (currently regex imports → INFERRED)
- Incremental hash/mtime cache for very large repos (full rescan today, capped 5k files)
- Dependency vulnerability DB (needs `npm audit` integration)
- MCP server wrapper (CLI is MCP-ready but no server yet)
- Vector embeddings / semantic search (intentionally avoided for local-first)

See `progress/completeness.yaml` after `init` for honest self-score.

## Contributing

PRs welcome. Keep changes small, evidence-backed, and Git-friendly. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

Built on [agentskills.io](https://agentskills.io) (portable skill spec). Works with Claude Code, Codex, OpenCode. Not affiliated with Anthropic/OpenAI.
