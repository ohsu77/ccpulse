#!/usr/bin/env node
// Standalone cache refresh — called by statusline when cache is stale
// OAuth only (fast, ~200ms) — JSONL cost data preserved from existing cache
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getOAuthUsage } from "./oauth.js";
import { loadConfig } from "./config.js";

const CACHE_PATH = join(homedir(), ".claude-usage", "cache.json");

async function main(): Promise<void> {
  loadConfig(); // ensure config dir exists

  // Read existing cache to preserve JSONL cost data
  let existing: Record<string, unknown> = {};
  if (existsSync(CACHE_PATH)) {
    try {
      existing = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    } catch { /* ignore */ }
  }

  // Only fetch OAuth (fast network call, no disk scan)
  const oauth = await getOAuthUsage();
  if (!oauth) {
    process.exit(0); // no token, skip silently
  }

  const updated = {
    ...existing,
    oauth,
    lastUpdated: new Date().toISOString(),
  };

  writeFileSync(CACHE_PATH, JSON.stringify(updated, null, 2));
}

main().catch(() => process.exit(1));
