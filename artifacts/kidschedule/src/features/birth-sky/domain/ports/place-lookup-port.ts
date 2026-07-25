/**
 * PlaceLookupPort — replaceable birthplace search (Pack 2 §5.3, Phase 3 geocoding/).
 *
 * Nominatim (or any provider) is an adapter. Setup must not hard-depend on one vendor.
 */

export type PlaceLookupResult = {
  label: string;
  lat: number;
  lon: number;
  country?: string | null;
  adminRegion?: string | null;
  timezoneIana?: string | null;
};

export type PlaceLookupErrorCode =
  | "offline"
  | "timeout"
  | "throttled"
  | "provider_error"
  | "empty"
  | "aborted";

export type PlaceLookupFailure = {
  ok: false;
  code: PlaceLookupErrorCode;
  message: string;
};

export type PlaceLookupSuccess = {
  ok: true;
  results: PlaceLookupResult[];
  /** True when results came from a non-network source (e.g. recent cache only). */
  fromCache?: boolean;
};

export type PlaceLookupResponse = PlaceLookupSuccess | PlaceLookupFailure;

export type PlaceLookupPort = {
  readonly providerId: string;
  /** True when this binding is a temporary/dev provider. */
  readonly isTemporaryProvider: boolean;
  search(query: string, options?: { signal?: AbortSignal }): Promise<PlaceLookupResponse>;
};
