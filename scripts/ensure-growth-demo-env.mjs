#!/usr/bin/env node
/**
 * Ensure local dev env has demo login + Growth OS admin email allowlist.
 * Safe to run multiple times — only appends missing keys.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.development");

const DEFAULTS = {
  DATABASE_URL: "postgresql://amynest:amynest@localhost:5432/amynest_dev",
  ADMIN_GROWTH_EMAILS: "demo@amynest.in",
  VITE_DEMO_LOGIN_EMAIL: "demo@amynest.in",
  VITE_DEMO_LOGIN_PASSWORD: "AmyNest@2025",
  VITE_USE_LOCAL_API: "1",
  VITE_APP_API_ORIGIN: "http://localhost:5000",
};

let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const added = [];

for (const [key, value] of Object.entries(DEFAULTS)) {
  const re = new RegExp(`^${key}=`, "m");
  if (!re.test(content)) {
    content += `${content.endsWith("\n") || content.length === 0 ? "" : "\n"}${key}=${value}\n`;
    added.push(key);
  }
}

if (!existsSync(envPath)) {
  writeFileSync(envPath, content, "utf8");
  console.log("Created .env.development with demo Growth OS settings.");
} else if (added.length > 0) {
  writeFileSync(envPath, content, "utf8");
  console.log(`Updated .env.development — added: ${added.join(", ")}`);
} else {
  console.log(".env.development already has demo Growth OS settings.");
}

console.log("\nGrowth OS URLs (after pnpm run dev:web + pnpm run dev:api):");
console.log("  http://localhost:3000/sign-in");
console.log("  http://localhost:3000/admin/growth");
console.log("\nLogin: demo@amynest.in / AmyNest@2025");
