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
├── manifest.yaml           # projectName/type, created/updated — b.md state root
├── lifecycle.yaml          # ★ b.md lifecycle/state file — phase, risks, assumptions, next steps, history
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

## Startup Lifecycle Workflow (b.md — prevents AI context amnesia)

**On every session start, before any change:**

```
1. SCAN   → scan repo for lifecycle, memory, handoff, architecture, project-state, engineering-state
           → bin/engineering.js uses src/lib/lifecycle-scanner.js (LIFECYCLE_PATTERNS + findExtraStateFiles)
           → reports detected systems + conflicts via analyzeLifecycleConflicts()
2. FOLLOW → if existing lifecycle system found, read it FIRST and follow it
           → .engineering/lifecycle.yaml is primary; do NOT overwrite blindly; preserve history
           → if multiple systems, report CONFLICTING and prefer .engineering/
3. INFER  → if none exists, infer project type from files/deps/structure
           → src/lib/project-analyzer.js + src/lib/lifecycle-decision.js
           → supports software (js/py/go/rust/web-saas/web-api/fullstack), automation (Makefile/Docker/workflows), robotics (ROS/package.xml/platformio.ini/*.urdf/*.ino)
4. CHOOSE → select most suitable lifecycle model for that type
           → src/lib/lifecycle-decision.js LIFECYCLE_TEMPLATES: javascript-project, web-saas, web-api, python-service, go-service, automation-project, robotics-project, fullstack
           → reason + confidence (high/medium/low) recorded in lifecycle.yaml
5. CREATE → if needed, create .engineering/lifecycle.yaml in standard folder
           → src/lib/lifecycle.js buildInitialLifecycle() — traceable YAML, human+machine readable, version-control friendly
6. PRESERVE → lifecycle.yaml tracks: project summary, currentPhase/stage, phases[] (IN_PROGRESS/NOT_STARTED/COMPLETED), keyDecisions/decisions/, risksAndBottlenecks, assumptions, openQuestions, openTasks/requirements/, nextActions, evidenceLinks, history, detectedSystems
7. HANDOFF → every change updates handoff (.engineering/handoff.yaml/.md) so next AI resumes in <5 min — acceptance: done/remaining/blocked/changed identifiable from status+verify+lifecycle
8. VERIFY  → avoid hallucination: if cannot verify from code/docs/tests/runtime, mark UNKNOWN — “Unknown; verification evidence does not exist.” Valid states: VERIFIED/IMPLEMENTED/UNKNOWN/INFERRED/CONFLICTING per src/lib/constants.js
```

**Lifecycle file** `.engineering/lifecycle.yaml` is the durable context per b.md Required Outputs — validated by `src/schemas/lifecycle.schema.json`. Update via `engineering lifecycle --phase <id>` (not blind overwrite) and `engineering sync` (preserves history, updates summary/evidence).

## Commands (via CLI)

The skill delegates to the local CLI at `bin/engineering.js` (or `npx engineering`):

```bash
node bin/engineering.js init                  # scans lifecycle systems, infers type, creates .engineering/lifecycle.yaml
node bin/engineering.js status                # summary + lifecycle phase/risks/next actions (<5 min understanding)
node bin/engineering.js lifecycle             # show lifecycle state (phase, risks, assumptions, tasks, evidence)
node bin/engineering.js lifecycle --phase implementation  # advance phase (preserve history)
node bin/engineering.js explain [--level 30s|5min|developer|senior|machine]
node bin/engineering.js architecture
node bin/engineering.js impact <file>
node bin/engineering.js verify                # includes lifecycle + conflict checks, marks UNKNOWN where needed
node bin/engineering.js security
node bin/engineering.js progress
node bin/engineering.js handoff --md          # enriched with lifecycle for AI-to-AI transfer
node bin/engineering.js sync                  # re-analyze, preserve lifecycle history, update summary
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
