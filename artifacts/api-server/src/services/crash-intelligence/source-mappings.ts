import type { SourceMapping } from "./types.js";

/**
 * Evidence-backed source locations — line numbers verified against current tree.
 * Engineers update when files move; source-scanner.ts can re-validate.
 */
export const SOURCE_MAPPINGS: SourceMapping[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    component: "ChildForm",
    route: "/children/:id",
    locations: [
      {
        file: "artifacts/kidschedule/src/pages/children/form.tsx",
        line: 329,
        endLine: 347,
        functionName: "ChildForm",
        hook: "useEffect",
        dependencies: ["isInfant", "watchDob", "form"],
        stateMutation: 'form.setValue("educationStage", patches.educationStage)',
        route: "/children/:id",
      },
      {
        file: "artifacts/kidschedule/src/pages/children/form.tsx",
        line: 262,
        endLine: 273,
        functionName: "ChildForm",
        hook: "useWatch",
        dependencies: ["dob", "educationStage", "scheduleKnown"],
        stateMutation: "watchDob triggers isInfant recalculation",
      },
      {
        file: "artifacts/kidschedule/src/lib/child-form-hydration.ts",
        line: 44,
        endLine: 57,
        functionName: "infantFormNormalizationPatches",
        hook: "other",
        stateMutation: "returns educationStage patch when !== at_home",
      },
      {
        file: "artifacts/kidschedule/src/pages/children/form.tsx",
        line: 359,
        endLine: 467,
        functionName: "ChildForm",
        hook: "useEffect",
        dependencies: ["child", "isEditing", "parentCountry"],
        stateMutation: "form.reset(nextValues)",
        queryKey: "children/:id",
      },
    ],
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    component: "ChildForm",
    route: "/children/:id",
    locations: [
      {
        file: "artifacts/kidschedule/src/pages/children/form.tsx",
        line: 359,
        endLine: 467,
        functionName: "ChildForm",
        hook: "useEffect",
        dependencies: ["child", "isEditing", "parentCountry"],
        stateMutation: "form.reset(nextValues)",
        queryKey: "children/:id",
        route: "/children/:id",
      },
      {
        file: "artifacts/kidschedule/src/lib/child-form-hydration.ts",
        line: 27,
        endLine: 33,
        functionName: "buildChildHydrationKey",
        hook: "other",
        stateMutation: "hydrationKey stability guard",
      },
      {
        file: "artifacts/kidschedule/src/lib/child-form-hydration.ts",
        line: 67,
        endLine: 88,
        functionName: "childFormResetValuesEqual",
        hook: "other",
        stateMutation: "skip redundant form.reset",
      },
    ],
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    component: "Dashboard",
    route: "/dashboard",
    locations: [
      {
        file: "artifacts/kidschedule/src/lib/crash-recovery.ts",
        line: 1,
        functionName: "planCrashRecovery",
        hook: "other",
        stateMutation: "reload stage on ChunkLoadError",
        route: "/dashboard",
      },
    ],
  },
  {
    readableFingerprint: "RoutineGenerator|Error|MealBuilder",
    component: "RoutineGenerator",
    route: "/routines",
    locations: [
      {
        file: "artifacts/kidschedule/src/pages/routines/",
        line: 0,
        functionName: "RoutineGenerator",
        hook: "other",
        stateMutation: "meal slot access without null guard",
        route: "/routines",
      },
    ],
  },
  {
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    component: "NotificationEngine",
    route: "*",
    locations: [
      {
        file: "lib/notification-engine/src/delivery/guard.ts",
        line: 0,
        functionName: "dispatch",
        hook: "other",
        stateMutation: "unhandled fetch rejection",
      },
    ],
  },
];

export function getSourceMappingForFingerprint(
  readableFingerprint: string,
): SourceMapping | null {
  return (
    SOURCE_MAPPINGS.find((m) => m.readableFingerprint === readableFingerprint) ??
    null
  );
}

export function fingerprintToReviewSlug(readableFingerprint: string): string {
  return readableFingerprint.replace(/\|/g, "-");
}
