import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type TableSnapshot = {
  table: string;
  row_count: number;
  max_pk?: string | number | null;
};

export type MigrationSnapshot = {
  version: 1;
  label: string;
  snapshot_at: string;
  source_host: string;
  target_host: string;
  dump_file?: string;
  tables: TableSnapshot[];
};

const DEFAULT_DIR = path.join(
  process.cwd(),
  "audit",
  "render-to-coolify",
);

export function snapshotPath(dir = DEFAULT_DIR): string {
  return path.join(dir, "snapshot.json");
}

export async function writeSnapshot(
  snapshot: MigrationSnapshot,
  dir = DEFAULT_DIR,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const file = snapshotPath(dir);
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return file;
}

export async function readSnapshot(dir = DEFAULT_DIR): Promise<MigrationSnapshot> {
  const file = snapshotPath(dir);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as MigrationSnapshot;
}
