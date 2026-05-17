export type FirebaseActionMode = "verifyEmail" | "resetPassword" | string;

export type FirebaseActionParams = {
  mode: string | null;
  oobCode: string | null;
};

function mergeParams(target: URLSearchParams, source: URLSearchParams): void {
  source.forEach((value, key) => {
    if (!target.has(key)) target.set(key, value);
  });
}

function parseQueryString(qs: string): URLSearchParams {
  const trimmed = qs.replace(/^\?/, "").trim();
  if (!trimmed) return new URLSearchParams();
  return new URLSearchParams(trimmed);
}

/**
 * Parse Firebase email action link params from query string, hash, or full href.
 * Handles mobile clients and hash-router style links.
 */
export function parseFirebaseActionParams(
  location: Pick<Location, "search" | "hash" | "href"> = window.location,
): FirebaseActionParams {
  const merged = new URLSearchParams();

  if (location.search) {
    mergeParams(merged, parseQueryString(location.search));
  }

  const hashRaw = location.hash.replace(/^#/, "").trim();
  if (hashRaw) {
    if (hashRaw.includes("?")) {
      mergeParams(merged, parseQueryString(hashRaw.slice(hashRaw.indexOf("?") + 1)));
    } else if (hashRaw.includes("=")) {
      mergeParams(merged, parseQueryString(hashRaw));
    }
  }

  try {
    const url = new URL(location.href);
    mergeParams(merged, url.searchParams);
    if (url.hash) {
      const hashPart = url.hash.replace(/^#/, "");
      if (hashPart.includes("?")) {
        mergeParams(merged, parseQueryString(hashPart.slice(hashPart.indexOf("?") + 1)));
      } else if (hashPart.includes("=")) {
        mergeParams(merged, parseQueryString(hashPart));
      }
    }
  } catch {
    /* ignore malformed href */
  }

  const mode = merged.get("mode");
  const oobCode = merged.get("oobCode") ?? merged.get("oob_code");

  return { mode, oobCode };
}

export function hasFirebaseActionParams(
  location: Pick<Location, "search" | "hash" | "href"> = window.location,
): boolean {
  const { mode, oobCode } = parseFirebaseActionParams(location);
  return Boolean(mode && oobCode);
}
