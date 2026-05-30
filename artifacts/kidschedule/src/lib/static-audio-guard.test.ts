import { describe, expect, it } from "vitest";
import {
  forbidDirectGcsUrl,
  isPhonicsLibraryGcsUrl,
  isStaticAudioProxyUrl,
} from "@/lib/static-audio-guard";

describe("static-audio-guard phonics library exemption", () => {
  const phonicsLetter =
    "https://storage.googleapis.com/amynest-audio-storage/phonics/letters/a.mp3";
  const staticHash =
    "https://storage.googleapis.com/amynest-audio-storage/static-audio/abc123def456789012345678901234ab.mp3";
  const proxy = "/api/static-audio/abc123def456789012345678901234ab.mp3";

  it("recognizes phonics GCS library URLs", () => {
    expect(isPhonicsLibraryGcsUrl(phonicsLetter)).toBe(true);
    expect(isPhonicsLibraryGcsUrl(staticHash)).toBe(false);
  });

  it("allows phonics GCS through forbidDirectGcsUrl", () => {
    expect(() => forbidDirectGcsUrl(phonicsLetter)).not.toThrow();
  });

  it("still blocks static catalog GCS URLs", () => {
    expect(() => forbidDirectGcsUrl(staticHash)).toThrow(
      "Static audio must use API proxy only",
    );
  });

  it("accepts API proxy routes for static catalog", () => {
    expect(isStaticAudioProxyUrl(proxy)).toBe(true);
  });

  it("blocks random storage.googleapis.com URLs that are not phonics library paths", () => {
    const randomGcs = "https://storage.googleapis.com/some-bucket/other/file.mp3";
    expect(isPhonicsLibraryGcsUrl(randomGcs)).toBe(false);
    expect(() => forbidDirectGcsUrl(randomGcs)).toThrow(
      "Static audio must use API proxy only",
    );
  });
});
