/**
 * @deprecated Use getPlaceLookupPort() — kept as thin re-export for any stragglers.
 */

export type { PlaceLookupResult as PlaceSearchResult } from "../../domain/ports/place-lookup-port";
export { loadRecentPlaces, pushRecentPlace } from "./recent-places";
export { getPlaceLookupPort } from "./resolve-place-lookup";

import { getPlaceLookupPort } from "./resolve-place-lookup";
import type { PlaceLookupResult } from "../../domain/ports/place-lookup-port";

/** @deprecated Prefer getPlaceLookupPort().search — throws only on programmer misuse. */
export async function searchBirthPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceLookupResult[]> {
  const res = await getPlaceLookupPort().search(query, { signal });
  if (!res.ok) {
    if (res.code === "aborted") {
      throw new DOMException("Aborted", "AbortError");
    }
    throw new Error(res.code);
  }
  return res.results;
}
