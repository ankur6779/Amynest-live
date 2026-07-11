/**
 * Child onboarding journey forensics events — one view + complete pair per screen.
 * Persisted via startup_funnel_events (POST /api/startup-funnel-events).
 */
export const CHILD_JOURNEY_VIEW_EVENTS = [
  "child_name_view",
  "child_age_view",
  "child_birthday_view",
  "feeding_view",
  "education_stage_view",
  "school_schedule_view",
  "school_days_view",
  "school_start_view",
  "school_end_view",
  "wake_time_view",
  "sleep_time_view",
  "parent_segment_view",
] as const;

export const CHILD_JOURNEY_COMPLETE_EVENTS = [
  "child_name_complete",
  "child_age_complete",
  "child_birthday_complete",
  "feeding_complete",
  "education_stage_complete",
  "school_schedule_complete",
  "school_days_complete",
  "school_start_complete",
  "school_end_complete",
  "wake_time_complete",
  "sleep_time_complete",
  "parent_segment_enter",
] as const;

/** Supplemental screens not in the original checklist but on the live code path. */
export const CHILD_JOURNEY_SUPPLEMENTAL_EVENTS = [
  "infant_sleep_view",
  "infant_sleep_complete",
  "class_grade_view",
  "class_grade_complete",
  "child_journey_background",
] as const;

export const CHILD_JOURNEY_EVENT_NAMES = [
  ...CHILD_JOURNEY_VIEW_EVENTS,
  ...CHILD_JOURNEY_COMPLETE_EVENTS,
  ...CHILD_JOURNEY_SUPPLEMENTAL_EVENTS,
] as const;

export type ChildJourneyEventName = (typeof CHILD_JOURNEY_EVENT_NAMES)[number];

export type ChildJourneyOnboardingStep =
  | "child-name"
  | "child-dob"
  | "child-birthday"
  | "infant-feeding"
  | "infant-sleep"
  | "child-education-stage"
  | "child-class-grade"
  | "child-schedule-known"
  | "child-school-start"
  | "child-school-end"
  | "child-school-days"
  | "child-wake"
  | "child-sleep"
  | "parent-name";

export const CHILD_JOURNEY_STEP_VIEW_EVENT: Record<
  ChildJourneyOnboardingStep,
  ChildJourneyEventName
> = {
  "child-name": "child_name_view",
  "child-dob": "child_age_view",
  "child-birthday": "child_birthday_view",
  "infant-feeding": "feeding_view",
  "infant-sleep": "infant_sleep_view",
  "child-education-stage": "education_stage_view",
  "child-class-grade": "class_grade_view",
  "child-schedule-known": "school_schedule_view",
  "child-school-start": "school_start_view",
  "child-school-end": "school_end_view",
  "child-school-days": "school_days_view",
  "child-wake": "wake_time_view",
  "child-sleep": "sleep_time_view",
  "parent-name": "parent_segment_view",
};

export const CHILD_JOURNEY_STEP_COMPLETE_EVENT: Record<
  ChildJourneyOnboardingStep,
  ChildJourneyEventName
> = {
  "child-name": "child_name_complete",
  "child-dob": "child_age_complete",
  "child-birthday": "child_birthday_complete",
  "infant-feeding": "feeding_complete",
  "infant-sleep": "infant_sleep_complete",
  "child-education-stage": "education_stage_complete",
  "child-class-grade": "class_grade_complete",
  "child-schedule-known": "school_schedule_complete",
  "child-school-start": "school_start_complete",
  "child-school-end": "school_end_complete",
  "child-school-days": "school_days_complete",
  "child-wake": "wake_time_complete",
  "child-sleep": "sleep_time_complete",
  "parent-name": "parent_segment_enter",
};
