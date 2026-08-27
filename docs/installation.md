# Installation

## Quick start

```bash
git clone https://github.com/example/engineering-intelligence
cd engineering-intelligence
npm install
node bin/engineering.js --help
```

Use inside any project:

```bash
cd your-project
node /path/to/engineering-intelligence/bin/engineering.js init
node /path/to/engineering-intelligence/bin/engineering.js status
```

Or install globally:

```bash
npm install -g engineering-intelligence
engineering init
engineering explain
```

## Claude Code

Skill follows agentskills.io spec. Copy to your project or personal skills:

```bash
# project (recommended — committed)
mkdir -p .claude/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md .claude/skills/engineering/SKILL.md

# personal (all projects)
mkdir -p ~/.claude/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md ~/.claude/skills/engineering/SKILL.md
```

Then `/engineering` in Claude Code, or ask naturally: "Explain this project".

Verify skill loads: `/skills` should list `engineering`.

## Codex (OpenAI)

```bash
# project
mkdir -p .agents/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md .agents/skills/engineering/SKILL.md
# global
mkdir -p ~/.agents/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md ~/.agents/skills/engineering/SKILL.md
# legacy Codex path also supported
mkdir -p ~/.codex/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md ~/.codex/skills/engineering/SKILL.md
```

Invoke explicit `$engineering` or let Codex auto-select when you say "explain architecture" etc.

## OpenCode

OpenCode auto-discovers from multiple locations — pick one:

```bash
# project opencode (preferred)
mkdir -p .opencode/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md .opencode/skills/engineering/SKILL.md

# or project claude-compatible (also discovered)
mkdir -p .claude/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md .claude/skills/engineering/SKILL.md

# global
mkdir -p ~/.config/opencode/skills/engineering
cp /path/to/engineering-intelligence/skills/engineering/SKILL.md ~/.config/opencode/skills/engineering/SKILL.md
```

Trigger: `/engineering` in TUI, or natural language; OpenCode loads via `skill` tool.

Check: `opencode --help` shows skills available; `<available_skills>` will include `engineering` after placement.

## AGENTS.md (optional)

Add to `AGENTS.md` or `CLAUDE.md` for auto-loading:

```md
## Engineering Intelligence
This repo uses .engineering/ for persistent state. Run `node bin/engineering.js status` after clone.
See skills/engineering/SKILL.md for workflow.
```

## MCP (optional)

No MCP server required. If you use MCP, expose `bin/engineering.js` as a tool via your MCP config — it already outputs JSON for machine consumption (`handoff`, `verify --json` future).

## Privacy

- Local-first, no upload
- Never commits secrets; `.engineering/` excludes secrets by policy
- Do not store API keys in `.engineering/`

## Troubleshooting

- Skill not showing: verify `SKILL.md` caps, frontmatter has `name` + `description`, directory name matches `name`
- OpenCode: check permissions in `opencode.json` `permission.skill`
- Claude: ensure `~/.claude/skills` exists and restart session
- Codex: ensure `.agents/skills` walked from git worktree root
