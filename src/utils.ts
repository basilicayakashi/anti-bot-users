export function normalizeFlags(flags: string): string {
  const allowed = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);
  const unique = [...new Set(flags.split(""))].filter((f) => allowed.has(f));
  return unique.join("");
}

export function assertValidRegex(pattern: string, flags: string): void {
  // Lance une exception si invalide
  new RegExp(pattern, flags);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}