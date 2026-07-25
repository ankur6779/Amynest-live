export type ConformanceStatus = "PASS" | "FAIL" | "WAIVED" | "NOT_APPLICABLE";

export type ConformancePart =
  | "architecture"
  | "ux"
  | "ai"
  | "privacy"
  | "lens"
  | "operations"
  | "release";

export type ConformanceItem = {
  id: string;
  part: ConformancePart;
  check: string;
  status: ConformanceStatus;
  evidence: string;
  owner: string;
  notes?: string;
};

export type ConformanceReport = {
  schemaVersion: "birth_sky_conformance_report/1.0.0";
  appBuild: string;
  generatedAt: string;
  scope: "core_only" | "core_plus_lenses";
  items: ConformanceItem[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    waived: number;
    notApplicable: number;
    unknown: number;
    byPart: Record<
      ConformancePart,
      { pass: number; fail: number; waived: number; notApplicable: number }
    >;
  };
  openBlockers: string[];
  productionReady: boolean;
  readinessVerdict: string;
};
