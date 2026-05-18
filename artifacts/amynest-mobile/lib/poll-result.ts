import { API_BASE_URL } from "@/constants/api";

export type AuthFetchFn = (path: string, init?: RequestInit) => Promise<Response>;

function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${p}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hasAsyncJobId(data: unknown): data is { jobId: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { jobId?: unknown }).jobId === "string" &&
    (data as { jobId: string }).jobId.length > 0
  );
}

export async function pollResult(
  jobId: string,
  authFetch: AuthFetchFn,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<unknown> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await wait(intervalMs);
    const res = await authFetch(apiUrl(`/api/result/${jobId}`), { method: "GET" });
    const data = (await res.json()) as {
      status?: string;
      result?: unknown;
      error?: string;
    };
    if (data.status === "completed") return data.result;
    if (data.status === "failed") {
      throw new Error(data.error ?? "AI job failed");
    }
  }
  throw new Error("Timeout");
}

export async function resolveAiApiData<T>(
  data: unknown,
  authFetch: AuthFetchFn,
): Promise<T> {
  if (hasAsyncJobId(data)) {
    const result = await pollResult(data.jobId, authFetch);
    return result as T;
  }
  return data as T;
}

export async function parseResponseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function readResolvedApiJson<T>(
  res: Response,
  authFetch: AuthFetchFn,
): Promise<T> {
  const raw = await parseResponseJson(res);
  return resolveAiApiData<T>(raw, authFetch);
}
