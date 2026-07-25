/**
 * Setup validators (Pack 2 Parts 3–7). Pure — no I/O.
 */

import type { SetupDraft, TimePrecision } from "../models/setup-draft";

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function parseISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function validateBirthDate(iso: string | null | undefined): ValidationResult {
  if (!iso) return { ok: false, code: "date_required", message: "Birth date is required." };
  const dt = parseISODate(iso);
  if (!dt) return { ok: false, code: "date_invalid", message: "Enter a valid date." };
  const min = new Date(1900, 0, 1);
  if (dt < min) {
    return { ok: false, code: "date_too_early", message: "Date must be on or after 1 Jan 1900." };
  }
  if (dt > todayLocal()) {
    return { ok: false, code: "date_future", message: "Date can’t be in the future." };
  }
  return { ok: true };
}

/** Soft warning if age > 25 years (non-blocking once confirmed). */
export function needsAgeSanityWarning(iso: string, confirmed: boolean): boolean {
  if (confirmed) return false;
  const dt = parseISODate(iso);
  if (!dt) return false;
  const today = todayLocal();
  const years =
    (today.getTime() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years > 25;
}

export function validateBirthTime(
  precision: TimePrecision | null,
  time: string | null,
): ValidationResult {
  if (!precision) {
    return { ok: false, code: "time_precision_required", message: "Choose a time option." };
  }
  if (precision === "unknown") {
    if (time != null) {
      return { ok: false, code: "time_must_be_null", message: "Unknown time must not include a clock time." };
    }
    return { ok: true };
  }
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false, code: "time_required", message: "Enter a valid time." };
  }
  const [hh, mm] = time.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return { ok: false, code: "time_invalid", message: "Time must be between 00:00 and 23:59." };
  }
  return { ok: true };
}

export function validateBirthPlace(draft: SetupDraft): ValidationResult {
  if (draft.placeSkipped) return { ok: true };
  if (!draft.birthPlace) {
    return { ok: false, code: "place_required", message: "Select a place or skip for now." };
  }
  const { lat, lon } = draft.birthPlace;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, code: "place_coords_invalid", message: "Place coordinates are invalid." };
  }
  return { ok: true };
}

export function validateConsentStaged(draft: SetupDraft): ValidationResult {
  if (!draft.consent.disclaimerAccepted) {
    return {
      ok: false,
      code: "consent_required",
      message: "Accept the reflective consent to continue.",
    };
  }
  return { ok: true };
}

/** Gates before Create (Pack 2 §7.3). */
export function validateReadyForCreate(draft: SetupDraft): ValidationResult {
  const date = validateBirthDate(draft.birthDate);
  if (!date.ok) return date;
  const time = validateBirthTime(draft.timePrecision, draft.birthTime);
  if (!time.ok) return time;
  const place = validateBirthPlace(draft);
  if (!place.ok) return place;
  const consent = validateConsentStaged(draft);
  if (!consent.ok) return consent;
  return { ok: true };
}

export function isOnlineForCreate(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}
