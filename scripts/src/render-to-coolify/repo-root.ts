import { readFileSync } from "node:fs";
import path from "node:path";

/** Resolve monorepo root when cwd is `scripts/` or repo root. */
export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (pkg.name === "workspace") return dir;
    } catch {
      /* continue */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function auditDir(): string {
  const override = process.env.AMYNEST_AUDIT_DIR?.trim();
  if (override) {
    return path.join(override, "render-to-coolify");
  }
  return path.join(repoRoot(), "audit", "render-to-coolify");
}
