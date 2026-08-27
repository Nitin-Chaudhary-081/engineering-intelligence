# Changelog

All notable changes to this project will be documented in this file. Format based on Keep a Changelog, versioning via SemVer.

## [0.1.0] - 2026-08-27

### Added
- Initial MVP: `/engineering` skill (agentskills.io) for Claude Code, Codex, OpenCode
- CLI `bin/engineering.js` with commands: init, status, explain, architecture, impact, verify, security, progress, handoff, sync, events, complexity, runtime, context, research, git
- `.engineering/` portable state: manifest, project.yaml, requirements, architecture graph (import regex), dataflow stub, decisions, contracts/invariants, research, security, runtime, progress, events (JSONL), context levels 0-6, handoff (yaml+md), evidence
- Evidence model: VERIFIED/IMPLEMENTED/UNKNOWN/... with FACT/INFERENCE distinction; prefers UNKNOWN over hallucination
- Progress: 12-dimension weighted scoring → engineeringCompleteness + productionReadiness
- Security: static audit (auth, injection, secrets, validation) evidence-backed
- Risk classification TRIVIAL..CRITICAL + research trigger
- Impact analysis (BFS on graph) + cycle detection
- Hierarchical context for large repos
- Git integration (status/log/diff, stale detection), event tracking, complexity gate
- Docs: README, architecture, protocol, installation, schemas
- Dogfooded on self (`.engineering/` initialized)

### Known limitations (NOT_IMPLEMENTED)
- AST parsing limited to regex (INFERRED)
- No incremental hash cache (full rescan, 5k cap)
- No MCP server wrapper (CLI is MCP-ready)
- No vulnerability DB integration
