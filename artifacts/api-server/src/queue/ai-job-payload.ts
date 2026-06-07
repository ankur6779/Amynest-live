/** Standard shape for queued AI work (API → worker). */
export type StandardAiJobPayload = {
  routeName: string;
  input: unknown;
  /** API-only metadata for poll response shaping (worker ignores). */
  pollContext?: unknown;
};

export function wrapJobInput(
  routeName: string,
  input: unknown,
  pollContext?: unknown,
): StandardAiJobPayload {
  const wrapped: StandardAiJobPayload = { routeName, input };
  if (pollContext !== undefined) wrapped.pollContext = pollContext;
  return wrapped;
}

export function unwrapJobPayload(payload: unknown): {
  routeName: string;
  input: unknown;
  pollContext?: unknown;
} {
  if (
    payload &&
    typeof payload === "object" &&
    "input" in payload &&
    "routeName" in payload &&
    typeof (payload as StandardAiJobPayload).routeName === "string"
  ) {
    const p = payload as StandardAiJobPayload;
    return {
      routeName: p.routeName,
      input: p.input,
      pollContext: p.pollContext,
    };
  }
  return { routeName: "legacy", input: payload };
}
