#!/usr/bin/env node
// Standalone cache refresh — called by statusline when cache is stale
// OAuth only (fast, ~200ms) — JSONL cost data preserved from existing cache
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getOAuthUsage, RateLimitError } from "./oauth.js";
import { loadConfig } from "./config.js";

const CACHE_PATH = join(homedir(), ".claude-usage", "cache.json");
const RATE_LIMIT_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes

async function main(): Promise<void> {
  loadConfig(); // ensure config dir exists

  // Read existing cache to preserve JSONL cost data
  let existing: Record<string, unknown> = {};
  if (existsSync(CACHE_PATH)) {
    try {
      existing = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
    } catch { /* ignore */ }
  }

  // Skip API call if we're in a rate limit backoff window
  const rateLimitUntil = existing.rateLimitUntil as string | undefined;
  if (rateLimitUntil && Date.now() < new Date(rateLimitUntil).getTime()) {
    process.exit(0);
  }

  let oauth = null;
  let newRateLimitUntil: string | undefined;

  try {
    oauth = await getOAuthUsage();
  } catch (err) {
    if (err instanceof RateLimitError) {
      newRateLimitUntil = new Date(Date.now() + RATE_LIMIT_BACKOFF_MS).toISOString();
      process.stderr.write(`oauth: rate limited, backing off until ${newRateLimitUntil}\n`);
    }
  }

  // Always update lastUpdated so stale-check doesn't retry every prompt on failure
  const updated = {
    ...existing,
    ...(oauth ? { oauth } : {}),
    ...(newRateLimitUntil ? { rateLimitUntil: newRateLimitUntil } : { rateLimitUntil: undefined }),
    lastUpdated: new Date().toISOString(),
  };

  if (!oauth && !existing.oauth) {
    process.exit(0); // no token and no prior data — nothing to write
  }

  writeFileSync(CACHE_PATH, JSON.stringify(updated, null, 2));
}

main().catch(() => process.exit(1));
