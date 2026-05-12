/**
 * copy-www.mjs
 * Copies the kidschedule production build into the Capacitor www/ folder.
 * Run automatically via `pnpm run build:web` in this package.
 */
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log(`✅  www/ ready  (${dest})\n`);
