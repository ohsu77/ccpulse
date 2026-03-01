import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { OAuthUsage } from "./types.js";

const USAGE_ENDPOINT = "https://api.anthropic.com/api/oauth/usage";
const BETA_HEADER = "oauth-2025-04-20";
const CACHE_TTL_MS = 60_000; // 60 seconds

let cachedResult: { data: OAuthUsage; expiresAt: number } | null = null;

// ── Token extraction ───────────────────────────────────────────────────────

function extractTokenMac(): string | null {
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: "utf-8", timeout: 3000 }
    ).trim();
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

function extractTokenFile(): string | null {
  const paths = [
    join(homedir(), ".claude", ".credentials.json"),
    join(homedir(), ".config", "claude", "credentials.json"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const parsed = JSON.parse(readFileSync(p, "utf-8"));
    return (
      parsed?.claudeAiOauth?.accessToken ??
      parsed?.accessToken ??
      parsed?.access_token ??
      null
    );
    } catch {
      continue;
    }
  }
  return null;
}

function getAccessToken(): string | null {
  if (process.platform === "darwin") {
    return extractTokenMac() ?? extractTokenFile();
  }
  return extractTokenFile();
}

// ── API call ───────────────────────────────────────────────────────────────

interface RawOAuthResponse {
  five_hour?: { utilization?: number; resets_at?: string };
  seven_day?: { utilization?: number; resets_at?: string };
}

async function fetchUsageApi(token: string): Promise<OAuthUsage> {
  const res = await fetch(USAGE_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": BETA_HEADER,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as RawOAuthResponse;

  return {
    sessionPct: data.five_hour?.utilization ?? 0,
    sessionResetsAt: data.five_hour?.resets_at ?? "",
    weeklyPct: data.seven_day?.utilization ?? 0,
    weeklyResetsAt: data.seven_day?.resets_at ?? "",
    source: "api",
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getOAuthUsage(): Promise<OAuthUsage | null> {
  // Return cached result if still fresh
  if (cachedResult && Date.now() < cachedResult.expiresAt) {
    return cachedResult.data;
  }

  const token = getAccessToken();
  if (!token) {
    process.stderr.write("oauth: no token found, using local fallback\n");
    return null;
  }

  try {
    const data = await fetchUsageApi(token);
    cachedResult = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch (err) {
    process.stderr.write(`oauth: API failed (${err}), using local fallback\n`);
    return null;
  }
}

// ── Reset time formatter ───────────────────────────────────────────────────

export function formatResetsIn(resetsAt: string): string {
  if (!resetsAt) return "";
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}
