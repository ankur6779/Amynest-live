import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function discoveryAudioMirrorRoots(): string[] {
  const here = fileURLToPath(import.meta.url);
  const repoFromModule = join(here, "..", "..", "..", "..");
  const cwd = process.cwd();
  return [
    join(repoFromModule, "artifacts/kidschedule/public/discovery-worlds-audio"),
    join(cwd, "artifacts/kidschedule/public/discovery-worlds-audio"),
    join(cwd, "../artifacts/kidschedule/public/discovery-worlds-audio"),
  ];
}

/** Read a generated discovery-world MP3 from the local public mirror (dev / pre-upload). */
export function readLocalDiscoveryWorldAudio(objectPath: string): Buffer | null {
  const safe = (objectPath ?? "").trim().replace(/^\/+/, "");
  if (!safe || safe.includes("..")) return null;
  for (const root of discoveryAudioMirrorRoots()) {
    const filePath = join(root, safe);
    try {
      if (existsSync(filePath)) return readFileSync(filePath);
    } catch {
      /* try next root */
    }
  }
  return null;
}
