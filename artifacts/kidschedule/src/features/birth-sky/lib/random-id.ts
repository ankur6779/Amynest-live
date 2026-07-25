/** Browser-safe id helper for local Birth Sky entities. */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
