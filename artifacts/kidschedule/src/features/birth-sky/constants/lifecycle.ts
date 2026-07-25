/** Pack 7 Addendum A — opaque version constants. */
export const BIRTH_SKY_PRIVACY_POLICY_VERSION = "birth_sky_privacy/1.0.0" as const;
export const BIRTH_SKY_EXPORT_MANIFEST_VERSION = "birth_sky_export/1.0.0" as const;

export type BirthSkyExportType =
  | "summary"
  | "astronomy"
  | "reflections"
  | "conversations";
