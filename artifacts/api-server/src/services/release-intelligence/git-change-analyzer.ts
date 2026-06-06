import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

export type GitChangeSet = {
  baseRef: string;
  headRef: string;
  files: Array<{ path: string; insertions: number; deletions: number }>;
  totalInsertions: number;
  totalDeletions: number;
};

function runGit(args: string[]): string {
  return execSync(`git ${args.join(" ")}`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function resolveGitRef(ref?: string): string {
  if (!ref) {
    try {
      return runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
    } catch {
      return "HEAD";
    }
  }
  return ref;
}

export function collectGitChanges(input?: {
  base?: string;
  head?: string;
}): GitChangeSet {
  const headRef = input?.head ?? resolveGitRef();
  let baseRef = input?.base ?? "main";

  try {
    runGit(["merge-base", baseRef, headRef]);
  } catch {
    try {
      baseRef = runGit(["rev-parse", "HEAD~1"]);
    } catch {
      baseRef = headRef;
    }
  }

  let raw = "";
  try {
    raw = runGit(["diff", "--numstat", `${baseRef}...${headRef}`]);
  } catch {
    try {
      raw = runGit(["diff", "--numstat", "HEAD~1..HEAD"]);
      baseRef = "HEAD~1";
    } catch {
      return {
        baseRef,
        headRef,
        files: [],
        totalInsertions: 0,
        totalDeletions: 0,
      };
    }
  }

  const files: GitChangeSet["files"] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const line of raw.split("\n").filter(Boolean)) {
    const [ins, del, path] = line.split("\t");
    if (!path || path === "/dev/null") continue;
    const insertions = ins === "-" ? 0 : Number(ins);
    const deletions = del === "-" ? 0 : Number(del);
    files.push({ path: path.replace(/\\/g, "/"), insertions, deletions });
    totalInsertions += insertions;
    totalDeletions += deletions;
  }

  return { baseRef, headRef, files, totalInsertions, totalDeletions };
}

export function inferChangedComponentsAndHooks(
  changedPaths: string[],
): { components: string[]; hooks: string[]; routes: string[] } {
  const components = new Set<string>();
  const hooks = new Set<string>();
  const routes = new Set<string>();

  for (const path of changedPaths) {
    if (path.includes("children/form")) {
      components.add("ChildForm");
      hooks.add("useEffect");
      hooks.add("useWatch");
      routes.add("/children/:id");
    }
    if (path.includes("child-form-hydration")) {
      components.add("ChildForm");
      routes.add("/children/:id");
    }
    if (path.includes("dashboard")) {
      components.add("Dashboard");
      routes.add("/dashboard");
    }
    if (path.includes("routines/")) {
      components.add("RoutineGenerator");
      routes.add("/routines");
    }
    if (path.includes("onboarding")) {
      components.add("Onboarding");
      routes.add("/onboarding");
    }
    if (path.includes("notification-engine")) {
      components.add("NotificationEngine");
    }
    if (path.includes("self-healing")) {
      components.add("SelfHealing");
    }
  }

  return {
    components: [...components],
    hooks: [...hooks],
    routes: [...routes],
  };
}

export function isGitRepo(): boolean {
  return existsSync(join(REPO_ROOT, ".git"));
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}
