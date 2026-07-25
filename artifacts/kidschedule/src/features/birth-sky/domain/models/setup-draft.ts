/**
 * SetupDraft — local until consent+create (Phase 3 §5.3, Pack 2).
 */

export type TimePrecision = "exact" | "approximate" | "unknown";

export type BirthPlaceDraft = {
  label: string;
  lat: number;
  lon: number;
  timezoneIana?: string | null;
  country?: string | null;
  adminRegion?: string | null;
};

export type SetupDraftConsent = {
  disclaimerAccepted: boolean;
  consentVersion: string | null;
  acceptedAt: string | null;
  scopes: string[];
};

export type SetupStepId =
  | "child"
  | "date"
  | "time"
  | "place"
  | "consent"
  | "review";

export type SetupDraft = {
  childId: number;
  childName?: string;
  currentStep: SetupStepId;
  birthDate: string | null;
  birthTime: string | null;
  timePrecision: TimePrecision | null;
  birthPlace: BirthPlaceDraft | null;
  placeSkipped: boolean;
  consent: SetupDraftConsent;
  ageSanityConfirmed: boolean;
  dirty: boolean;
  updatedAt: string;
};

export function createEmptySetupDraft(
  childId: number,
  childName?: string,
  prefillDob?: string | null,
): SetupDraft {
  return {
    childId,
    childName,
    currentStep: "child",
    birthDate: prefillDob && /^\d{4}-\d{2}-\d{2}$/.test(prefillDob) ? prefillDob : null,
    birthTime: null,
    timePrecision: null,
    birthPlace: null,
    placeSkipped: false,
    consent: {
      disclaimerAccepted: false,
      consentVersion: null,
      acceptedAt: null,
      scopes: [],
    },
    ageSanityConfirmed: false,
    dirty: false,
    updatedAt: new Date().toISOString(),
  };
}
