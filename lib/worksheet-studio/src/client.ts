export * from "./auto-save.js";
export * from "./export/pdf-export.js";
export * from "./export/docx-export.js";
export * from "./export/vector-pdf-export.js";
export * from "./export/image-export.js";
export * from "./teacher-library.js";
export { prepareWorksheetForExport, finalizeWorksheet } from "./worksheet-pipeline.js";
export { applyPrintMode, PRINT_MODE_LABELS, type PrintMode } from "./print-optimizer.js";
export {
  exportDocumentPdf,
  exportBulkPdfs,
  exportBulkZip,
  createShareablePdfBlob,
} from "./bulk-export.js";
export {
  recordStudioAnalytics,
  getAnalyticsDashboard,
  createShareLinkMeta,
  getShareUrl,
  type AnalyticsDashboard,
  type AnalyticsEvent,
} from "./worksheet-analytics.js";
export {
  getActiveBrandingProfile,
  listSchoolProfiles,
  saveSchoolProfile,
  switchSchoolProfile,
  duplicateSchoolProfile,
  deleteSchoolProfile,
  exportSchoolProfileJson,
  importSchoolProfileJson,
  resetSchoolProfileToDefault,
  createProfileFromPreset,
  applyThemeToProfile,
  applyBrandingToDocument,
  createDefaultProfile,
  type SchoolBrandingProfile,
  type FooterToggles,
} from "./school-branding.js";
