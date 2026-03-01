# claude-usage-mcp

## Project Overview
MCP server that tracks Claude Code usage in real-time and exposes it to the statusline.
- Goal: Let Claude Code users see their weekly burn rate without leaving the terminal
- Approach: Parse local JSONL session logs + MCP server + statusline integration
- Differentiator: First real-time usage tracker that integrates natively with Claude Code's statusline
- License: MIT

## Tech Stack
- Runtime: Node.js (TypeScript)
- Protocol: MCP (Model Context Protocol) — stdio transport
- Data source: ~/.claude/ JSONL session logs
- Output: MCP resource for statusline consumption

## Architecture
```
~/.claude/projects/*/
  *.jsonl (session logs)
       │
       ▼
┌─────────────────────┐
│  claude-usage-mcp   │
│  (MCP Server)       │
│                     │
│  - Log parser       │  ← watches JSONL files
│  - Usage aggregator │  ← daily/weekly/monthly rollups
│  - Config manager   │  ← user sets plan limits
└─────────┬───────────┘
          │
          ▼
   Claude Code statusline
   [Daily: 45% | Weekly: 32% | $4.20 today]
```

## ═══════════════════════════════════════
## Workload — Phase 1: MVP
## ═══════════════════════════════════════

### Step 1: Project Setup
- [ ] `npm init` + TypeScript config
- [ ] Install MCP SDK (`@modelcontextprotocol/sdk`)
- [ ] Basic project structure:
  ```
  src/
    index.ts          ← MCP server entry
    parser.ts         ← JSONL log parser
    aggregator.ts     ← usage rollup logic
    config.ts         ← user config (plan limits)
    types.ts          ← shared types
  ```
- [ ] tsconfig.json, .gitignore, eslint

### Step 2: Log Parser
- [ ] Find and read ~/.claude/ JSONL session logs
- [ ] Parse token counts (input_tokens, output_tokens) per message
- [ ] Parse cost data if available
- [ ] Handle log rotation / large files efficiently
- [ ] Unit tests for parser

### Step 3: Usage Aggregator
- [ ] Aggregate by: session, daily, weekly, monthly
- [ ] Calculate burn rate (tokens/hour, $/hour)
- [ ] Estimate weekly remaining based on current pace
- [ ] Cache results (avoid re-parsing entire history each time)
- [ ] SQLite or flat JSON for persisted aggregates

### Step 4: Config Manager
- [ ] Config file: ~/.claude-usage/config.json
- [ ] User-settable fields:
  ```json
  {
    "plan": "max_5x",
    "weeklyLimitHours": 200,
    "alertThresholds": [50, 75, 90],
    "weekStartDay": "monday"
  }
  ```
- [ ] Plan presets (Pro, Max, Max 5x) with default limits
- [ ] Validate config on load

### Step 5: MCP Server
- [ ] Implement MCP server with stdio transport
- [ ] Expose resources:
  - `usage://daily` — today's usage summary
  - `usage://weekly` — this week's usage summary
  - `usage://status` — one-liner for statusline
- [ ] Expose tools:
  - `get_usage(period)` — detailed usage report
  - `set_plan(plan)` — update plan config
- [ ] Test with Claude Code MCP connection

### Step 6: Statusline Integration
- [ ] Document how to wire MCP resource into statusline
- [ ] Provide example statusline-command.sh
- [ ] Format: `[D:45% W:32% $4.20]` (compact for statusline)

### Step 7: Polish & Release
- [ ] README.md with install instructions
- [ ] npm publish setup
- [ ] GitHub repo + CI (lint, test)
- [ ] Demo GIF for README

## ═══════════════════════════════════════
## Phase 2: Nice-to-Have (Post-MVP)
## ═══════════════════════════════════════
- [ ] Terminal TUI dashboard (`blessed` or `ink`)
- [ ] Slack/Discord webhook alerts at thresholds
- [ ] Multi-user support (team usage)
- [ ] Historical trends chart (sparkline in terminal)
- [ ] Auto-detect plan from API response headers

## ═══════════════════════════════════════
## Development Workflow (SuperClaude-powered)
## ═══════════════════════════════════════

### SC Skill Mapping
Use these SC skills at each step. They're globally installed at ~/.claude/commands/sc/.

| Step | SC Skill | Purpose |
|------|----------|---------|
| Before coding | `/sc:analyze` | Review existing code, check patterns |
| Architecture | `/sc:design` | Design MCP server interfaces |
| Implementation | `/sc:implement` | Code with multi-persona guidance |
| Testing | `/sc:test` | Run tests + coverage analysis |
| Debugging | `/sc:troubleshoot` | Diagnose build/runtime issues |
| Building | `/sc:build` | TypeScript compilation + optimization |
| Code review | `/sc:analyze --security` | Security + quality audit |
| Documentation | `/sc:document` | Generate API docs |
| Git | `/sc:git` | Smart commit messages |
| Task breakdown | `/sc:spawn` | Split complex steps into subtasks |

### Agent Personas (in .claude/agents/)
Reference these when you need specialized thinking:

| Agent | When to Activate | File |
|-------|-----------------|------|
| Backend Architect | MCP server design, API patterns, reliability | `.claude/agents/backend-architect.md` |
| System Architect | Overall architecture, component boundaries | `.claude/agents/system-architect.md` |
| Quality Engineer | Test strategy, edge cases, coverage | `.claude/agents/quality-engineer.md` |
| Security Engineer | Input validation, path traversal, open-source safety | `.claude/agents/security-engineer.md` |

### Development Principles
See PLANNING.md for full details. Key rules:
1. **Confidence-First**: Check before coding (≥90% → proceed, <70% → stop and ask)
2. **Parallel Execution**: Wave → Checkpoint → Wave (3.5x speedup)
3. **Four Questions**: Tests passing? Requirements met? Verified? Evidence?
4. **Simplicity First**: No over-engineering. Flat structure. Minimal abstraction.

### Recommended Workflow Per Step
```
1. /sc:analyze   → Understand current state
2. /sc:design    → Plan the approach (if architectural)
3. /sc:implement → Code it
4. /sc:test      → Verify
5. /sc:git       → Commit
```

## Key Decisions
- **Why MCP, not standalone CLI?**: Native Claude Code integration > another terminal window
- **Why local logs, not API?**: Works for Pro/Max subscribers who don't have Admin API keys
- **Why TypeScript?**: MCP SDK is TS-first, Claude Code ecosystem is Node
- **Accuracy caveat**: Local tracking is an estimate, not exact quota. Must be transparent about this.

## References
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Claude Code docs: https://docs.anthropic.com/en/docs/claude-code
- ccusage (prior art): https://github.com/ryoppippi/ccusage
- Claude-Code-Usage-Monitor: https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor
