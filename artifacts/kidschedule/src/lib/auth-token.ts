const GET_TOKEN_ATTEMPT_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, ms);
    void promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Wait for Firebase `currentUser` + ID token (can lag behind React auth state). */
export async function waitForIdToken(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
  opts?: { skipCache?: boolean; maxAttempts?: number; delayMs?: number },
): Promise<string | null> {
  const maxAttempts = opts?.maxAttempts ?? 12;
  const delayMs = opts?.delayMs ?? 150;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = await withTimeout(
      getToken(opts?.skipCache ? { skipCache: true } : undefined),
      GET_TOKEN_ATTEMPT_TIMEOUT_MS,
    );
    if (token) return token;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}
