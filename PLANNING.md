# PLANNING.md

Architecture, design principles, and development rules for claude-usage-mcp.

---

## Project Vision

First real-time Claude Code usage tracker that integrates natively with the statusline via MCP.
Users see their daily/weekly burn rate without leaving the terminal.

## Architecture

```
~/.claude/projects/*/
  *.jsonl (session logs)        ← data source
       │
       ▼
┌──────────────────────────┐
│  claude-usage-mcp        │
│  MCP Server (stdio)      │
│                          │
│  src/                    │
│  ├── index.ts            │  ← MCP entry, stdio transport
│  ├── parser.ts           │  ← JSONL log parser + watcher
│  ├── aggregator.ts       │  ← daily/weekly/monthly rollups
│  ├── store.ts            │  ← SQLite or flat JSON cache
│  ├── config.ts           │  ← plan limits, thresholds
│  └── types.ts            │  ← shared types
│                          │
│  MCP Resources:          │
│  ├── usage://status      │  ← one-liner for statusline
│  ├── usage://daily       │  ← today's breakdown
│  └── usage://weekly      │  ← this week's summary
│                          │
│  MCP Tools:              │
│  ├── get_usage(period)   │  ← detailed report
│  └── set_plan(plan)      │  ← update config
└──────────────────────────┘
```

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | MCP SDK is TS-first, Claude Code ecosystem |
| Transport | stdio | Standard for local MCP servers |
| Cache | SQLite (better-sqlite3) | Fast, zero-config, single-file |
| Log parsing | Streaming | Large JSONL files, can't load all in memory |
| File watching | chokidar | Cross-platform, battle-tested |

## Design Principles (SuperClaude-adapted)

### 1. Evidence-Based Development
- Verify JSONL log format against real files before implementing parser
- Test with actual ~/.claude/ data, not mocked assumptions
- Read MCP SDK docs via Context7 before implementing protocol

### 2. Confidence-First Implementation
- ≥90%: Proceed
- 70-89%: Present alternatives, investigate more
- <70%: STOP and ask questions
- ROI: 100-200 token check saves 5,000-50,000 tokens on wrong direction

### 3. Parallel-First Execution
```
Wave 1: [Read JSONL format, Read MCP SDK docs, Read existing tools] (parallel)
   ↓
Checkpoint: Design parser + MCP interface
   ↓
Wave 2: [Implement parser, Implement MCP server, Write tests] (parallel)
```

### 4. Simplicity First
- No over-engineering. This is a single-purpose tool.
- No unnecessary abstractions. Flat module structure.
- 200 lines → 50 lines if possible.
- 3 repeated lines > premature abstraction.

### 5. No Hallucinations (Four Questions)
1. Are all tests passing? → Show actual output
2. Are all requirements met? → List each one
3. No assumptions without verification? → Show docs
4. Is there evidence? → Provide test results

## Absolute Rules

1. **TypeScript strict mode** — `strict: true` in tsconfig
2. **All features need tests** — No PR without test coverage
3. **Conventional commits** — `feat:`, `fix:`, `test:`, `docs:`
4. **No secrets in code** — No hardcoded paths, use ~ expansion
5. **Cross-platform** — Must work on macOS + Linux (Windows nice-to-have)
6. **Graceful degradation** — Missing logs = show "no data", don't crash
7. **Accuracy disclaimer** — Always note that local tracking is an estimate

## Quality Gates

Before any PR merge:
- [ ] `npm run build` passes
- [ ] `npm run test` passes with >80% coverage
- [ ] `npm run lint` clean
- [ ] Manual test: connect to Claude Code, verify statusline output
- [ ] README updated if public API changed
