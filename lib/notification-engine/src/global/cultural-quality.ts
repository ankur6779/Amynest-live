import type { CulturalRegion } from "./locales.js";
import type { PoolContentItem } from "../types.js";

/** Region-specific terms that should not appear outside their region. */
const REGION_EXCLUSIVE_TERMS: Array<{ term: string; regions: CulturalRegion[] }> = [
  { term: "makhana", regions: ["south_asia"] },
  { term: "poha", regions: ["south_asia"] },
  { term: "idli", regions: ["south_asia"] },
  { term: "onigiri", regions: ["east_asia"] },
  { term: "laban", regions: ["middle_east"] },
  { term: "trail mix", regions: ["north_america", "europe", "oceania"] },
  { term: "maths", regions: ["europe", "oceania", "south_asia"] },
  { term: "grade", regions: ["north_america"] },
  { term: "year ", regions: ["europe", "oceania"] },
];

export function passesCulturalQualityGate(
  title: string,
  body: string,
  userRegion: CulturalRegion,
  item?: PoolContentItem,
): boolean {
  const text = `${title} ${body}`.toLowerCase();

  for (const { term, regions } of REGION_EXCLUSIVE_TERMS) {
    if (text.includes(term) && !regions.includes(userRegion)) {
      return false;
    }
  }

  const itemRegions = (item as PoolContentItem & { regions?: CulturalRegion[] })?.regions;
  if (itemRegions && itemRegions.length > 0 && !itemRegions.includes(userRegion)) {
    return false;
  }

  return true;
}
