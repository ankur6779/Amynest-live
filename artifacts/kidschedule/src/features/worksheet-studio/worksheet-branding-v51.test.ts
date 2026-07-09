import { describe, expect, it, beforeEach } from "vitest";
import {
  generateWorksheetLocal,
  buildSchoolHeaderElements,
  buildSchoolFooterElements,
  hasActiveFooter,
  createDefaultProfile,
  applyBrandingToDocument,
  stripBrandedElements,
  applyThemeToProfile,
  applyThemeColors,
  THEME_COLORS,
  switchSchoolProfile,
  saveSchoolProfile,
  listSchoolProfiles,
  duplicateSchoolProfile,
  exportSchoolProfileJson,
  importSchoolProfileJson,
  resetSchoolProfileToDefault,
  getActiveBrandingProfile,
  getSchoolBranding,
  setSchoolBranding,
} from "@workspace/worksheet-studio";

const baseReq = {
  prompt: "UKG branding test worksheet",
  classLevel: "ukg" as const,
  subject: "english" as const,
  difficulty: "easy" as const,
  pageCount: 1,
};

describe("brand themes", () => {
  it("applies preset theme colors", () => {
    const colors = applyThemeColors("green_campus");
    expect(colors.primary).toBe(THEME_COLORS.green_campus.primary);
  });

  it("switches theme on profile", () => {
    const profile = createDefaultProfile();
    const themed = applyThemeToProfile("modern_purple", profile);
    expect(themed.themeId).toBe("modern_purple");
    expect(themed.colors.primary).toBe(THEME_COLORS.modern_purple.primary);
  });
});

describe("header engine", () => {
  it("renders dynamic school header on page 1", () => {
    const doc = generateWorksheetLocal(baseReq);
    const profile = createDefaultProfile({
      schoolName: "TEST ACADEMY",
      tagline: "Learn & Grow",
      teacherName: "Mrs. Sharma",
      academicSession: "2025-26",
    });
    const header = buildSchoolHeaderElements(doc.meta, profile);
    expect(header.some((e) => e.type === "text" && e.content === "TEST ACADEMY")).toBe(true);
    expect(header.some((e) => e.type === "text" && e.content === "Learn & Grow")).toBe(true);
    expect(header.some((e) => e.id === "brand_logo")).toBe(true);
    expect(header.some((e) => e.type === "text" && String(e.content).includes("Mrs. Sharma"))).toBe(true);
  });
});

describe("footer engine", () => {
  it("builds footer when toggles enabled", () => {
    const profile = createDefaultProfile({
      address: "12 School Lane",
      phone: "9999999999",
      footer: {
        showAddress: true,
        showPhone: true,
        showEmail: false,
        showWebsite: false,
        showConfidential: false,
        showPageNumber: true,
        showGeneratedBy: true,
      },
    });
    expect(hasActiveFooter(profile)).toBe(true);
    const footer = buildSchoolFooterElements(profile, 1, 2);
    expect(footer.length).toBeGreaterThan(0);
    const text = footer.find((e) => e.type === "text");
    expect(text && "content" in text && text.content.includes("12 School Lane")).toBe(true);
    expect(text && "content" in text && text.content.includes("Page 1 of 2")).toBe(true);
  });
});

describe("multi-school storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and switches profiles", () => {
    const a = saveSchoolProfile(createDefaultProfile({ id: "school-a", name: "School A", schoolName: "SCHOOL A" }));
    const b = saveSchoolProfile(createDefaultProfile({ id: "school-b", name: "School B", schoolName: "SCHOOL B" }));
    switchSchoolProfile(b.id);
    expect(getActiveBrandingProfile().schoolName).toBe("SCHOOL B");
    switchSchoolProfile(a.id);
    expect(listSchoolProfiles().length).toBeGreaterThanOrEqual(2);
  });

  it("duplicates profile", () => {
    const source = saveSchoolProfile(createDefaultProfile({ id: "src", name: "Source", schoolName: "SRC" }));
    const copy = duplicateSchoolProfile(source.id);
    expect(copy?.name).toContain("Copy");
    expect(copy?.id).not.toBe(source.id);
  });

  it("exports and imports JSON", () => {
    const profile = saveSchoolProfile(createDefaultProfile({ id: "exp", name: "Export Test", schoolName: "EXPORT" }));
    const json = exportSchoolProfileJson(profile.id);
    localStorage.clear();
    const imported = importSchoolProfileJson(json);
    expect(imported.schoolName).toBe("EXPORT");
  });

  it("resets profile to default", () => {
    saveSchoolProfile(createDefaultProfile({ id: "lps-default", schoolName: "CHANGED" }));
    const reset = resetSchoolProfileToDefault("lps-default");
    expect(reset.schoolName).toContain("LUCKNOW");
  });
});

describe("apply branding to document", () => {
  it("replaces LPS header with active school branding", () => {
    const profile = createDefaultProfile({ schoolName: "DELHI PUBLIC SCHOOL", foundation: "(DPS)" });
    saveSchoolProfile(profile);
    switchSchoolProfile(profile.id);
    const doc = generateWorksheetLocal(baseReq);
    const branded = applyBrandingToDocument(doc, profile);
    const page1 = branded.pages[0]!;
    expect(page1.elements.some((e) => e.type === "text" && e.content === "DELHI PUBLIC SCHOOL")).toBe(true);
    expect(page1.elements.some((e) => e.id.startsWith("brand_"))).toBe(true);
  });

  it("strips branded elements before re-apply", () => {
    const doc = generateWorksheetLocal(baseReq);
    const once = applyBrandingToDocument(doc);
    const twice = applyBrandingToDocument(once);
    const brandCount = twice.pages[0]!.elements.filter((e) => e.id.startsWith("brand_")).length;
    const onceCount = once.pages[0]!.elements.filter((e) => e.id.startsWith("brand_")).length;
    expect(brandCount).toBe(onceCount);
  });

  it("does not repeat header on page 2", () => {
    const doc = generateWorksheetLocal({ ...baseReq, pageCount: 2 });
    const branded = applyBrandingToDocument(doc);
    const page2Brands = branded.pages[1]!.elements.filter((e) => e.id.startsWith("brand_"));
    expect(page2Brands.length).toBe(0);
  });
});

describe("legacy branding API", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getSchoolBranding maps active profile", () => {
    setSchoolBranding({ schoolName: "Legacy School", themeColor: "#ff0000" });
    const legacy = getSchoolBranding();
    expect(legacy.schoolName).toBe("Legacy School");
    expect(legacy.themeColor).toBe("#ff0000");
  });
});

describe("export pipeline branding", () => {
  it("strip removes brand and footer elements", () => {
    const doc = applyBrandingToDocument(generateWorksheetLocal(baseReq));
    const stripped = stripBrandedElements(doc);
    expect(stripped.pages.every((p) => p.elements.every((e) => !e.id.startsWith("brand_") && !e.id.startsWith("footer_")))).toBe(true);
  });
});
