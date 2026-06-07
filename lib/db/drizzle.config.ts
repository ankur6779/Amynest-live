import { defineConfig } from "drizzle-kit";
import path from "path";
import {
  databaseUrlNeedsSsl,
  normalizeDatabaseUrl,
} from "./src/database-url";

export { normalizeDatabaseUrl } from "./src/database-url";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = normalizeDatabaseUrl(rawUrl);
const needsSsl = databaseUrlNeedsSsl(databaseUrl);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: needsSsl ? "require" : undefined,
  },
});
