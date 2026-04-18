export type RuleTarget = "username" | "globalName" | "displayName";

export interface RegexRule {
  id: string;
  pattern: string;
  flags: string;
  target: RuleTarget;
  enabled: boolean;
  createdAt: string;
  createdBy: string;
}