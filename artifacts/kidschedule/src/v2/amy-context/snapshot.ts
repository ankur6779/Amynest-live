/**
 * Developer helper — reads Memory via Memory API, then resolves Context.
 * Resolver itself never touches storage.
 */

import { getAmyMemorySnapshot } from "@/v2/amy-memory";
import { resolveAmyContext } from "./resolve";
import type { AmyContext, ResolveAmyContextOptions } from "./types";

/** Current AmyContext from current Amy Memory, or null if no Memory. */
export function getAmyContextSnapshot(
  options: ResolveAmyContextOptions = {},
): AmyContext | null {
  const memory = getAmyMemorySnapshot();
  if (!memory) return null;
  return resolveAmyContext(memory, options);
}
