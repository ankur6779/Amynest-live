/**
 * Birth Sky Phase 2 — living room hierarchy helpers.
 * Presentation only. No engine / calculation / intelligence changes.
 *
 * Emotional target: understanding — not astrology software.
 */

export type BirthSkyRecommend = {
  id: "begin";
  label: string;
  title: string;
  purpose: string;
};

export type BirthSkyQuietPath = {
  id: "portrait" | "patterns" | "reflect";
  title: string;
  purpose: string;
};

/** Quiet understanding paths — not a feature mall. */
export const BIRTH_SKY_QUIET_PATHS: readonly BirthSkyQuietPath[] = [
  {
    id: "portrait",
    title: "Soft portrait",
    purpose: "See who they are — gently",
  },
  {
    id: "patterns",
    title: "Gentle patterns",
    purpose: "Notice temperament without labels",
  },
  {
    id: "reflect",
    title: "Reflect with Amy",
    purpose: "Ask when you're ready — never fate",
  },
] as const;

/** One recommended Understand act for a tired parent. */
export function recommendBirthSkyAction(): BirthSkyRecommend {
  return {
    id: "begin",
    label: "Start here",
    title: "See them more clearly",
    purpose: "One calm step into soft understanding",
  };
}

/** Flag — Birth Sky living room manufacturing. Default ON. */
export function isBirthSkyLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_BIRTH_SKY_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
