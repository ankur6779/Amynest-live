export type VersionComparison = -1 | 0 | 1;

type ParsedVersion = {
  parts: [number, number, number];
  prerelease: string[];
};

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)){0,2}(?:-(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseVersion(version: string): ParsedVersion {
  if (typeof version !== "string") {
    throw new Error(`Invalid semantic version: ${String(version)}`);
  }
  const trimmed = version.trim();
  if (!SEMVER_PATTERN.test(trimmed)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  const withoutBuild = trimmed.split("+", 1)[0] ?? "";
  const [core, prereleaseRaw = ""] = withoutBuild.split("-", 2);
  const parts = core.split(".").map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid version segment: ${version}`);
    }
    return value;
  });

  if (parts.length < 1 || parts.length > 3) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    parts: [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0],
    prerelease: prereleaseRaw ? prereleaseRaw.split(".") : [],
  };
}

function comparePrerelease(a: string[], b: string[]): VersionComparison {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    if (left === right) continue;

    const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
    const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber < rightNumber ? -1 : 1;
    }
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return left < right ? -1 : 1;
  }

  return 0;
}

export function compareVersions(left: string, right: string): VersionComparison {
  const a = parseVersion(left);
  const b = parseVersion(right);

  for (let i = 0; i < 3; i += 1) {
    if (a.parts[i] < b.parts[i]) return -1;
    if (a.parts[i] > b.parts[i]) return 1;
  }

  return comparePrerelease(a.prerelease, b.prerelease);
}

export function isVersionLessThan(left: string, right: string): boolean {
  return compareVersions(left, right) === -1;
}
