/**
 * Responsive architecture contract for LPS Worksheet Studio.
 * Components should consume tokens from worksheet-studio-theme.ts — not ad-hoc pixel widths.
 */

/** QA viewport widths — must never cause horizontal overflow */
export const WS_VIEWPORT_WIDTHS = [
  320, 360, 375, 390, 412, 430, 768, 820, 1024, 1280, 1440,
] as const;

/** Patterns that must not appear in worksheet-studio UI components (editor canvas math excluded) */
export const WS_FORBIDDEN_LAYOUT_PATTERNS = [
  /width:\s*600px/,
  /width:\s*700px/,
  /min-width:\s*600/,
  /w-\[600px\]/,
  /w-\[700px\]/,
  /min-w-\[7rem\]/,
] as const;

/** Files included in responsive layout audit */
export const WS_RESPONSIVE_UI_FILES = [
  "WorksheetHome.tsx",
  "WorksheetPromptComposer.tsx",
  "WorksheetTemplates.tsx",
  "WorksheetOnboarding.tsx",
  "GenerationSummaryDialog.tsx",
  "CopilotChangePreview.tsx",
  "PostGenerationSheet.tsx",
  "PromptHistorySheet.tsx",
  "WorksheetLibrarySheet.tsx",
  "WorksheetBrandingSheet.tsx",
  "WorksheetProductivityHub.tsx",
  "WorksheetDraftHistorySheet.tsx",
  "WorksheetAiAssistant.tsx",
  "WorksheetExportSheet.tsx",
  "WorksheetEditor.tsx",
  "WorksheetGeneratingOverlay.tsx",
  "WorksheetErrorBoundary.tsx",
  "ReferenceAnalysisCard.tsx",
  "PromptQualityMeter.tsx",
  "worksheet-studio-theme.ts",
] as const;

export function auditSourceForForbiddenLayouts(source: string): string[] {
  const hits: string[] = [];
  for (const pattern of WS_FORBIDDEN_LAYOUT_PATTERNS) {
    if (pattern.test(source)) hits.push(pattern.source);
  }
  return hits;
}
