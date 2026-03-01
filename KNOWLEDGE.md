# KNOWLEDGE.md

Accumulated insights for claude-usage-mcp development.
Update this as you learn things during implementation.

---

## JSONL Log Format

> IMPORTANT: Verify this against actual files before implementing.
> Location: ~/.claude/projects/*/

TODO: Document actual JSONL schema after Step 2 investigation.

Expected fields to look for:
- input_tokens / output_tokens
- model name
- timestamp
- session ID
- cost data (if available)

---

## MCP Protocol Notes

### stdio Transport
- Server reads from stdin, writes to stdout
- stderr is for debug logging (won't interfere with protocol)
- JSON-RPC 2.0 message format

### Resources vs Tools
- **Resources**: Read-only data (usage://status) — good for statusline
- **Tools**: Actions (get_usage, set_plan) — good for interactive queries

### SDK Reference
- Package: `@modelcontextprotocol/sdk`
- Docs: https://modelcontextprotocol.io
- TypeScript examples: https://github.com/modelcontextprotocol/typescript-sdk

---

## Prior Art Learnings

### ccusage (GitHub 400+ stars)
- Parses local JSONL logs
- CLI-only (no MCP integration)
- Good reference for log format discovery
- https://github.com/ryoppippi/ccusage

### Claude-Code-Usage-Monitor
- Real-time monitoring
- Runs as separate terminal process
- No statusline integration
- https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor

### Gap We Fill
- Neither tool integrates with Claude Code's statusline via MCP
- Neither provides real-time in-editor usage display
- Our approach: MCP server → native statusline integration

---

## Claude Plan Limits (Reference)

> These are approximate and may change. Let users configure.

| Plan | Weekly Compute Hours (approx) |
|------|-------------------------------|
| Pro | ~40-80 hrs |
| Max | ~200 hrs |
| Max 5x | ~1000 hrs |

- Resets: Weekly (Monday UTC)
- Measurement: Compute hours, not tokens directly
- Token-to-hour conversion is model-dependent

---

## Development Patterns

### Token Savings via Confidence Check
- 100-200 tokens on check → saves 5,000-50,000 on wrong-direction work
- Always search for existing implementations before coding
- Always read MCP SDK docs before implementing protocol features

### Parallel Execution (3.5x speedup)
```
Wave 1: [Read file1, Read file2, Read file3]  ← parallel
Checkpoint: Analyze together                    ← sequential
Wave 2: [Edit file1, Edit file2, Edit file3]   ← parallel
```

### Red Flags (Hallucination Detection)
- "Tests pass" without showing output
- "Everything works" without evidence
- "Implementation complete" with failing tests
- Skipping error messages

---

## Troubleshooting

(Add issues and solutions here as you encounter them)
