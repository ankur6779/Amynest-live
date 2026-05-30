import { describe, expect, it } from "vitest";
import {
  forbidDirectGcsUrl,
  isPhonicsLibraryGcsUrl,
  isPhonicsLibraryProxyUrl,
  isStaticAudioProxyUrl,
} from "@/lib/static-audio-guard";

describe("static-audio-guard phonics library proxy", () => {
  const phonicsLetterGcs =
    "https://storage.googleapis.com/amynest-audio-storage/phonics/letters/a.mp3";
  const phonicsLetterProxy = "/api/phonics-library/phonics/letters/a.mp3";
  const staticHash =
    "https://storage.googleapis.com/amynest-audio-storage/static-audio/abc123def456789012345678901234ab.mp3";
  const staticProxy = "/api/static-audio/abc123def456789012345678901234ab.mp3";

  it("recognizes phonics GCS paths in manifest URLs (reference only)", () => {
    expect(isPhonicsLibraryGcsUrl(phonicsLetterGcs)).toBe(true);
    expect(isPhonicsLibraryGcsUrl(staticHash)).toBe(false);
  });

  it("recognizes phonics library API proxy routes", () => {
    expect(isPhonicsLibraryProxyUrl(phonicsLetterProxy)).toBe(true);
    expect(isPhonicsLibraryProxyUrl(staticProxy)).toBe(false);
  });

  it("blocks all direct GCS playback including phonics library", () => {
    expect(() => forbidDirectGcsUrl(phonicsLetterGcs)).toThrow(
      "Static audio must use API proxy only",
    );
  });

  it("still blocks static catalog GCS URLs", () => {
    expect(() => forbidDirectGcsUrl(staticHash)).toThrow(
      "Static audio must use API proxy only",
    );
  });

  it("accepts API proxy routes for static catalog", () => {
    expect(isStaticAudioProxyUrl(staticProxy)).toBe(true);
  });

  it("blocks random storage.googleapis.com URLs", () => {
    const randomGcs = "https://storage.googleapis.com/some-bucket/other/file.mp3";
    expect(isPhonicsLibraryGcsUrl(randomGcs)).toBe(false);
    expect(() => forbidDirectGcsUrl(randomGcs)).toThrow(
      "Static audio must use API proxy only",
    );
  });
});
