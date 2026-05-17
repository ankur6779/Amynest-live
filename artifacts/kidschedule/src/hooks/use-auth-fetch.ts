import { useAuth } from "@/lib/firebase-auth-hooks";
import { waitForIdToken } from "@/lib/auth-token";
import { useCallback } from "react";
import { loggedFetch } from "@/lib/api-logger";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export function useAuthFetch() {
  const { getToken, isSignedIn } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);

      if (isSignedIn) {
        const token = await waitForIdToken(getToken);
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        headers.set("Authorization", `Bearer ${token}`);
      }

      const initWithHeaders = { ...init, headers };
      return loggedFetch(input, initWithHeaders, (inp, ini) => fetchWithTimeout(inp, ini));
    },
    [getToken, isSignedIn],
  );

  return authFetch;
}
