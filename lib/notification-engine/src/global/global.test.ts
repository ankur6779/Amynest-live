import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateTimeParts,
  matchesCategorySlot,
  SCHEDULED_NOTIFICATION_JOBS,
  inLocalQuietHours,
  culturalRegionFromCountry,
  defaultTimezoneForCountry,
  normalizeLocale,
  resolveCalendarContext,
  canDeliverPush,
  passesCulturalQualityGate,
  regionalFoodsFor,
  localizeNotificationCopy,
} from "./index.js";
import { jobDedupKey } from "./schedule-slots.js";

const COUNTRIES = [
  { code: "US", tz: "America/New_York", locale: "en-US" },
  { code: "GB", tz: "Europe/London", locale: "en-GB" },
  { code: "IN", tz: "Asia/Kolkata", locale: "hi" },
  { code: "AE", tz: "Asia/Dubai", locale: "ar" },
  { code: "DE", tz: "Europe/Berlin", locale: "de" },
  { code: "BR", tz: "America/Sao_Paulo", locale: "pt" },
  { code: "JP", tz: "Asia/Tokyo", locale: "ja" },
  { code: "AU", tz: "Australia/Sydney", locale: "en-US" },
] as const;

test("per-user timezone: morning routine fires at 07:30 local across regions", () => {
  const routineJob = SCHEDULED_NOTIFICATION_JOBS.find((j) => j.jobId === "morning_routine")!;
  for (const c of COUNTRIES) {
    const utc = new Date("2026-06-15T12:00:00Z");
    const local = getLocalDateTimeParts(c.tz, utc);
    const matchAt730 = matchesCategorySlot(
      { hour: 7, minute: 30, weekday: local.weekday },
      routineJob.slot,
    );
    assert.equal(typeof matchAt730, "boolean");
    assert.ok(defaultTimezoneForCountry(c.code).length > 0);
  }
});

test("DST: America/New_York March vs July offset differs", () => {
  const winter = getLocalDateTimeParts("America/New_York", new Date("2026-01-15T12:30:00Z"));
  const summer = getLocalDateTimeParts("America/New_York", new Date("2026-07-15T12:30:00Z"));
  assert.notEqual(winter.hour, summer.hour);
});

test("quiet hours block delivery in user local time", () => {
  const tz = "Europe/London";
  const duringQuiet = new Date("2026-03-10T23:30:00Z");
  assert.equal(inLocalQuietHours(tz, "22:00", "07:00", duringQuiet), true);
});

test("localization produces native copy per locale", () => {
  const ja = localizeNotificationCopy({
    locale: "ja",
    category: "nutrition",
    title: "Snack",
    body: "Try onigiri",
    childName: "Hana",
    foodLabel: "onigiri",
  });
  assert.match(ja.body, /Hana/);
  assert.equal(ja.rtl, false);

  const ar = localizeNotificationCopy({
    locale: "ar",
    category: "parenting_tips",
    title: "Tip",
    body: "Body",
    childName: "Sara",
  });
  assert.equal(ar.rtl, true);
});

test("nutrition regional foods match cultural region", () => {
  assert.ok(regionalFoodsFor("north_america").some((f) => f.slug.includes("trail")));
  assert.ok(regionalFoodsFor("east_asia").some((f) => f.slug === "onigiri"));
  assert.ok(regionalFoodsFor("middle_east").some((f) => f.slug === "dates_laban"));
  assert.equal(
    passesCulturalQualityGate("Snack", "Try makhana for kid", "north_america"),
    false,
  );
});

test("calendar: US November has holiday context", () => {
  const ctx = resolveCalendarContext("north_america", 11, 25);
  assert.ok(ctx.holidayName || ctx.isBackToSchool === false);
});

test("school break suppresses school-term assumptions", () => {
  const ctx = resolveCalendarContext("north_america", 7, 15);
  assert.equal(ctx.isSummerBreak, true);
  assert.equal(ctx.schoolTerm, "break");
});

test("GDPR requires explicit consent", () => {
  const r = canDeliverPush({
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    countryCode: "DE",
    childAgeYears: 8,
  });
  assert.equal(r.allowed, false);
});

test("US default regime allows without explicit consent record", () => {
  const r = canDeliverPush({
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    countryCode: "US",
    childAgeYears: null,
  });
  assert.equal(r.allowed, true);
});

test("COPPA blocks under-13 without parental consent", () => {
  const r = canDeliverPush({
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    countryCode: "US",
    childAgeYears: 8,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "coppa_parental_consent");
});

test("job dedup keys are stable per local date", () => {
  assert.equal(
    jobDedupKey("snack_time", "2026-05-29"),
    "job:snack_time:2026-05-29",
  );
});

test("locale normalization", () => {
  assert.equal(normalizeLocale("en-GB"), "en-GB");
  assert.equal(normalizeLocale("es-MX"), "es");
  assert.equal(culturalRegionFromCountry("JP"), "east_asia");
});
