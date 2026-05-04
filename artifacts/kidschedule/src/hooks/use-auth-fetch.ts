import { useAuth } from "@/lib/firebase-auth-hooks";
import { useCallback } from "react";
import { loggedFetch } from "@/lib/api-logger";

export function useAuthFetch() {
  const { getToken } = useAuth();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const initWithHeaders = { ...init, headers };
      return loggedFetch(input, initWithHeaders, (inp, ini) => fetch(inp, ini));
    },
    [getToken],
  );

  return authFetch;
}
