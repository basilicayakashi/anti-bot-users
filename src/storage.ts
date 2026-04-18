import fs from "node:fs";
import path from "node:path";
import { RegexRule } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const RULES_FILE = path.join(DATA_DIR, "rules.json");

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, "[]", "utf8");
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