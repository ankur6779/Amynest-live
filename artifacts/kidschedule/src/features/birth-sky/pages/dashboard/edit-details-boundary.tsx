/**
 * Edit Birth Details entry (Pack 7 / IM-5) — replaces IM-2 nav-only stub.
 * Historical snapshots remain immutable; save triggers regenerate overlay host.
 */

export { BirthSkyEditBirthDetailsPage as BirthSkyEditDetailsBoundaryPage } from "../settings/edit-birth-details-page";

/** Seam marker for tests — full edit+regen path is live. */
export const BIRTH_SKY_EDIT_DETAILS_SEAM = "im5_edit_and_regenerate" as const;
