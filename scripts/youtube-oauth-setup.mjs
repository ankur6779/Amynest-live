#!/usr/bin/env node
/**
 * One-time YouTube OAuth setup for promo automation.
 *
 * Usage:
 *   node scripts/youtube-oauth-setup.mjs --client-secret=/Users/macbook/Downloads/client_secret_XXX.json
 *
 * Opens browser → Google login → saves refresh token to .env.development
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { loadEnvFiles, repoRoot } from "./lib/load-env.mjs";
import {
  YOUTUBE_SCOPES,
  createYouTubeOAuthClient,
  readOAuthClientFromJson,
  resolveYouTubeCredentials,
} from "./lib/youtube-client.mjs";
import { upsertEnvFile } from "./lib/update-env-file.mjs";
import { join } from "node:path";

loadEnvFiles();

function parseArgs(argv) {
  let clientSecret = process.env.YOUTUBE_CLIENT_SECRET_FILE?.trim() || "";
  let port = 3333;
  let envFile = join(repoRoot, ".env.development");

  for (const arg of argv) {
    if (arg.startsWith("--client-secret=")) clientSecret = arg.slice("--client-secret=".length);
    else if (arg.startsWith("--port=")) port = Number(arg.slice("--port=".length));
    else if (arg.startsWith("--env-file=")) envFile = arg.slice("--env-file=".length);
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  node scripts/youtube-oauth-setup.mjs --client-secret=/path/to/client_secret.json

Options:
  --client-secret=PATH   Downloaded OAuth Desktop JSON (required unless env vars set)
  --port=3333            Local callback port (default 3333)
  --env-file=PATH        Where to save tokens (default repo .env.development)
`);
      process.exit(0);
    }
  }
  return { clientSecret, port, envFile };
}

const { clientSecret, port, envFile } = parseArgs(process.argv.slice(2));

if (!clientSecret) {
  console.error("Error: pass --client-secret=/path/to/client_secret.json");
  process.exit(1);
}

const creds = readOAuthClientFromJson(clientSecret);
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
const oauth2 = createYouTubeOAuthClient({ ...creds, redirectUri });

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  scope: YOUTUBE_SCOPES,
  prompt: "consent",
});

console.log("\nYouTube OAuth setup");
console.log("===================");
console.log("1. Browser khulega — apne YouTube channel wale Gmail se login karo");
console.log("2. 'Allow' dabao\n");

if (creds.redirectUri !== redirectUri) {
  console.warn(
    `Note: JSON redirect is ${creds.redirectUri}. Using ${redirectUri} for this run.`,
  );
  console.warn(
    "Agar error aaye, Google Cloud → Credentials → OAuth client → Authorized redirect URIs mein add karo:",
  );
  console.warn(`  ${redirectUri}\n`);
}

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>OAuth failed</h2><p>${error ?? "Missing code"}</p>`);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and run again with prompt=consent.",
      );
    }

    upsertEnvFile(envFile, {
      YOUTUBE_CLIENT_ID: creds.clientId,
      YOUTUBE_CLIENT_SECRET: creds.clientSecret,
      YOUTUBE_REFRESH_TOKEN: tokens.refresh_token,
      YOUTUBE_REDIRECT_URI: redirectUri,
      YOUTUBE_DEFAULT_PRIVACY: process.env.YOUTUBE_DEFAULT_PRIVACY || "unlisted",
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h2>Success!</h2><p>YouTube connected. You can close this tab and return to the terminal.</p>",
    );

    console.log("\n✓ OAuth success");
    console.log(`✓ Saved to ${envFile}:`);
    console.log("  YOUTUBE_CLIENT_ID");
    console.log("  YOUTUBE_CLIENT_SECRET");
    console.log("  YOUTUBE_REFRESH_TOKEN");
    console.log("\nNext: test upload with");
    console.log('  pnpm run youtube:upload -- /path/to/video.mp4 --title="AmyNest test"\n');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>Token exchange failed</h2><pre>${err.message}</pre>`);
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Waiting for OAuth callback on ${redirectUri}\n`);
  console.log(`If browser does not open, visit:\n${authUrl}\n`);

  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(openCmd, [authUrl], { stdio: "ignore", detached: true }).unref();
});

setTimeout(() => {
  console.error("\nTimeout: no OAuth callback in 5 minutes.");
  process.exit(1);
}, 5 * 60 * 1000);
