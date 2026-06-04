/**
 * Force-sync Kids Story Hub catalog from Google Drive → story_content.
 *
 *   pnpm --filter @workspace/scripts exec tsx ./sync-story-drive.ts
 */
import { config } from "dotenv";
import { REPO_ROOT } from "./static-audio-paths.js";

config({ path: `${REPO_ROOT}/.env` });
config({ path: `${REPO_ROOT}/Amynest-backend-dykj.env`, override: true });

function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/^dpg-[a-z0-9-]+$/i.test(u.hostname) && !u.hostname.includes(".")) {
      u.hostname = `${u.hostname}.singapore-postgres.render.com`;
    }
    if (u.hostname.includes("render.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

const rawDb = process.env.DATABASE_URL?.trim();
if (rawDb) {
  process.env.DATABASE_URL = normalizeDatabaseUrl(rawDb);
}

async function main(): Promise<void> {
  const { syncStoriesFromDrive } = await import(
    "../artifacts/api-server/src/routes/stories.ts"
  );
  const result = await syncStoriesFromDrive(true);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
