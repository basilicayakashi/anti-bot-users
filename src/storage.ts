import fs from "node:fs";
import path from "node:path";
import { BotSettings, RegexRule } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const RULES_FILE = path.join(DATA_DIR, "rules.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: BotSettings = {
  NotBeforeInDays: 0
};

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, "[]", "utf8");
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(DEFAULT_SETTINGS, null, 2),
      "utf8"
    );
  }
}

export function readRules(): RegexRule[] {
  ensureStorage();
  const raw = fs.readFileSync(RULES_FILE, "utf8");
  return JSON.parse(raw) as RegexRule[];
}

export function writeRules(rules: RegexRule[]): void {
  ensureStorage();
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf8");
}

export function readSettings(): BotSettings {
  ensureStorage();

  const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<BotSettings>;

  return {
    NotBeforeInDays: Math.max(0, Number(parsed.NotBeforeInDays ?? 0))
  };
}

export function writeSettings(settings: BotSettings): void {
  ensureStorage();

  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(
      {
        NotBeforeInDays: Math.max(0, Number(settings.NotBeforeInDays))
      },
      null,
      2
    ),
    "utf8"
  );
}