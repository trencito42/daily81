const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "daily81",
  "system",
  "api",
  "support",
  "help",
  "settings",
  "profile",
  "leaderboard",
  "friends",
  "challenges",
  "challenge",
  "daily",
  "play",
  "archive",
  "stats",
  "login",
  "register",
  "logout",
  "auth",
  "u",
  "user",
  "null",
  "undefined",
  "root",
]);

export function normalizeUsername(username: string): string {
  if (!username || typeof username !== "string") return "";
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): { valid: boolean; isValid: boolean; error?: string; normalized: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, isValid: false, error: "Username is required", normalized: "" };
  }

  const normalized = normalizeUsername(username);

  if (normalized.length < 3 || normalized.length > 20) {
    return { valid: false, isValid: false, error: "Username must be between 3 and 20 characters", normalized };
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      valid: false,
      isValid: false,
      error: "Username can only contain letters, numbers, and underscores",
      normalized,
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return { valid: false, isValid: false, error: "This username is reserved", normalized };
  }

  return { valid: true, isValid: true, normalized };
}
