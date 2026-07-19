#!/usr/bin/env node
/**
 * Apply Cloudflare Security Insights fixes for amynest.in:
 * 1. Enable Bot Fight Mode
 * 2. Enable Cloudflare-managed security.txt
 * 3. Enable AI Labyrinth (crawler_protection)
 *
 * Auth: CLOUDFLARE_API_TOKEN (Zone Settings Edit + Account Security Center Edit)
 *       or wrangler OAuth token with the same scopes.
 *
 * Usage:
 *   node scripts/cloudflare-security-insights-fix.mjs [--dry-run]
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ZONE = "amynest.in";
const dryRun = process.argv.includes("--dry-run");

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfgPath = join(homedir(), "Library/Preferences/.wrangler/config/default.toml");
  const cfg = readFileSync(cfgPath, "utf8");
  const m = cfg.match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("Set CLOUDFLARE_API_TOKEN or run: npx wrangler login");
  return m[1];
}

async function cf(method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${loadToken()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`${method} ${path}: ${msg}`);
  }
  return json.result;
}

async function resolveZoneId() {
  const zones = await cf("GET", `/zones?name=${encodeURIComponent(ZONE)}`);
  const zone = zones?.[0];
  if (!zone?.id) throw new Error(`Zone not found: ${ZONE}`);
  return zone.id;
}

const SECURITY_TXT = {
  enabled: true,
  contact: ["mailto:support@amynest.in", "https://www.amynest.in/support"],
  expires: "2027-07-19T23:59:59.000Z",
  preferred_languages: "en, hi",
  canonical: ["https://www.amynest.in/.well-known/security.txt"],
  policy: ["https://www.amynest.in/privacy"],
  acknowledgments: ["https://www.amynest.in/support"],
};

const BOT_MANAGEMENT = {
  fight_mode: true,
  enable_js: true,
  crawler_protection: "enabled",
};

async function main() {
  const tokenSource = process.env.CLOUDFLARE_API_TOKEN ? "CLOUDFLARE_API_TOKEN" : "wrangler OAuth";
  console.log(`[security-fix] zone=${ZONE} auth=${tokenSource} dryRun=${dryRun}`);

  const zoneId = await resolveZoneId();
  console.log(`[security-fix] zone_id=${zoneId}`);

  if (dryRun) {
    console.log("[security-fix] Would PUT /security-center/securitytxt", SECURITY_TXT);
    console.log("[security-fix] Would PUT /bot_management", BOT_MANAGEMENT);
    return;
  }

  const securityTxt = await cf("PUT", `/zones/${zoneId}/security-center/securitytxt`, SECURITY_TXT);
  console.log("[security-fix] security.txt enabled:", securityTxt?.enabled ?? true);

  const bot = await cf("PUT", `/zones/${zoneId}/bot_management`, BOT_MANAGEMENT);
  console.log("[security-fix] bot fight mode:", bot?.fight_mode);
  console.log("[security-fix] ai labyrinth (crawler_protection):", bot?.crawler_protection);
  console.log("[security-fix] OK — re-scan Security Insights in Cloudflare dashboard after a few minutes.");
}

main().catch((err) => {
  console.error("[security-fix] FAILED:", err.message);
  console.error(
    "[security-fix] Create an API token with Zone Settings Edit + Security Center permissions:",
  );
  console.error("[security-fix] https://dash.cloudflare.com/profile/api-tokens");
  process.exit(1);
});
