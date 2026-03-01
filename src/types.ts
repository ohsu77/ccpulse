export type PlanType = "api" | "pro" | "max" | "max_5x" | "max_20x";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface AggregatedUsage {
  tokens: TokenUsage;
  costUSD: number;
  entryCount: number;
}

// From OAuth API — exact values matching claude.ai
export interface OAuthUsage {
  sessionPct: number;        // five_hour.utilization
  sessionResetsAt: string;   // five_hour.resets_at (ISO 8601)
  weeklyPct: number;         // seven_day.utilization
  weeklyResetsAt: string;    // seven_day.resets_at
  source: "api" | "local";   // api = exact, local = estimated
}

export interface UsageSummary {
  plan: PlanType;
  oauth: OAuthUsage | null;  // null = API unavailable
  daily: AggregatedUsage;    // from JSONL (for cost $)
  weekly: AggregatedUsage;   // from JSONL (for cost $)
  calibrationFactor: number | null;
  lastUpdated: string;
}

export interface UsageEntry {
  timestamp: string;
  sessionId: string;
  model: string;
  usage: TokenUsage;
  costUSD: number;
}

export interface Config {
  plan: PlanType;
  weekStartDay: "monday" | "sunday";
  alertThresholds: number[];
  calibration: {
    factor: number | null;
    lastCalibrated: string | null;
    dataPoints: Array<{
      date: string;
      tokens: number;
      webUsagePct: number;
    }>;
  };
}
