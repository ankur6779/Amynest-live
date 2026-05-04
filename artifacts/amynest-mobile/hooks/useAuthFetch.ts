import { useAuth } from "@/lib/firebase-auth";
import { useCallback } from "react";
import { API_BASE_URL } from "@/constants/api";
import { loggedFetch } from "@/lib/apiLogger";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

async function safeReadBody(res: Response): Promise<string> {
  try {
    const text = await res.clone().text();
    if (!text) return "";
    try {
      const json = JSON.parse(text);
      return json?.message || json?.error || text.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return "";
  }
}

function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export function useAuthFetch() {
  const { getToken, isSignedIn, sessionId } = useAuth();

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const url = `${API_BASE_URL}${path}`;

      // Build headers + call loggedFetch (logs to in-memory ring buffer for DebugPanel).
      // On 401/403 retries, getToken(skipCache:true) forces a fresh token before each attempt.
      const doAttempt = async (): Promise<Response> => {
        let token: string | null = null;
        try {
          token = await getToken({ skipCache: true });
        } catch {
          token = null;
        }
        if (!token) {
          try {
            token = await getToken();
          } catch {
            token = null;
          }
        }

        const headers = new Headers(init.headers);
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        return loggedFetch(url, { ...init, headers }, (u, ini) =>
          fetchWithTimeout(u as string, ini, REQUEST_TIMEOUT_MS),
        );
      };

      let lastRes: Response | null = null;
      let lastErr: unknown = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await doAttempt();
          lastRes = res;

          // Retry on auth failures only — almost always a stale-token race.
          if ((res.status === 401 || res.status === 403) && isSignedIn) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, 300 * attempt));
              continue;
            }
          }
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
            continue;
          }
        }
      }

      if (!lastRes) {
        const msg = lastErr instanceof Error ? lastErr.message : "Network error";
        throw new Error(`Network request failed after ${MAX_ATTEMPTS} attempts: ${msg}`);
      }

      // Pass through expected non-2xx that callers handle:
      //   404 → resource missing
      //   402 → feature_locked / paywall
      if (!lastRes.ok && lastRes.status !== 404 && lastRes.status !== 402) {
        const body = await safeReadBody(lastRes);
        const detail = body ? ` — ${body}` : "";
        const sessHint =
          (lastRes.status === 401 || lastRes.status === 403) && !isSignedIn
            ? " (not signed in — please sign in again)"
            : (lastRes.status === 401 || lastRes.status === 403) && !sessionId
              ? " (no active session)"
              : "";
        throw new Error(`Request failed: ${lastRes.status}${detail}${sessHint}`);
      }
      return lastRes;
    },
    [getToken, isSignedIn, sessionId],
  );

  return authFetch;
}
