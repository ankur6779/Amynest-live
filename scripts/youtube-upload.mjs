#!/usr/bin/env node
/**
 * Upload a local MP4 to YouTube (Shorts-friendly vertical video).
 *
 * Usage:
 *   pnpm run youtube:upload -- ./video.mp4 --title="Amy Astro Intelligence"
 *   pnpm run youtube:upload -- ./video.mp4 --title="..." --privacy=public
 *
 * Requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env.development
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  createYouTubeClient,
  createYouTubeOAuthClient,
  resolveYouTubeCredentials,
} from "./lib/youtube-client.mjs";

loadEnvFiles();

function parseArgs(argv) {
  /** @type {{ file: string, title: string, description: string, privacy: string, tags: string[] }} */
  const out = {
    file: "",
    title: "AmyNest AI — Smart Parenting for Indian Families",
    description:
      "AmyNest AI helps parents with daily routines, Amy Astro Intelligence, speech coaching & more.\n\nDownload free: https://play.google.com/store/apps/details?id=com.amynest.app\nhttps://www.amynest.in",
    privacy: process.env.YOUTUBE_DEFAULT_PRIVACY?.trim() || "unlisted",
    tags: ["AmyNest", "parenting", "AI", "kids", "India", "Shorts"],
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--title=")) out.title = arg.slice("--title=".length);
    else if (arg.startsWith("--description=")) out.description = arg.slice("--description=".length);
    else if (arg.startsWith("--privacy=")) out.privacy = arg.slice("--privacy=".length);
    else if (arg.startsWith("--tags=")) out.tags = arg.slice("--tags=".length).split(",").map((t) => t.trim()).filter(Boolean);
    else if (arg.startsWith("--client-secret=")) {
      process.env.YOUTUBE_CLIENT_SECRET_FILE = arg.slice("--client-secret=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm run youtube:upload -- ./video.mp4 [--title="..."] [--privacy=unlisted|public|private]

Options:
  --title=TEXT
  --description=TEXT
  --privacy=unlisted|public|private   (default: unlisted)
  --tags=tag1,tag2
`);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  out.file = positional[0] || "";
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.file || !existsSync(args.file)) {
  console.error("Error: pass a valid MP4 path");
  console.error('Example: pnpm run youtube:upload -- "./Promotional images and video new/video.mp4"');
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

const sizeMb = (statSync(args.file).size / (1024 * 1024)).toFixed(1);
console.log(`Uploading ${basename(args.file)} (${sizeMb} MB) as ${args.privacy}...`);

const res = await youtube.videos.insert({
  part: ["snippet", "status"],
  requestBody: {
    snippet: {
      title: args.title,
      description: args.description,
      tags: args.tags,
      categoryId: "22", // People & Blogs — fine for app promos
    },
    status: {
      privacyStatus: args.privacy,
      selfDeclaredMadeForKids: false,
    },
  },
  media: {
    body: createReadStream(args.file),
  },
});

const videoId = res.data.id;
const url = `https://youtube.com/shorts/${videoId}`;

console.log("\n✓ Upload complete");
console.log(`  Video ID: ${videoId}`);
console.log(`  URL:      ${url}`);
console.log("\nGoogle Ads ke liye yeh Short link use karo, ya mujhe bhejo add karne ke liye.");

// Machine-readable line for pipeline scripts
console.log(`\nYOUTUBE_VIDEO_ID=${videoId}`);
