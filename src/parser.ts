import { createReadStream } from "fs";
import { createInterface } from "readline";
import { calcCost } from "./pricing.js";
import type { UsageEntry } from "./types.js";

interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

interface RawEntry {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  message?: {
    model?: string;
    usage?: RawUsage;
  };
}

export async function parseFile(filePath: string): Promise<UsageEntry[]> {
  const entries: UsageEntry[] = [];

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const entry = parseLine(line);
    if (entry) entries.push(entry);
  }

  return entries;
}

export function parseLine(line: string): UsageEntry | null {
  if (!line.trim()) return null;

  let raw: RawEntry;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }

  // Only process assistant messages with usage data
  if (raw.type !== "assistant" || !raw.message?.usage) return null;

  const u = raw.message.usage;
  const model = raw.message.model ?? "unknown";
  const inputTokens = u.input_tokens ?? 0;
  const outputTokens = u.output_tokens ?? 0;
  const cacheReadTokens = u.cache_read_input_tokens ?? 0;
  const cacheCreationTokens =
    (u.cache_creation_input_tokens ?? 0) +
    (u.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
    (u.cache_creation?.ephemeral_1h_input_tokens ?? 0);

  const costUSD = calcCost(
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens
  );

  return {
    timestamp: raw.timestamp ?? new Date().toISOString(),
    sessionId: raw.sessionId ?? "",
    model,
    usage: { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens },
    costUSD,
  };
}
