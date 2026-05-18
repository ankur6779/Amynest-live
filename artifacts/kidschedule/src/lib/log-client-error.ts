import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

export type ClientErrorPayload = {
  message: string;
  stack?: string;
  label?: string;
  meta?: Record<string, unknown>;
};

async function bearerToken(): Promise<string | null> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Log to console and POST to /api/logs (alias /api/log-client-error).
 * Best-effort — never throws.
 */
export async function logClientError(payload: ClientErrorPayload): Promise<void> {
  const { message, stack, label, meta } = payload;
  console.error("[client-error]", label ?? "app", message, stack ?? "", meta ?? {});

  if (typeof window === "undefined") return;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = await bearerToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const body = {
      type: "crash" as const,
      message: message.slice(0, 4000),
      context: label?.slice(0, 256),
      route: window.location.pathname,
      meta: {
        stack: stack?.slice(0, 8000),
        href: window.location.href,
        ...meta,
      },
    };

    const urls = [getApiUrl("/api/logs"), getApiUrl("/api/log-client-error")];
    for (const url of urls) {
      try {
        await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          keepalive: true,
        });
        break;
      } catch {
        /* try alias */
      }
    }
  } catch {
    /* telemetry must not crash the app */
  }
}
