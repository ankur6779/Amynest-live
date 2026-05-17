/** Canonical client route for Firebase email action links. */
export const FIREBASE_ACTION_PATH = "/auth/action";

export type FirebaseActionLocation = Pick<Location, "search" | "hash"> &
  Partial<Pick<Location, "href">>;

export type FirebaseActionMode = "verifyEmail" | "resetPassword" | string;

export type FirebaseActionParams = {
  mode: string | null;
  oobCode: string | null;
};

const OPTIONAL_ACTION_PARAMS = ["apiKey", "lang"] as const;

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
 * Merge Firebase action params from query string, hash, or full href.
 */
export function collectFirebaseActionSearchParams(
  location: FirebaseActionLocation = window.location,
): URLSearchParams {
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
    if (!location.href) return merged;
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

  return merged;
}

/**
 * Firebase email links may include continueUrl (same /auth/action), which causes
 * redirect loops if preserved. Keep only params required to complete the action.
 */
export function buildCanonicalAuthActionSearch(
  location: FirebaseActionLocation = window.location,
): string | null {
  const merged = collectFirebaseActionSearchParams(location);
  const mode = merged.get("mode");
  const oobCode = merged.get("oobCode") ?? merged.get("oob_code");
  if (!mode || !oobCode) return null;

  const clean = new URLSearchParams();
  clean.set("mode", mode);
  clean.set("oobCode", oobCode);
  for (const key of OPTIONAL_ACTION_PARAMS) {
    const value = merged.get(key);
    if (value) clean.set(key, value);
  }
  return `?${clean.toString()}`;
}

export function buildCanonicalAuthActionHref(
  location: FirebaseActionLocation = window.location,
): string | null {
  const search = buildCanonicalAuthActionSearch(location);
  if (!search) return null;
  return `${FIREBASE_ACTION_PATH}${search}`;
}

/**
 * Parse Firebase email action link params from query string, hash, or full href.
 * Handles mobile clients and hash-router style links.
 */
export function parseFirebaseActionParams(
  location: FirebaseActionLocation = window.location,
): FirebaseActionParams {
  const merged = collectFirebaseActionSearchParams(location);
  const mode = merged.get("mode");
  const oobCode = merged.get("oobCode") ?? merged.get("oob_code");

  return { mode, oobCode };
}

export function hasFirebaseActionParams(
  location: FirebaseActionLocation = window.location,
): boolean {
  const { mode, oobCode } = parseFirebaseActionParams(location);
  return Boolean(mode && oobCode);
}
