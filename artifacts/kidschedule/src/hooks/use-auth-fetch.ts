import { useAuth } from "@/lib/firebase-auth-hooks";
import { waitForIdToken } from "@/lib/auth-token";
import { getFirebaseAuth } from "@/lib/firebase";
import { useCallback, useRef } from "react";
import { loggedFetch } from "@/lib/api-logger";
import { DEFAULT_API_TIMEOUT_MS, fetchWithTimeout } from "@/lib/fetch-with-timeout";

export function useAuthFetch() {
  const { getToken, isSignedIn } = useAuth();
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  const authFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init: RequestInit = {},
      timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
    ): Promise<Response> => {
      const headers = new Headers(init.headers);

      const hasFirebaseSession =
        isSignedInRef.current || !!getFirebaseAuth().currentUser;
      if (hasFirebaseSession) {
        const token = await waitForIdToken(getToken, {
          skipCache: init.method === "POST" || init.method === "PUT",
        });
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        headers.set("Authorization", `Bearer ${token}`);
      }

      const initWithHeaders = { ...init, headers };
      return loggedFetch(input, initWithHeaders, (inp, ini) =>
        fetchWithTimeout(inp, ini, timeoutMs),
      );
    },
    [getToken],
  );

  return authFetch;
}
