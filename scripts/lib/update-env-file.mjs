import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Upsert env keys in a dotenv file (preserves comments and unrelated keys).
 * @param {string} filePath
 * @param {Record<string, string>} updates
 */
export function upsertEnvFile(filePath, updates) {
  const lines = existsSync(filePath) ? readFileSync(filePath, "utf8").split("\n") : [];
  const keys = new Set(Object.keys(updates));
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key)) {
      out.push(`${key}=${updates[key]}`);
      keys.delete(key);
    } else {
      out.push(line);
    }
  }

  if (keys.size > 0) {
    if (out.length > 0 && out[out.length - 1] !== "") out.push("");
    out.push("# YouTube promo automation (scripts/youtube-oauth-setup.mjs)");
    for (const key of keys) {
      out.push(`${key}=${updates[key]}`);
    }
  }

  writeFileSync(filePath, out.join("\n").replace(/\n?$/, "\n"), "utf8");
}
