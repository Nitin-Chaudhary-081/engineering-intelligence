---
name: engineering
description: Engineering Intelligence — persistent engineering-state layer for AI coding agents. Use when understanding projects, tracking requirements, architecture, security, progress, or handing off between agents. Handles /engineering commands.
license: MIT
compatibility: opencode, claude-code, codex
metadata:
  audience: developers
  workflow: engineering-intelligence
---

# Engineering Intelligence

> Documentation is NOT the source of truth. Code, tests, runtime, and git evidence are.

This skill provides a persistent engineering-state layer that makes repositories understandable, traceable, verifiable, and transferable between humans and AI agents.

## When to use

- Explain this project / architecture / data flow
- What has AI actually built vs what remains
- Why does this file exist? What depends on it?
- What breaks if I delete this?
- Audit security / verify claims
- Track requirements → implementation → tests → evidence
- Generate handoff for another AI
- Find unnecessary complexity / duplication
- Research before significant changes

## Core principle

Engineering-state claims must be backed by evidence:

- `VERIFIED` — code + tests + runtime evidence
- `IMPLEMENTED` — code exists, not yet verified
- `PARTIALLY_IMPLEMENTED` / `NOT_IMPLEMENTED` / `FAILED`
- `UNKNOWN` — legitimate; prefer "Unknown; verification evidence does not exist." over hallucination
- `ASSUMED` / `INFERRED` / `STALE` / `CONFLICTING`

Never claim something is implemented because documentation says so.

## Repository-local state

All state lives in `.engineering/` — portable, Git-friendly, agent-independent.

```
.engineering/
├── manifest.yaml
├── project.yaml
├── requirements/
├── architecture/
│   ├── graph.yaml
│   └── dataflow.yaml
├── components/
├── decisions/
├── contracts/
├── research/
├── security/
├── runtime/
├── progress/
├── events/
├── snapshots/
├── context/
├── impact/
└── mistakes/
```

Use hierarchical context (levels 0–6) to work in large repos without loading everything.

## Commands (via CLI)

The skill delegates to the local CLI at `bin/engineering.js` (or `npx engineering`):

```bash
node bin/engineering.js init                  # initialize .engineering
node bin/engineering.js status                # engineering state summary
node bin/engineering.js explain [--level 30s|5min|developer|senior|machine]
node bin/engineering.js architecture
node bin/engineering.js impact <file>
node bin/engineering.js verify
node bin/engineering.js security
node bin/engineering.js progress
node bin/engineering.js handoff --md
node bin/engineering.js sync                  # re-analyze after changes
node bin/engineering.js events
node bin/engineering.js complexity
node bin/engineering.js runtime
node bin/engineering.js context --level 2
node bin/engineering.js research <topic>
```

If CLI not installed globally, call via `node bin/engineering.js` from repo root.

## Workflow for significant changes

```
USER REQUEST
  ↓ UNDERSTAND (inspect repo, .engineering/project.yaml)
  ↓ CLASSIFY (risk: TRIVIAL/LOW/MEDIUM/HIGH/CRITICAL)
  ↓ INSPECT (files, graph, dependencies)
  ↓ RESEARCH IF REQUIRED (medium+ risk)
  ↓ ARCHITECTURE / DESIGN
  ↓ PLAN
  ↓ IMPLEMENT
  ↓ OBSERVE (tests, runtime)
  ↓ VERIFY + SECURITY REVIEW + COMPLEXITY REVIEW
  ↓ UPDATE .engineering (events, progress, handoff)
```

Do NOT skip research/architecture for HIGH/CRITICAL changes. Do NOT add ceremony for TRIVIAL.

## Risk levels

- TRIVIAL: rename variable
- LOW: small isolated utility
- MEDIUM: new external dependency
- HIGH: auth change
- CRITICAL: payment, DB migration

Medium+ requires research.

## Roles (activate per task)

- Software Architect, Senior Engineer, Security Engineer, DevOps, QA, DB/Data, ML, SRE, Performance, Product

Project type determines roles (e.g., Web SaaS → Architect+Security+DevOps+QA)

## Natural language mappings

- "Explain this project" → `explain`
- "What has AI actually built? What remains?" → `status` + `verify` + `progress`
- "What changed in last 2 hours?" → `events` + `git log`
- "Why does this file exist?" → `explain --file <path>` + `impact <path>`
- "What breaks if I delete this?" → `impact <path>`
- "Audit security" → `security`
- "Is this production ready?" → `progress` + `verify`
- "Find unnecessary code" → `complexity`
- "Give another AI everything to continue" → `handoff --md`

## Evidence first

Every claim should cite file, test, runtime, or git evidence. If no evidence, mark UNKNOWN.

## Cross-agent

Core state is agent-independent. Skill wrappers exist for:
- Claude Code: `.claude/skills/engineering/SKILL.md`
- Codex: `.agents/skills/engineering/SKILL.md`
- OpenCode: `.opencode/skills/engineering/SKILL.md`

All delegate to same `bin/engineering.js` and `.engineering/` format.
