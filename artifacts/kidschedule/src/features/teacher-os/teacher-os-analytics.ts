/**
 * v8.1 — bridges Worksheet Studio events → Teacher OS product analytics.
 * Non-blocking; safe in SSR/tests.
 */
import {
  completeOnboardingStep,
  recordHealthEvent,
  recordPerfMetric,
  startProductSession,
  endProductSession,
  trackProductEvent,
  type OnboardingStepId,
} from "@workspace/teacher-os";
import type { TeacherOsModuleId } from "@workspace/teacher-os";

let sessionStartedAt = 0;

export function initTeacherOsSession(): void {
  sessionStartedAt = Date.now();
  startProductSession();
}

export function endTeacherOsSession(): void {
  if (sessionStartedAt > 0) {
    endProductSession(Date.now() - sessionStartedAt);
    sessionStartedAt = 0;
  }
}

export function trackTeacherOsModule(module: TeacherOsModuleId): void {
  trackProductEvent("module_open", { module });
  if (module === "studio") {
    markOnboardingStep("open_studio");
  }
}

export function markOnboardingStep(step: OnboardingStepId): void {
  completeOnboardingStep(step);
  trackProductEvent("onboarding_step", { step });
}

export function bridgeWorksheetEvent(
  event: string,
  props?: Record<string, string | number | boolean>,
): void {
  const map: Record<string, Parameters<typeof trackProductEvent>[0]> = {
    worksheet_generate_start: "worksheet_generate_start",
    worksheet_generate_done: "worksheet_generate_done",
    worksheet_export_pdf: "export_pdf",
    worksheet_prompt_enhance: "prompt_enhance",
    worksheet_reference_upload: "reference_upload",
    worksheet_vision_analyze: "vision_analyze",
    worksheet_pack_generate: "homework_pack",
    worksheet_error: "api_failure",
    worksheet_reconstruct_done: "worksheet_generate_done",
  };

  const type = map[event];
  if (type) {
    trackProductEvent(type, { ...props, module: "studio" });
  }

  if (event === "worksheet_generate_done") {
    markOnboardingStep("generate_first_worksheet");
    if (props?.usedFallback) trackProductEvent("ai_fallback", props);
    else trackProductEvent("ai_accept", props);
    if (props?.durationMs) recordPerfMetric("ai_latency", Number(props.durationMs));
    if (props?.qualityScore) trackProductEvent("worksheet_generate_done", { qualityScore: props.qualityScore });
  }
  if (event === "worksheet_export_pdf") {
    markOnboardingStep("export_pdf");
    if (props?.durationMs) recordPerfMetric("export", Number(props.durationMs));
  }
  if (event === "worksheet_pack_generate") {
    markOnboardingStep("create_homework");
    trackProductEvent("homework_pack", props);
  }
  if (event === "worksheet_error") {
    recordHealthEvent("api_failure", String(props?.message ?? event));
  }
}

export function trackLessonCreated(): void {
  trackProductEvent("lesson_create_done", { module: "dashboard" });
  markOnboardingStep("create_first_lesson");
}

export function trackTeachingPackCreated(): void {
  trackProductEvent("teaching_pack", { module: "teaching_pack" });
  markOnboardingStep("create_first_lesson");
  markOnboardingStep("create_homework");
}

export function trackDropOff(point: string): void {
  trackProductEvent("drop_off", { point });
}

export function trackExportFailure(format: "pdf" | "docx", detail?: string): void {
  recordHealthEvent("export_failure", detail);
  trackProductEvent("export_failure", { format, detail: detail?.slice(0, 80) ?? "" });
}

export function trackManualEditBeforeExport(): void {
  trackProductEvent("manual_edit_before_export");
}

export function trackOfflineFallback(context: string): void {
  recordHealthEvent("offline_fallback", context);
}

export function trackVisionFailure(detail?: string): void {
  recordHealthEvent("vision_failure", detail);
}

export function trackRecoverySuccess(): void {
  recordHealthEvent("recovery_success");
}

export function trackEditorLoad(ms: number): void {
  recordPerfMetric("editor_load", ms);
}

export function trackFirstInteraction(ms: number): void {
  recordPerfMetric("first_interaction", ms);
}
