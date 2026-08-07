import { track } from "@/lib/analytics";
import { trackRoutineCtaClicked } from "@/lib/first-value-telemetry";
import type { TodayNrtSource } from "./resolve-today-nrt";

const shownOnce = new Set<string>();

/** Additive Home NRT impression — once per child/source per session. */
export function trackTodayNrtShown(input: {
  source: TodayNrtSource;
  childId?: number | null;
  hasCta: boolean;
}): void {
  const key = `today_nrt_shown:${input.childId ?? "none"}:${input.source}`;
  if (shownOnce.has(key)) return;
  shownOnce.add(key);
  track("today_nrt_shown", {
    nrt_source: input.source,
    child_id: input.childId ?? undefined,
    has_cta: input.hasCta,
    screen: "/dashboard",
  });
}

/** Begin / rest CTA — also emits existing routine_cta_clicked for funnels. */
export function trackTodayNrtCta(input: {
  source: TodayNrtSource;
  childId?: number | null;
  ctaKind: string;
  userState?: string;
}): void {
  track("today_nrt_cta", {
    nrt_source: input.source,
    child_id: input.childId ?? undefined,
    cta_kind: input.ctaKind,
    screen: "/dashboard",
  });
  if (input.ctaKind === "begin_routine" || input.ctaKind === "generate") {
    trackRoutineCtaClicked({
      source: "today_nrt_hero",
      screen: "/dashboard",
      childId: input.childId ?? undefined,
      userState: input.userState,
    });
  }
}
