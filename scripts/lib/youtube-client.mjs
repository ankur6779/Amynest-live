import { readFileSync } from "node:fs";
import { google } from "googleapis";

export const YOUTUBE_SCOPES = [
  // Full Data API access (update/schedule/playlist). Prefer this for production.
  "https://www.googleapis.com/auth/youtube.force-ssl",
  // Keep upload+readonly for narrower clients / legacy tokens.
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  // Analytics reports (optional; grant if using YouTube Analytics provider).
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

/** @param {string} clientSecretPath */
export function readOAuthClientFromJson(clientSecretPath) {
  const raw = JSON.parse(readFileSync(clientSecretPath, "utf8"));
  const block = raw.installed ?? raw.web;
  if (!block?.client_id || !block?.client_secret) {
    throw new Error(
      `Invalid OAuth JSON at ${clientSecretPath}. Expected "installed" (Desktop) credentials.`,
    );
  }
  const redirectUri =
    block.redirect_uris?.find((u) => u.startsWith("http://127.0.0.1")) ??
    block.redirect_uris?.[0] ??
    "http://127.0.0.1:3333/oauth2callback";
  return {
    clientId: block.client_id,
    clientSecret: block.client_secret,
    redirectUri,
  };
}

/** @param {{ clientId: string, clientSecret: string, redirectUri: string, refreshToken?: string }} cfg */
export function createYouTubeOAuthClient(cfg) {
  const oauth2 = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
  if (cfg.refreshToken) {
    oauth2.setCredentials({ refresh_token: cfg.refreshToken });
  }
  return oauth2;
}

/** @param {import("google-auth-library").OAuth2Client} auth */
export function createYouTubeClient(auth) {
  return google.youtube({ version: "v3", auth });
}

/** Resolve credentials from env and/or --client-secret path. */
export function resolveYouTubeCredentials(clientSecretPath) {
  if (clientSecretPath) {
    return readOAuthClientFromJson(clientSecretPath);
  }
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing YouTube OAuth credentials. Pass --client-secret=/path/to/client_secret.json or set YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET.",
    );
  }
  return {
    clientId,
    clientSecret,
    redirectUri: process.env.YOUTUBE_REDIRECT_URI?.trim() || "http://127.0.0.1:3333/oauth2callback",
  };
}
