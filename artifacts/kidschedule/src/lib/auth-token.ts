/** Wait for Firebase `currentUser` + ID token (can lag behind React auth state). */
export async function waitForIdToken(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
  opts?: { skipCache?: boolean; maxAttempts?: number; delayMs?: number },
): Promise<string | null> {
  const maxAttempts = opts?.maxAttempts ?? 12;
  const delayMs = opts?.delayMs ?? 150;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = await getToken(
      opts?.skipCache ? { skipCache: true } : undefined,
    );
    if (token) return token;
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}
