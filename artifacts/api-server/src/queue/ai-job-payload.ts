/** Standard shape for queued AI work (API → worker). */
export type StandardAiJobPayload = {
  routeName: string;
  input: unknown;
};

export function wrapJobInput(routeName: string, input: unknown): StandardAiJobPayload {
  return { routeName, input };
}

export function unwrapJobPayload(payload: unknown): {
  routeName: string;
  input: unknown;
} {
  if (
    payload &&
    typeof payload === "object" &&
    "input" in payload &&
    "routeName" in payload &&
    typeof (payload as StandardAiJobPayload).routeName === "string"
  ) {
    const p = payload as StandardAiJobPayload;
    return { routeName: p.routeName, input: p.input };
  }
  return { routeName: "legacy", input: payload };
}
