#!/usr/bin/env node
/**
 * Change YouTube video privacy (e.g. unlisted → public after approval).
 *
 * Usage:
 *   pnpm run youtube:publish -- VIDEO_ID
 *   pnpm run youtube:publish -- VIDEO_ID --privacy=public
 */
import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  createYouTubeClient,
  createYouTubeOAuthClient,
  resolveYouTubeCredentials,
} from "./lib/youtube-client.mjs";

loadEnvFiles();

function parseArgs(argv) {
  let videoId = "";
  let privacy = "public";
  for (const arg of argv) {
    if (arg.startsWith("--privacy=")) privacy = arg.slice("--privacy=".length);
    else if (!arg.startsWith("-") && !videoId) videoId = arg;
  }
  return { videoId, privacy };
}

const { videoId, privacy } = parseArgs(process.argv.slice(2));

if (!videoId) {
  console.error("Usage: pnpm run youtube:publish -- VIDEO_ID [--privacy=public]");
  process.exit(1);
}

const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
if (!refreshToken) {
  console.error("Error: YOUTUBE_REFRESH_TOKEN missing. Run: pnpm run youtube:oauth-setup");
  process.exit(1);
}

const creds = resolveYouTubeCredentials(process.env.YOUTUBE_CLIENT_SECRET_FILE);
const oauth2 = createYouTubeOAuthClient({ ...creds, refreshToken });
const youtube = createYouTubeClient(oauth2);

await youtube.videos.update({
  part: ["status"],
  requestBody: {
    id: videoId,
    status: { privacyStatus: privacy },
  },
});

console.log(`✓ Video ${videoId} is now ${privacy}`);
console.log(`  https://youtube.com/shorts/${videoId}`);
