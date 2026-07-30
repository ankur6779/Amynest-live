/**
 * Birth Sky export bundle builder (Pack 7 §6 + Addendum A).
 * Default omits precise geo. Never invent alternate formats.
 */

export const BIRTH_SKY_EXPORT_MANIFEST_VERSION = "birth_sky_export/1.0.0" as const;
export const BIRTH_SKY_PRIVACY_POLICY_VERSION = "birth_sky_privacy/1.0.0" as const;

export type ExportType = "summary" | "astronomy" | "reflections" | "conversations";

export type ExportBundle = {
  manifest: {
    exportManifestVersion: typeof BIRTH_SKY_EXPORT_MANIFEST_VERSION;
    export_type: ExportType;
    generatedAt: string;
    appBuild: string;
    disclaimer: true;
  };
  payload: Record<string, unknown>;
};

type ProfileLike = {
  birthDate: string;
  timePrecision: string;
  birthPlace: { label?: string } | null;
  privacyPolicyVersion?: string | null;
};

type SnapshotLike = {
  snapshotVersion: string;
  engineVersion: string;
  mode: string;
  computedAt: string;
  // Drizzle jsonb may type as unknown; readers narrow fields below.
  astronomy: unknown;
} | null;

function astronomyFacts(astronomy: unknown): {
  sunSign: string | null;
  moonSign: string | null;
  moonPhaseLabel: string | null;
  risingSign: string | null;
} {
  const a =
    astronomy && typeof astronomy === "object"
      ? (astronomy as Record<string, unknown>)
      : {};
  return {
    sunSign: typeof a.sunSign === "string" ? a.sunSign : null,
    moonSign: typeof a.moonSign === "string" ? a.moonSign : null,
    moonPhaseLabel: typeof a.moonPhaseLabel === "string" ? a.moonPhaseLabel : null,
    risingSign: typeof a.risingSign === "string" ? a.risingSign : null,
  };
}

export function buildBirthSkyExportBundle(input: {
  exportType: ExportType;
  childFirstName: string;
  profile: ProfileLike;
  snapshot: SnapshotLike;
  reflections: Array<{ reflectionId: string; promptId: string; body: string; createdAt: string }>;
  conversations: Array<{
    conversationId: string;
    messages: Array<{ role: string; body: string; createdAt: string }>;
  }>;
  appBuild?: string;
}): ExportBundle {
  const manifest = {
    exportManifestVersion: BIRTH_SKY_EXPORT_MANIFEST_VERSION,
    export_type: input.exportType,
    generatedAt: new Date().toISOString(),
    appBuild: input.appBuild ?? process.env.APP_BUILD ?? "unknown",
    disclaimer: true as const,
  };

  const disclaimerText =
    "Birth Sky is reflective and optional — not a scientific prediction about a child’s future.";

  let payload: Record<string, unknown> = {};

  if (input.exportType === "summary") {
    const facts = astronomyFacts(input.snapshot?.astronomy);
    payload = {
      childFirstName: input.childFirstName,
      birthDate: input.profile.birthDate,
      mode: input.snapshot?.mode ?? null,
      timePrecision: input.profile.timePrecision,
      placeProvided: Boolean(input.profile.birthPlace),
      snapshotVersion: input.snapshot?.snapshotVersion ?? null,
      engineVersion: input.snapshot?.engineVersion ?? null,
      essence: input.snapshot
        ? `${input.childFirstName} arrived under a ${facts.moonPhaseLabel ?? "night"} sky.`
        : null,
      disclaimer: disclaimerText,
    };
  } else if (input.exportType === "astronomy") {
    const facts = astronomyFacts(input.snapshot?.astronomy);
    const a =
      input.snapshot?.astronomy && typeof input.snapshot.astronomy === "object"
        ? (input.snapshot.astronomy as Record<string, unknown>)
        : {};
    payload = {
      snapshotVersion: input.snapshot?.snapshotVersion ?? null,
      engineVersion: input.snapshot?.engineVersion ?? null,
      mode: input.snapshot?.mode ?? null,
      computedAt: input.snapshot?.computedAt ?? null,
      facts: {
        sunSign: facts.sunSign,
        moonSign: facts.moonSign,
        moonPhaseLabel: facts.moonPhaseLabel,
        risingSign: input.snapshot?.mode === "day_sky" ? null : facts.risingSign,
      },
      houses: a.houses ?? null,
      planetHouseMap: a.planetHouseMap ?? null,
      houseDetails: a.houseDetails ?? null,
      planetDetails: a.planetDetails ?? null,
      chartCompleteness: a.chartCompleteness ?? null,
      lagna: a.lagna ?? null,
      // Precise geo intentionally omitted (Pack 7 §6.1 default).
      disclaimer: disclaimerText,
    };
  } else if (input.exportType === "reflections") {
    payload = {
      reflections: input.reflections,
      disclaimer: disclaimerText,
    };
  } else {
    payload = {
      conversations: input.conversations,
      disclaimer: disclaimerText,
    };
  }

  return { manifest, payload };
}

export function isSupportedExportManifestVersion(version: string): boolean {
  return version === BIRTH_SKY_EXPORT_MANIFEST_VERSION;
}
