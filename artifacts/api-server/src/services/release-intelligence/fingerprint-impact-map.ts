import { ROOT_CAUSE_PLAYBOOKS } from "../crash-intelligence/root-cause-playbooks.js";
import { CRASH_REGRESSION_REGISTRY } from "../crash-intelligence/regression-registry.js";
import { SOURCE_MAPPINGS } from "../crash-intelligence/source-mappings.js";

export type FingerprintImpactEntry = {
  readableFingerprint: string;
  severity: "P0" | "P1" | "P2";
  component: string;
  route: string;
  files: string[];
  hooks: string[];
  tests: string[];
};

const P0_FINGERPRINTS = new Set([
  "ChildForm|MaximumDepth|InfantEffect",
  "ChildForm|MaximumDepth|ChildForm",
]);

const P1_FINGERPRINTS = new Set([
  "Dashboard|ChunkLoad|LazyImport",
  "RoutineGenerator|Error|MealBuilder",
]);

export function buildFingerprintImpactMap(): FingerprintImpactEntry[] {
  return SOURCE_MAPPINGS.map((mapping) => {
    const playbook = ROOT_CAUSE_PLAYBOOKS.find(
      (p) => p.readableFingerprint === mapping.readableFingerprint,
    );
    const regression = CRASH_REGRESSION_REGISTRY.find(
      (r) => r.readableFingerprint === mapping.readableFingerprint,
    );

    const files = new Set<string>([
      ...mapping.locations.map((l) => l.file),
      ...(playbook?.evidence ?? []),
    ]);

    const hooks = mapping.locations
      .filter((l) => l.hook !== "other" && l.hook !== "handler")
      .map((l) => `${l.functionName}:${l.hook}@${l.line}`);

    let severity: FingerprintImpactEntry["severity"] = "P2";
    if (P0_FINGERPRINTS.has(mapping.readableFingerprint)) severity = "P0";
    else if (P1_FINGERPRINTS.has(mapping.readableFingerprint)) severity = "P1";

    return {
      readableFingerprint: mapping.readableFingerprint,
      severity,
      component: mapping.component,
      route: mapping.route,
      files: [...files].filter((f) => !f.endsWith("/")),
      hooks,
      tests: regression?.testPaths ?? [],
    };
  });
}

export function findImpactedFingerprints(changedPaths: string[]): FingerprintImpactEntry[] {
  const normalized = changedPaths.map(normalizePath);
  const map = buildFingerprintImpactMap();

  return map.filter((entry) =>
    entry.files.some((file) => {
      const f = normalizePath(file);
      return normalized.some(
        (changed) => changed === f || changed.endsWith(f) || f.endsWith(changed),
      );
    }),
  );
}

export function filesForFingerprint(readableFingerprint: string): string[] {
  const entry = buildFingerprintImpactMap().find(
    (e) => e.readableFingerprint === readableFingerprint,
  );
  return entry?.files ?? [];
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}
