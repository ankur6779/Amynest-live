/**
 * copy-www.mjs
 * Copies the kidschedule production build into the Capacitor www/ folder.
 * Run automatically via `pnpm run build:web` in this package.
 */
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src  = resolve(__dirname, "../../kidschedule/dist/public");
const dest = resolve(root, "www");

if (!existsSync(src)) {
  console.error(`\n❌  Source not found: ${src}`);
  console.error("   Run the kidschedule build first.\n");
  process.exit(1);
}

console.log(`\n📂  Clearing www/ ...`);
if (existsSync(dest)) rmSync(dest, { recursive: true });
mkdirSync(dest, { recursive: true });

console.log(`📋  Copying build → www/ ...`);
cpSync(src, dest, { recursive: true });

/** PWA / store marketing icons — not part of kidschedule dist; regenerate from canonical master. */
const iconMaster = resolve(root, "ios-config/app-icon-master.png");
if (existsSync(iconMaster) && process.platform === "darwin") {
  const runSips = (px, outName) => {
    const out = resolve(dest, outName);
    const r = spawnSync("sips", ["-z", String(px), String(px), iconMaster, "--out", out], {
      stdio: "pipe",
    });
    if (r.status !== 0) {
      console.warn(`   (warn) sips failed for ${outName}`);
    }
  };
  runSips(192, "pwa-icon-192.png");
  runSips(512, "pwa-icon-512.png");
  try {
    cpSync(iconMaster, resolve(dest, "amynest-appstore-1024.png"));
  } catch {
    /* ignore */
  }
  console.log(`🖼  PWA / store icons synced from ios-config/app-icon-master.png`);
}

console.log(`✅  www/ ready  (${dest})\n`);
