import { afterEach, describe, expect, it, vi } from "vitest";
import { createNominatimPlaceLookup } from "./nominatim-place-lookup";

describe("Nominatim PlaceLookupPort adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns offline without calling fetch", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const port = createNominatimPlaceLookup({ timeoutMs: 100 });
    expect(port.isTemporaryProvider).toBe(true);
    const res = await port.search("Delhi");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("offline");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps timeout to graceful failure", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    );
    const port = createNominatimPlaceLookup({ timeoutMs: 20 });
    const res = await port.search("Delhi");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(["timeout", "aborted"]).toContain(res.code);
  });

  it("maps 429 to throttled", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    );
    const port = createNominatimPlaceLookup({ timeoutMs: 500 });
    const res = await port.search("Delhi");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("throttled");
  });
});
