#!/usr/bin/env node
/**
 * Upload a local MP4 to YouTube (Shorts-friendly vertical video).
 * Additive Thumbnail Engine: generates thumbnail.jpg, tries thumbnails.set,
 * and prepends a 1–2s cover matching the thumbnail when custom thumbs are unsupported.
 *
 * Usage:
 *   pnpm run youtube:upload -- ./video.mp4 --title="Amy Astro Intelligence"
 *   pnpm run youtube:upload -- ./video.mp4 --title="..." --privacy=public
 *   pnpm run youtube:upload -- ./video.mp4 --no-thumbnail
 *
 * Requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env.development
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  createReadStream,
  existsSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  createYouTubeClient,
  createYouTubeOAuthClient,
  resolveYouTubeCredentials,
} from "./lib/youtube-client.mjs";

loadEnvFiles();

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  /** @type {{ file: string, title: string, description: string, privacy: string, tags: string[], thumbnail: boolean, cover: boolean, headline: string }} */
  const out = {
    file: "",
    title: "AmyNest AI — Smart Parenting for Modern Families",
    description:
      "AmyNest AI helps parents worldwide with daily routines, Amy Astro Intelligence, speech coaching & more.\n\nDownload free: https://play.google.com/store/apps/details?id=com.amynest.app\nhttps://www.amynest.in",
    privacy: process.env.YOUTUBE_DEFAULT_PRIVACY?.trim() || "unlisted",
    tags: ["AmyNest", "parenting", "AI", "kids", "global parenting", "Shorts"],
    thumbnail: process.env.AMYNEST_THUMBNAIL_ENGINE !== "0",
    cover: true,
    headline: "",
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--title=")) out.title = arg.slice("--title=".length);
    else if (arg.startsWith("--description="))
      out.description = arg.slice("--description=".length);
    else if (arg.startsWith("--privacy=")) out.privacy = arg.slice("--privacy=".length);
    else if (arg.startsWith("--tags="))
      out.tags = arg
        .slice("--tags=".length)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    else if (arg.startsWith("--headline=")) out.headline = arg.slice("--headline=".length);
    else if (arg.startsWith("--client-secret=")) {
      process.env.YOUTUBE_CLIENT_SECRET_FILE = arg.slice("--client-secret=".length);
    } else if (arg === "--no-thumbnail") out.thumbnail = false;
    else if (arg === "--no-cover") out.cover = false;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm run youtube:upload -- ./video.mp4 [--title="..."] [--privacy=unlisted|public|private]

Options:
  --title=TEXT
  --description=TEXT
  --privacy=unlisted|public|private   (default: unlisted)
  --tags=tag1,tag2
  --headline=TEXT                     (max 4 words thumbnail headline)
  --no-thumbnail                      skip Thumbnail Engine
  --no-cover                          generate thumb but do not prepend cover clip
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
  console.error(
    'Example: pnpm run youtube:upload -- "./Promotional images and video new/video.mp4"',
  );
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

const thumbOut = join(dirname(resolve(args.file)), "thumbnail-engine-out");
let uploadFile = resolve(args.file);

if (args.thumbnail) {
  console.log("\n[thumbnail-engine] Generating official AmyNest thumbnail + cover…");
  const cli = join(REPO_ROOT, "content-engine/thumbnail-engine/cli.ts");
  const cliArgs = [
    "--import",
    "tsx/esm",
    cli,
    `--out=${thumbOut}`,
    `--title=${args.title}`,
    `--video=${resolve(args.file)}`,
    args.cover ? "--cover=1" : "--cover=0",
  ];
  if (args.headline) cliArgs.push(`--headline=${args.headline}`);
  const gen = spawnSync(process.execPath, cliArgs, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (gen.stdout) process.stdout.write(gen.stdout);
  if (gen.stderr) process.stderr.write(gen.stderr);
  if (gen.status !== 0) {
    console.warn(
      "[thumbnail-engine] Generation failed — continuing upload without custom thumbnail.",
    );
  } else {
    const covered = join(thumbOut, "video-with-thumbnail-cover.mp4");
    if (args.cover && existsSync(covered)) {
      uploadFile = covered;
      console.log("[thumbnail-engine] Uploading video with first-frame cover strategy.");
    }
  }
}

const sizeMb = (statSync(uploadFile).size / (1024 * 1024)).toFixed(1);
console.log(`Uploading ${basename(uploadFile)} (${sizeMb} MB) as ${args.privacy}...`);

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
    body: createReadStream(uploadFile),
  },
});

const videoId = res.data.id;
const url = `https://youtube.com/shorts/${videoId}`;

console.log("\n✓ Upload complete");
console.log(`  Video ID: ${videoId}`);
console.log(`  URL:      ${url}`);

// Additive: try custom thumbnail after media succeeds (Shorts may reject).
const jpg = join(thumbOut, "thumbnail.jpg");
const reportPath = join(thumbOut, "THUMBNAIL_REPORT.md");
if (args.thumbnail && existsSync(jpg) && videoId) {
  try {
    const setRes = await youtube.thumbnails.set({
      videoId,
      media: { body: createReadStream(jpg) },
    });
    console.log("✓ Custom thumbnail uploaded (thumbnails.set).");
    const apiSnippet = JSON.stringify(setRes.data ?? {}, null, 2).slice(0, 800);
    if (existsSync(reportPath)) {
      appendFileSync(
        reportPath,
        `\n## YouTube thumbnail upload (post-publish)\n\n- **Status:** SUCCESS\n- **Video ID:** ${videoId}\n\n\`\`\`\n${apiSnippet}\n\`\`\`\n`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("Thumbnail upload unsupported. First-frame cover strategy used.");
    console.log(`  Reason: ${msg.slice(0, 200)}`);
    if (existsSync(reportPath)) {
      appendFileSync(
        reportPath,
        `\n## YouTube thumbnail upload (post-publish)\n\n- **Status:** FAILURE\n- **Unsupported / Shorts fallback:** true\n- **Reason if rejected:** ${msg.slice(0, 400)}\n- **Log:** Thumbnail upload unsupported. First-frame cover strategy used.\n`,
      );
    } else {
      writeFileSync(
        reportPath,
        `# AmyNest Thumbnail Report\n\nThumbnail upload unsupported. First-frame cover strategy used.\n\nReason: ${msg.slice(0, 400)}\n`,
      );
    }
  }
}

console.log("\nGoogle Ads ke liye yeh Short link use karo, ya mujhe bhejo add karne ke liye.");
console.log(`\nYOUTUBE_VIDEO_ID=${videoId}`);
if (existsSync(join(thumbOut, "THUMBNAIL_REPORT.md"))) {
  console.log(`THUMBNAIL_REPORT=${join(thumbOut, "THUMBNAIL_REPORT.md")}`);
}
