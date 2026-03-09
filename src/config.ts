import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Config } from "./types.js";

const CONFIG_DIR = join(homedir(), ".claude-usage");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: Config = {
  plan: "max",
  weekStartDay: "monday",
  alertThresholds: [50, 75, 90],
  calibration: {
    factor: null,
    lastCalibrated: null,
    dataPoints: [],
  },
};

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      calibration: { ...DEFAULT_CONFIG.calibration, ...raw.calibration },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
