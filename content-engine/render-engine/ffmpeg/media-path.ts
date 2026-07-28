import { existsSync } from "node:fs";

const VIRTUAL_SCHEMES = [
  "lavfi://",
  "planned://",
  "library://",
  "placeholder://",
  "gradient://",
  "solid://",
  "brand://",
  "cache://",
  "file://",
];

/** True when the compositor source can be opened as a real media file by ffmpeg. */
export function isRealMediaPath(sourcePath: string | undefined | null): boolean {
  if (!sourcePath) return false;
  const trimmed = sourcePath.trim();
  if (!trimmed) return false;
  if (VIRTUAL_SCHEMES.some((scheme) => trimmed.startsWith(scheme))) {
    if (trimmed.startsWith("file://")) {
      const local = trimmed.replace(/^file:\/\//, "");
      return existsSync(local);
    }
    return false;
  }
  return existsSync(trimmed);
}

export function resolveMediaFsPath(sourcePath: string): string {
  if (sourcePath.startsWith("file://")) {
    return sourcePath.replace(/^file:\/\//, "");
  }
  return sourcePath;
}
