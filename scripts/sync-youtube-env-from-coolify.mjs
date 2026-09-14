#!/usr/bin/env node
/**
 * Copy YOUTUBE_* from Coolify into repo .env.development without printing values.
 *
 * Requires one of:
 *   - HETZNER_SSH_PRIVATE_KEY (+ optional COOLIFY_SSH_HOST)
 *   - COOLIFY_API_TOKEN (+ optional COOLIFY_API_BASE)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { upsertEnvFile } from "./lib/update-env-file.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptsDir, "..");
const outFile = process.argv[2] ?? join(repoRoot, ".env.development");
const coolifyHost = process.env.COOLIFY_SSH_HOST?.trim() || "188.245.208.126";
const appUuid = process.env.COOLIFY_APP_UUID?.trim() || "ik6ml2uhw6op765lo14wn5m3";
const appEnv = `/data/coolify/applications/${appUuid}/.env`;
const wanted = new Set([
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REFRESH_TOKEN",
  "YOUTUBE_DEFAULT_PRIVACY",
]);

function resolveSshKey() {
  if (process.env.HETZNER_SSH_PRIVATE_KEY?.trim()) {
    const dir = mkdtempSync(join(tmpdir(), "hetzner-ssh-"));
    const keyPath = join(dir, "id_ed25519");
    writeFileSync(keyPath, `${process.env.HETZNER_SSH_PRIVATE_KEY.trim()}\n`, { mode: 0o600 });
    return { keyPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }
  const path = process.env.HETZNER_SSH_KEY?.trim() || join(process.env.HOME ?? "", ".ssh/id_ed25519_hetzner");
  if (path && existsSync(path)) return { keyPath: path, cleanup: () => {} };
  return null;
}

function fetchViaSsh() {
  const ssh = resolveSshKey();
  if (!ssh) return "";
  try {
    const out = execFileSync(
      "ssh",
      [
        "-i",
        ssh.keyPath,
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=12",
        `root@${coolifyHost}`,
        `grep -E '^(YOUTUBE_CLIENT_ID|YOUTUBE_CLIENT_SECRET|YOUTUBE_REFRESH_TOKEN|YOUTUBE_DEFAULT_PRIVACY)=' '${appEnv}' 2>/dev/null || true`,
      ],
      { encoding: "utf8" },
    );
    return out.trim();
  } finally {
    ssh.cleanup();
  }
}

async function fetchViaCoolifyApi() {
  const token = process.env.COOLIFY_API_TOKEN?.trim();
  if (!token) return "";
  const base = (process.env.COOLIFY_API_BASE?.trim() || "http://188.245.208.126:8000/api/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/applications/${appUuid}/envs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Coolify API ${res.status}`);
  const rows = await res.json();
  const lines = [];
  for (const row of rows) {
    const key = row.key ?? row.name;
    if (!wanted.has(key)) continue;
    const value = String(row.real_value ?? row.value ?? "");
    if (!value) continue;
    lines.push(`${key}=${value}`);
  }
  return lines.join("\n");
}

function parseLines(raw) {
  /** @type {Record<string, string>} */
  const updates = {};
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);
    if (wanted.has(key) && value) updates[key] = value;
  }
  return updates;
}

function fetchFromProcessEnv() {
  /** @type {Record<string, string>} */
  const updates = {};
  for (const key of wanted) {
    const value = process.env[key]?.trim();
    if (value) updates[key] = value;
  }
  return updates;
}

let updates = fetchFromProcessEnv();
if (Object.keys(updates).length < 3) {
  const raw = fetchViaSsh() || (await fetchViaCoolifyApi());
  if (!raw) {
    console.error(
      "Error: Could not read YouTube env. Set YOUTUBE_* secrets, HETZNER_SSH_PRIVATE_KEY, or COOLIFY_API_TOKEN.",
    );
    process.exit(1);
  }
  updates = parseLines(raw);
}
for (const key of ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"]) {
  if (!updates[key]) {
    console.error(`Error: Missing ${key} in Coolify env.`);
    process.exit(1);
  }
}

upsertEnvFile(outFile, updates);
console.log(`Synced ${Object.keys(updates).length} YouTube env keys into ${outFile} (values not shown).`);
