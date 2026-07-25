/**
 * Nominatim PlaceLookupPort adapter — development / interim provider.
 *
 * Hard requirements:
 * - request throttling (Nominatim usage policy)
 * - timeout handling
 * - graceful offline / error responses (never throw to UI)
 * - no hard product dependency (swappable via getPlaceLookupPort)
 *
 * @temporary Replaceable; not a frozen architecture dependency.
 */

import type {
  PlaceLookupPort,
  PlaceLookupResponse,
  PlaceLookupResult,
} from "../../domain/ports/place-lookup-port";

const PROVIDER_ID = "nominatim_osm_dev";
const DEFAULT_TIMEOUT_MS = 6_000;
/** Nominatim absolute max ~1 req/s; stay conservative. */
const MIN_INTERVAL_MS = 1_100;

let lastRequestAt = 0;
let chain: Promise<void> = Promise.resolve();

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function mapRow(row: {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}): PlaceLookupResult | null {
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const city = row.address?.city || row.address?.town || row.address?.village || null;
  return {
    label: row.display_name ?? `${lat}, ${lon}`,
    lat,
    lon,
    country: row.address?.country ?? null,
    adminRegion: row.address?.state ?? city,
    timezoneIana: null,
  };
}

async function throttleWait(signal?: AbortSignal): Promise<void> {
  const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (wait <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const tid = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, wait);
    const onAbort = () => {
      window.clearTimeout(tid);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      window.clearTimeout(tid);
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createNominatimPlaceLookup(options?: {
  timeoutMs?: number;
}): PlaceLookupPort {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    providerId: PROVIDER_ID,
    isTemporaryProvider: true,

    async search(query, opts): Promise<PlaceLookupResponse> {
      const q = query.trim();
      if (q.length < 2) {
        return { ok: true, results: [] };
      }

      if (isOffline()) {
        return {
          ok: false,
          code: "offline",
          message: "Search needs a connection",
        };
      }

      const signal = opts?.signal;

      // Serialize + throttle so concurrent debounced calls cannot stampede Nominatim.
      const run = chain.then(async () => {
        await throttleWait(signal);
        lastRequestAt = Date.now();

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "6");

        const timeoutCtrl = new AbortController();
        const onOuterAbort = () => timeoutCtrl.abort();
        signal?.addEventListener("abort", onOuterAbort);
        const timeoutId = window.setTimeout(() => timeoutCtrl.abort(), timeoutMs);

        try {
          const res = await fetch(url.toString(), {
            signal: timeoutCtrl.signal,
            headers: {
              "User-Agent": "AmyNest/1.0 (birth-sky-place-search)",
              Accept: "application/json",
            },
          });

          if (res.status === 429) {
            return {
              ok: false as const,
              code: "throttled" as const,
              message: "Too many searches — wait a moment and try again.",
            };
          }
          if (!res.ok) {
            return {
              ok: false as const,
              code: "provider_error" as const,
              message: "Couldn’t search. Try again.",
            };
          }

          const data = (await res.json()) as Array<Parameters<typeof mapRow>[0]>;
          const results = data
            .map(mapRow)
            .filter((x): x is PlaceLookupResult => x != null);

          if (results.length === 0) {
            return {
              ok: false as const,
              code: "empty" as const,
              message: "No places found — try another spelling.",
            };
          }
          return { ok: true as const, results };
        } catch (e) {
          if (signal?.aborted || (e as Error).name === "AbortError") {
            if (signal?.aborted) {
              return {
                ok: false as const,
                code: "aborted" as const,
                message: "Search cancelled",
              };
            }
            return {
              ok: false as const,
              code: "timeout" as const,
              message: "Search timed out. Try again.",
            };
          }
          return {
            ok: false as const,
            code: "provider_error" as const,
            message: "Couldn’t search. Try again.",
          };
        } finally {
          window.clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onOuterAbort);
        }
      });

      // Keep chain alive even on failure so throttling continues.
      chain = run.then(
        () => undefined,
        () => undefined,
      );

      return run;
    },
  };
}
