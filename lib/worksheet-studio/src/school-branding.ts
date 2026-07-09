import type { WorksheetDocument } from "./types.js";
import { LPS_FOUNDATION, LPS_SCHOOL_NAME } from "./constants.js";
import {
  applyThemeColors,
  PRESET_SCHOOL_NAMES,
  THEME_COLORS,
  type BrandColors,
  type BrandThemeId,
} from "./brand-themes.js";
import { buildSchoolHeaderElements, computeSchoolContentStartY } from "./header-engine.js";
import { buildSchoolFooterElements, hasActiveFooter } from "./footer-engine.js";

export type { BrandColors, BrandThemeId };
export { BRAND_THEME_LABELS, THEME_COLORS, applyThemeColors, PRESET_SCHOOL_NAMES } from "./brand-themes.js";

export interface FooterToggles {
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showConfidential: boolean;
  showPageNumber: boolean;
  showGeneratedBy: boolean;
}

export interface SchoolBrandingProfile {
  id: string;
  name: string;
  themeId: BrandThemeId;
  schoolName: string;
  tagline?: string;
  foundation?: string;
  logoSrc: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  principalName?: string;
  teacherName?: string;
  academicSession?: string;
  classPrefix?: string;
  footerText?: string;
  signatureSrc?: string;
  stampSrc?: string;
  colors: BrandColors;
  footer: FooterToggles;
  footerConfidentialText?: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use SchoolBrandingProfile — kept for backward compatibility */
export interface SchoolBranding {
  id: string;
  schoolName: string;
  foundation?: string;
  logoSrc: string;
  address?: string;
  footer?: string;
  themeColor: string;
  accentColor: string;
}

const STORAGE_KEY = "worksheet-studio-branding-v2";
const LEGACY_KEY = "worksheet-studio-branding";

const DEFAULT_FOOTER: FooterToggles = {
  showAddress: true,
  showPhone: false,
  showEmail: false,
  showWebsite: false,
  showConfidential: false,
  showPageNumber: true,
  showGeneratedBy: true,
};

export function createDefaultProfile(overrides?: Partial<SchoolBrandingProfile>): SchoolBrandingProfile {
  const now = new Date().toISOString();
  const themeId: BrandThemeId = overrides?.themeId ?? "lps_default";
  return {
    id: overrides?.id ?? "lps-default",
    name: overrides?.name ?? "Lucknow Public School",
    themeId,
    schoolName: overrides?.schoolName ?? LPS_SCHOOL_NAME,
    tagline: overrides?.tagline ?? "Excellence in Education",
    foundation: overrides?.foundation ?? LPS_FOUNDATION,
    logoSrc: overrides?.logoSrc ?? "/illustrations/worksheet-studio/lps-logo.svg",
    address: overrides?.address,
    phone: overrides?.phone,
    email: overrides?.email,
    website: overrides?.website,
    principalName: overrides?.principalName,
    teacherName: overrides?.teacherName,
    academicSession: overrides?.academicSession,
    classPrefix: overrides?.classPrefix,
    footerText: overrides?.footerText,
    signatureSrc: overrides?.signatureSrc,
    stampSrc: overrides?.stampSrc,
    colors: overrides?.colors ?? applyThemeColors(themeId),
    footer: overrides?.footer ?? { ...DEFAULT_FOOTER },
    footerConfidentialText: overrides?.footerConfidentialText,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

export const DEFAULT_BRANDING: SchoolBranding = {
  id: "lps-default",
  schoolName: LPS_SCHOOL_NAME,
  foundation: LPS_FOUNDATION,
  logoSrc: "/illustrations/worksheet-studio/lps-logo.svg",
  themeColor: THEME_COLORS.lps_default.primary,
  accentColor: THEME_COLORS.lps_default.accent,
};

interface BrandingStorageV2 {
  version: 2;
  activeProfileId: string;
  profiles: SchoolBrandingProfile[];
}

function migrateLegacy(): BrandingStorageV2 | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const legacy = { ...DEFAULT_BRANDING, ...JSON.parse(raw) as SchoolBranding };
    const profile = createDefaultProfile({
      id: legacy.id,
      name: legacy.schoolName,
      schoolName: legacy.schoolName,
      foundation: legacy.foundation,
      logoSrc: legacy.logoSrc,
      address: legacy.address,
      footerText: legacy.footer,
      colors: {
        ...THEME_COLORS.lps_default,
        primary: legacy.themeColor,
        accent: legacy.accentColor,
        title: legacy.themeColor,
        button: legacy.themeColor,
      },
    });
    return { version: 2, activeProfileId: profile.id, profiles: [profile] };
  } catch {
    return null;
  }
}

function loadStorage(): BrandingStorageV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrandingStorageV2;
      if (parsed.version === 2 && parsed.profiles?.length) return parsed;
    }
  } catch { /* */ }
  const migrated = migrateLegacy();
  if (migrated) {
    saveStorage(migrated);
    return migrated;
  }
  const defaultProfile = createDefaultProfile();
  const state: BrandingStorageV2 = { version: 2, activeProfileId: defaultProfile.id, profiles: [defaultProfile] };
  saveStorage(state);
  return state;
}

function saveStorage(state: BrandingStorageV2): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const active = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0]!;
  localStorage.setItem(LEGACY_KEY, JSON.stringify(profileToLegacy(active)));
}

function profileToLegacy(profile: SchoolBrandingProfile): SchoolBranding {
  return {
    id: profile.id,
    schoolName: profile.schoolName,
    foundation: profile.foundation,
    logoSrc: profile.logoSrc,
    address: profile.address,
    footer: profile.footerText,
    themeColor: profile.colors.primary,
    accentColor: profile.colors.accent,
  };
}

export function listSchoolProfiles(): SchoolBrandingProfile[] {
  return loadStorage().profiles;
}

export function getActiveBrandingProfile(): SchoolBrandingProfile {
  const state = loadStorage();
  return state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0]!;
}

export function switchSchoolProfile(id: string): SchoolBrandingProfile | null {
  const state = loadStorage();
  const profile = state.profiles.find((p) => p.id === id);
  if (!profile) return null;
  state.activeProfileId = id;
  saveStorage(state);
  return profile;
}

export function saveSchoolProfile(profile: SchoolBrandingProfile): SchoolBrandingProfile {
  const state = loadStorage();
  const now = new Date().toISOString();
  const next: SchoolBrandingProfile = {
    ...profile,
    updatedAt: now,
    createdAt: profile.createdAt || now,
  };
  const idx = state.profiles.findIndex((p) => p.id === next.id);
  if (idx >= 0) state.profiles[idx] = next;
  else state.profiles.push(next);
  if (!state.activeProfileId) state.activeProfileId = next.id;
  saveStorage(state);
  return next;
}

export function duplicateSchoolProfile(id: string): SchoolBrandingProfile | null {
  const source = listSchoolProfiles().find((p) => p.id === id);
  if (!source) return null;
  const copy = createDefaultProfile({
    ...structuredClone(source),
    id: `school_${Date.now()}`,
    name: `${source.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return saveSchoolProfile(copy);
}

export function deleteSchoolProfile(id: string): boolean {
  const state = loadStorage();
  if (state.profiles.length <= 1) return false;
  const idx = state.profiles.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  state.profiles.splice(idx, 1);
  if (state.activeProfileId === id) {
    state.activeProfileId = state.profiles[0]!.id;
  }
  saveStorage(state);
  return true;
}

export function exportSchoolProfileJson(id?: string): string {
  const profile = id
    ? listSchoolProfiles().find((p) => p.id === id)
    : getActiveBrandingProfile();
  if (!profile) throw new Error("Profile not found");
  return JSON.stringify(profile, null, 2);
}

export function importSchoolProfileJson(json: string): SchoolBrandingProfile {
  const parsed = JSON.parse(json) as Partial<SchoolBrandingProfile>;
  const profile = createDefaultProfile({
    ...parsed,
    id: parsed.id ?? `import_${Date.now()}`,
    name: parsed.name ?? parsed.schoolName ?? "Imported School",
    colors: parsed.colors ?? applyThemeColors(parsed.themeId ?? "custom"),
    footer: parsed.footer ?? { ...DEFAULT_FOOTER },
  });
  return saveSchoolProfile(profile);
}

export function resetSchoolProfileToDefault(id?: string): SchoolBrandingProfile {
  const targetId = id ?? getActiveBrandingProfile().id;
  const preset = PRESET_SCHOOL_NAMES.find((p) => p.id === targetId);
  const profile = createDefaultProfile({
    id: targetId,
    name: preset?.name ?? "Lucknow Public School",
    schoolName: preset?.schoolName ?? LPS_SCHOOL_NAME,
    tagline: preset?.tagline,
    foundation: preset?.foundation,
    themeId: preset?.themeId ?? "lps_default",
  });
  return saveSchoolProfile(profile);
}

export function createProfileFromPreset(presetId: string): SchoolBrandingProfile {
  const preset = PRESET_SCHOOL_NAMES.find((p) => p.id === presetId);
  if (!preset) throw new Error("Unknown preset");
  const existing = listSchoolProfiles().find((p) => p.id === presetId);
  if (existing) {
    switchSchoolProfile(presetId);
    return existing;
  }
  const profile = createDefaultProfile({
    id: preset.id,
    name: preset.name,
    schoolName: preset.schoolName,
    tagline: preset.tagline,
    foundation: preset.foundation,
    themeId: preset.themeId,
    colors: applyThemeColors(preset.themeId),
  });
  return saveSchoolProfile(profile);
}

export function applyThemeToProfile(themeId: BrandThemeId, profile?: SchoolBrandingProfile): SchoolBrandingProfile {
  const base = profile ?? getActiveBrandingProfile();
  return {
    ...base,
    themeId,
    colors: applyThemeColors(themeId, base.colors),
    updatedAt: new Date().toISOString(),
  };
}

/** Legacy API — maps active profile to simplified branding object */
export function getSchoolBranding(): SchoolBranding {
  return profileToLegacy(getActiveBrandingProfile());
}

/** Legacy API — patches active profile */
export function setSchoolBranding(branding: Partial<SchoolBranding>): SchoolBranding {
  const active = getActiveBrandingProfile();
  const next = saveSchoolProfile({
    ...active,
    schoolName: branding.schoolName ?? active.schoolName,
    foundation: branding.foundation ?? active.foundation,
    logoSrc: branding.logoSrc ?? active.logoSrc,
    address: branding.address ?? active.address,
    footerText: branding.footer ?? active.footerText,
    colors: {
      ...active.colors,
      primary: branding.themeColor ?? active.colors.primary,
      accent: branding.accentColor ?? active.colors.accent,
      title: branding.themeColor ?? active.colors.title,
      button: branding.themeColor ?? active.colors.button,
    },
    id: branding.id ?? active.id,
    updatedAt: new Date().toISOString(),
  });
  return profileToLegacy(next);
}

const BRAND_ELEMENT_PREFIXES = ["brand_", "footer_"];

function isBrandedElement(id: string): boolean {
  return BRAND_ELEMENT_PREFIXES.some((p) => id.startsWith(p));
}

export function stripBrandedElements(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  for (const page of out.pages) {
    page.elements = page.elements.filter((el) => !isBrandedElement(el.id));
  }
  return out;
}

export function applyBrandingToDocument(
  doc: WorksheetDocument,
  profile = getActiveBrandingProfile(),
): WorksheetDocument {
  const out = stripBrandedElements(doc);
  const totalPages = out.pages.length;

  for (const page of out.pages) {
    if (page.showLpsHeader && page.pageNumber === 1) {
      page.elements = [...buildSchoolHeaderElements(out.meta, profile), ...page.elements];
    }
    if (hasActiveFooter(profile)) {
      page.elements.push(...buildSchoolFooterElements(profile, page.pageNumber, totalPages));
    }
  }

  out.meta.updatedAt = new Date().toISOString();
  return out;
}

export { computeSchoolContentStartY } from "./header-engine.js";
