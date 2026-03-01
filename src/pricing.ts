// Official Anthropic pricing (USD per million tokens)
// Last verified: 2026-02-28
// Source: https://docs.anthropic.com/en/docs/about-claude/pricing

export interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheCreation5mPerM: number;
  cacheCreation1hPerM: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // Claude Opus 4.x
  "claude-opus-4-6": {
    inputPerM: 5.0,
    outputPerM: 25.0,
    cacheReadPerM: 0.5,       // 10% of input
    cacheCreation5mPerM: 6.25, // 125% of input
    cacheCreation1hPerM: 10.0, // 200% of input
  },

  // Claude Sonnet 4.x
  "claude-sonnet-4-6": {
    inputPerM: 3.0,
    outputPerM: 15.0,
    cacheReadPerM: 0.3,
    cacheCreation5mPerM: 3.75,
    cacheCreation1hPerM: 6.0,
  },

  // Claude Haiku 4.x
  "claude-haiku-4-5-20251001": {
    inputPerM: 1.0,
    outputPerM: 5.0,
    cacheReadPerM: 0.1,
    cacheCreation5mPerM: 1.25,
    cacheCreation1hPerM: 2.0,
  },
};

// Fallback for unknown/future models — use Sonnet pricing
const FALLBACK_PRICING: ModelPricing = PRICING["claude-sonnet-4-6"];

export function getPricing(model: string): ModelPricing {
  // Exact match
  if (PRICING[model]) return PRICING[model];

  // Prefix match (e.g. "claude-opus-4-6-20250514" → opus)
  if (model.includes("opus")) return PRICING["claude-opus-4-6"];
  if (model.includes("sonnet")) return PRICING["claude-sonnet-4-6"];
  if (model.includes("haiku")) return PRICING["claude-haiku-4-5-20251001"];

  return FALLBACK_PRICING;
}

export function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number
): number {
  const p = getPricing(model);
  const M = 1_000_000;

  return (
    (inputTokens * p.inputPerM) / M +
    (outputTokens * p.outputPerM) / M +
    (cacheReadTokens * p.cacheReadPerM) / M +
    (cacheCreationTokens * p.cacheCreation5mPerM) / M
  );
}
