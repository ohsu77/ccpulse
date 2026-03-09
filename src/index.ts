#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { watch } from "chokidar";
import { homedir } from "os";
import { join } from "path";
import { loadConfig, saveConfig } from "./config.js";
import { aggregate } from "./aggregator.js";
import { readCache, writeCache } from "./cache.js";
import type { PlanType } from "./types.js";

const server = new Server(
  { name: "claude-usage-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

let refreshTimer: NodeJS.Timeout | null = null;

async function refresh(): Promise<void> {
  const config = loadConfig();
  const summary = await aggregate(config);
  writeCache(summary);
}

// Debounced refresh — avoid hammering disk on rapid file changes
function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 500);
}

// Watch ~/.claude/projects for new JSONL data
function startWatcher(): void {
  const watchPath = join(homedir(), ".claude", "projects");
  watch(`${watchPath}/**/*.jsonl`, {
    ignoreInitial: false,
    persistent: true,
  }).on("add", scheduleRefresh)
    .on("change", scheduleRefresh);
}

// ── Tools ──────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_usage",
      description: "Get Claude Code usage summary (daily/weekly tokens and estimated cost)",
      inputSchema: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["daily", "weekly", "both"],
            description: "Time period to report",
          },
        },
        required: ["period"],
      },
    },
    {
      name: "set_plan",
      description: "Set your Claude subscription plan for usage percentage calculation",
      inputSchema: {
        type: "object",
        properties: {
          plan: {
            type: "string",
            enum: ["api", "pro", "max", "max_5x", "max_20x"],
          },
        },
        required: ["plan"],
      },
    },
    {
      name: "calibrate",
      description: "Record a calibration data point: your actual web usage % vs our token count",
      inputSchema: {
        type: "object",
        properties: {
          webUsagePct: {
            type: "number",
            description: "Your current usage % as shown on claude.ai",
          },
        },
        required: ["webUsagePct"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "get_usage") {
    await refresh();
    const summary = readCache();
    if (!summary) {
      return { content: [{ type: "text", text: "No usage data yet. Use Claude Code first." }] };
    }

    const fmt = (agg: typeof summary.daily) =>
      [
        `  Tokens: ${(agg.tokens.inputTokens + agg.tokens.outputTokens).toLocaleString()}`,
        `  Cost:   ~$${agg.costUSD.toFixed(4)}`,
        `  Calls:  ${agg.entryCount}`,
      ].join("\n");

    const lines = [`Plan: ${summary.plan}`, ""];
    const period = (args as { period: string }).period;
    if (period === "daily" || period === "both") {
      lines.push("── Daily ──", fmt(summary.daily), "");
    }
    if (period === "weekly" || period === "both") {
      lines.push("── Weekly ──", fmt(summary.weekly), "");
    }
    lines.push(`Last updated: ${summary.lastUpdated}`);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  if (name === "set_plan") {
    const config = loadConfig();
    config.plan = (args as { plan: PlanType }).plan;
    saveConfig(config);
    return { content: [{ type: "text", text: `Plan set to: ${config.plan}` }] };
  }

  if (name === "calibrate") {
    const config = loadConfig();
    const summary = readCache();
    if (!summary) {
      return { content: [{ type: "text", text: "No cache data yet. Run get_usage first." }] };
    }
    const webPct = (args as { webUsagePct: number }).webUsagePct;
    const weeklyTokens =
      summary.weekly.tokens.inputTokens + summary.weekly.tokens.outputTokens;

    if (weeklyTokens === 0) {
      return { content: [{ type: "text", text: "No weekly tokens recorded yet. Use Claude Code first." }] };
    }

    config.calibration.dataPoints.push({
      date: new Date().toISOString(),
      tokens: weeklyTokens,
      webUsagePct: webPct,
    });

    // Simple average of all data points
    const points = config.calibration.dataPoints;
    config.calibration.factor =
      points.reduce((sum, p) => sum + p.webUsagePct / p.tokens, 0) / points.length;
    config.calibration.lastCalibrated = new Date().toISOString();

    saveConfig(config);
    return {
      content: [{
        type: "text",
        text: [
          `Calibration recorded.`,
          `Data points: ${points.length}`,
          `Factor: ${config.calibration.factor.toExponential(4)} %/token`,
        ].join("\n"),
      }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  startWatcher();
  await refresh(); // initial load

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("claude-usage-mcp running\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
