import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getConfigDir } from "./config.js";
import type { UsageSummary } from "./types.js";

function getCachePath(): string {
  return join(getConfigDir(), "cache.json");
}

export function readCache(): UsageSummary | null {
  try {
    const raw = readFileSync(getCachePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCache(summary: UsageSummary): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(getCachePath(), JSON.stringify(summary, null, 2));
}
