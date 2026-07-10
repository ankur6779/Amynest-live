/** AmyNest Teacher OS v8.1 — pilot, analytics & onboarding types */

import type { TeacherOsModuleId } from "./types.js";

export type OnboardingStepId =
  | "create_first_lesson"
  | "generate_first_worksheet"
  | "export_pdf"
  | "open_studio"
  | "create_homework";

export interface OnboardingProgress {
  completed: OnboardingStepId[];
  skipped: boolean;
  startedAt: string;
  completedAt?: string;
}

export type ProductEventType =
  | "session_start"
  | "session_end"
  | "module_open"
  | "lesson_create_start"
  | "lesson_create_done"
  | "worksheet_generate_start"
  | "worksheet_generate_done"
  | "export_pdf"
  | "export_docx"
  | "export_print"
  | "prompt_enhance"
  | "reference_upload"
  | "vision_analyze"
  | "homework_pack"
  | "teaching_pack"
  | "onboarding_step"
  | "onboarding_skip"
  | "onboarding_complete"
  | "feature_tip_shown"
  | "feature_tip_clicked"
  | "feedback_submit"
  | "satisfaction_rating"
  | "ai_accept"
  | "ai_fallback"
  | "manual_edit_before_export"
  | "drop_off"
  | "api_failure"
  | "offline_fallback"
  | "export_failure"
  | "vision_failure"
  | "crash"
  | "recovery_success"
  | "perf_mark";

export interface ProductAnalyticsEvent {
  type: ProductEventType;
  at: string;
  sessionId: string;
  module?: TeacherOsModuleId;
  durationMs?: number;
  props?: Record<string, string | number | boolean>;
}

export interface FeatureDiscoveryTip {
  id: string;
  feature: string;
  message: string;
  module: TeacherOsModuleId;
  minSessions: number;
}

export interface SatisfactionRecord {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  context: string;
  at: string;
}

export interface ReleaseHealthReport {
  crashFreeSessions: number;
  totalSessions: number;
  apiFailures: number;
  offlineFallbacks: number;
  pdfExportFailures: number;
  docxExportFailures: number;
  visionFailures: number;
  recoverySuccesses: number;
  crashFreeRate: number;
}

export interface QualityDashboardData {
  mostUsedFeatures: Array<{ feature: string; count: number }>;
  leastUsedFeatures: Array<{ feature: string; count: number }>;
  avgWorksheetQuality: number;
  avgLessonQuality: number;
  moduleUsage: Array<{ module: string; count: number }>;
  errors: number;
  avgAiLatencyMs: number;
  offlineUsage: number;
  exportRate: number;
  promptEnhanceRate: number;
  aiAcceptanceRate: number;
  avgSessionDurationMs: number;
  dropOffPoints: Array<{ point: string; count: number }>;
}

export interface PerformanceSnapshot {
  aiLatencyMs: number[];
  editorLoadMs: number[];
  timeToFirstInteractionMs: number[];
  timeToExportMs: number[];
  updatedAt: string;
}

export interface PilotDiagnosticsBundle {
  exportedAt: string;
  pilotMode: boolean;
  sessionCount: number;
  events: ProductAnalyticsEvent[];
  onboarding: OnboardingProgress;
  health: ReleaseHealthReport;
  quality: QualityDashboardData;
  performance: PerformanceSnapshot;
  satisfaction: SatisfactionRecord[];
}

export type FeedbackKind = "feedback" | "issue" | "suggestion";

export interface TeacherOsFeedbackPayload {
  kind: FeedbackKind;
  message: string;
  screenshotDataUrl?: string;
  worksheetMeta?: { title: string; topic: string; id: string };
  /** Future-ready — not collected in v8.1 UI */
  voiceNoteUrl?: string;
}
