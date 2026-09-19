/**
 * Age × content-module matrix for Hub / Rooms / discovery.
 * Visibility only — entitlement and download gates stay server-side.
 */
import { ageBandFromTotalMonths } from "@/lib/parent-hub/eligibility";
import {
  isHubSectionVisible,
  isRoomsInfantPreviewTile,
  type HubSectionVisibilityInput,
} from "@/lib/hub-visibility";

export const CONTENT_DELIVERY_MODULE_IDS = [
  "infant-hub",
  "coloring-books",
  "fun-sheets",
  "worksheets",
  "answer-to-kids-how",
  "art-craft",
  "story-hub",
  "activities",
] as const;

export type ContentDeliveryModuleId =
  (typeof CONTENT_DELIVERY_MODULE_IDS)[number];

export type VisibilityCell =
  | "VISIBLE"
  | "PREVIEW"
  | "HIDDEN"
  | "NOT_APPLICABLE";

export const CONTENT_MODULE_SECTIONS: Record<
  ContentDeliveryModuleId,
  HubSectionVisibilityInput
> = {
  "infant-hub": { id: "infant-hub", bands: ["0-2"] },
  "coloring-books": {
    id: "coloring-books",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
  },
  "fun-sheets": {
    id: "fun-sheets",
    bands: ["2-4", "4-6", "6-8", "8-10", "10-12", "12-15"],
  },
  worksheets: { id: "worksheets", alwaysCurrent: true },
  "answer-to-kids-how": { id: "answer-to-kids-how", alwaysCurrent: true },
  "art-craft": { id: "art-craft", alwaysCurrent: true },
  "story-hub": { id: "story-hub", bands: ["0-2", "2-4", "4-6", "6-8"] },
  activities: { id: "activities", alwaysCurrent: true },
};

/** Representative ages for the product's infant + child taxonomy. */
export const CONTENT_DELIVERY_AGE_SAMPLES = [
  { id: "newborn", label: "Newborn", months: 1 },
  { id: "m3", label: "3 months", months: 3 },
  { id: "m6", label: "6 months", months: 6 },
  { id: "m9", label: "9 months", months: 9 },
  { id: "m12", label: "12 months", months: 12 },
  { id: "m18", label: "18 months", months: 18 },
  { id: "m23", label: "23 months", months: 23 },
  { id: "toddler", label: "Toddler 2y", months: 30 },
  { id: "preschool", label: "Preschool 4y", months: 48 },
  { id: "school", label: "School 6y", months: 72 },
  { id: "older", label: "Older 10y", months: 120 },
] as const;

export function contentModuleVisibility(
  moduleId: ContentDeliveryModuleId,
  ageMonths: number,
): VisibilityCell {
  const section = CONTENT_MODULE_SECTIONS[moduleId];
  const band = ageBandFromTotalMonths(ageMonths);
  const visible = isHubSectionVisible(section, band, ageMonths);
  if (!visible) return "HIDDEN";
  if (isRoomsInfantPreviewTile(moduleId) && ageMonths < 24) return "PREVIEW";
  return "VISIBLE";
}

export function buildContentAgeMatrix(): Record<
  string,
  Record<ContentDeliveryModuleId, VisibilityCell>
> {
  const matrix = {} as Record<
    string,
    Record<ContentDeliveryModuleId, VisibilityCell>
  >;
  for (const sample of CONTENT_DELIVERY_AGE_SAMPLES) {
    const row = {} as Record<ContentDeliveryModuleId, VisibilityCell>;
    for (const id of CONTENT_DELIVERY_MODULE_IDS) {
      row[id] = contentModuleVisibility(id, sample.months);
    }
    matrix[sample.id] = row;
  }
  return matrix;
}
