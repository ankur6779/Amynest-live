export type FirebaseBootStatus = "pending" | "ok" | "fail";

export type AuthBootStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "timeout";

export type BootDiagnostics = {
  hostname: string;
  route: string;
  firebaseStatus: FirebaseBootStatus;
  firebaseError: string | null;
  authStatus: AuthBootStatus;
  authUserLabel: string;
  lastError: string | null;
  appVersion: string;
};

const APP_VERSION =
  (typeof document !== "undefined"
    ? document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content")
    : null) ?? "unknown";

function initialState(): BootDiagnostics {
  return {
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    route: typeof window !== "undefined" ? window.location.pathname : "",
    firebaseStatus: "pending",
    firebaseError: null,
    authStatus: "loading",
    authUserLabel: "—",
    lastError: null,
    appVersion: APP_VERSION,
  };
}

let state = initialState();
const listeners = new Set<() => void>();

export function getBootDiagnostics(): BootDiagnostics {
  return state;
}

export function patchBootDiagnostics(patch: Partial<BootDiagnostics>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeBootDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordBootError(source: string, err: unknown): void {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err ?? "unknown");
  const line = `${source}: ${message}`;
  console.error("[amynest:boot]", line, err);
  patchBootDiagnostics({ lastError: line });
}

export function syncBootRoute(pathname: string): void {
  patchBootDiagnostics({ route: pathname });
}
