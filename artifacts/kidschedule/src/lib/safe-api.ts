import { logError } from "@/lib/crash-logger";

export type SafeApiFallback = {
  success: false;
  fallback: true;
  data: Record<string, never>;
  error?: string;
};

export type SafeApiResult<T> = T | SafeApiFallback;

export function isSafeApiFallback<T>(value: SafeApiResult<T>): value is SafeApiFallback {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as SafeApiFallback).success === false &&
    (value as SafeApiFallback).fallback === true
  );
}

/** Wrap any async API call — logs failures and returns a structured fallback. */
export async function safeAPI<T>(
  call: () => Promise<T>,
  context = "api",
): Promise<SafeApiResult<T>> {
  try {
    return await call();
  } catch (e) {
    logError(e, `API FAIL:${context}`);
    return {
      success: false,
      fallback: true,
      data: {},
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Parse JSON from a fetch Response without throwing. */
export async function safeParseJson<T>(res: Response, context = "parse"): Promise<SafeApiResult<T>> {
  return safeAPI(async () => {
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }, context);
}
