import { readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parseFile } from "./parser.js";
import { getOAuthUsage, RateLimitError } from "./oauth.js";
import type { AggregatedUsage, UsageEntry, UsageSummary, Config } from "./types.js";

function getWeekStart(weekStartDay: "monday" | "sunday"): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = weekStartDay === "monday"
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDayStart(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

function emptyAggregate(): AggregatedUsage {
  return {
    tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
    costUSD: 0,
    entryCount: 0,
  };
}

function addEntry(agg: AggregatedUsage, entry: UsageEntry): void {
  agg.tokens.inputTokens += entry.usage.inputTokens;
  agg.tokens.outputTokens += entry.usage.outputTokens;
  agg.tokens.cacheReadTokens += entry.usage.cacheReadTokens;
  agg.tokens.cacheCreationTokens += entry.usage.cacheCreationTokens;
  agg.costUSD += entry.costUSD;
  agg.entryCount++;
}

function findJsonlFiles(): string[] {
  const projectsDir = join(homedir(), ".claude", "projects");
  const files: string[] = [];
  try {
    const projects = readdirSync(projectsDir);
    for (const project of projects) {
      const projectPath = join(projectsDir, project);
      if (!statSync(projectPath).isDirectory()) continue;
      for (const entry of readdirSync(projectPath)) {
        if (entry.endsWith(".jsonl")) {
          files.push(join(projectPath, entry));
        }
      }
    }
  } catch { /* ~/.claude/projects doesn't exist yet */ }
  return files;
}

export async function aggregate(config: Config): Promise<UsageSummary> {
  const dayStart = getDayStart();
  const weekStart = getWeekStart(config.weekStartDay);

  const daily = emptyAggregate();
  const weekly = emptyAggregate();

  // Parse JSONL for cost data
  const files = findJsonlFiles();
  for (const file of files) {
    const entries = await parseFile(file);
    for (const entry of entries) {
      const ts = new Date(entry.timestamp);
      if (ts >= weekStart) addEntry(weekly, entry);
      if (ts >= dayStart) addEntry(daily, entry);
    }
  }

  // OAuth API for accurate session/weekly %
  let oauth = null;
  try {
    oauth = await getOAuthUsage();
  } catch (err) {
    if (!(err instanceof RateLimitError)) throw err;
    // rate limited — proceed with null oauth, caller handles stale display
  }

  return {
    plan: config.plan,
    oauth,
    daily,
    weekly,
    calibrationFactor: config.calibration.factor,
    lastUpdated: new Date().toISOString(),
  };
}
