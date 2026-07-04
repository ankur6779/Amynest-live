import { postRetentionResume, type RetentionResumeItem } from "@/lib/retention/retention-api";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const LOCAL_KEY = "amynest:resume_registry_v1";

export type ResumeKind =
  | "story"
  | "routine"
  | "learning"
  | "speech"
  | "worksheet"
  | "game";

export type LocalResumeEntry = Omit<RetentionResumeItem, "updatedAt"> & {
  kind: ResumeKind;
};

function readLocal(): LocalResumeEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalResumeEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: LocalResumeEntry[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

/** Persist progress locally and sync to server when auth fetch is available. */
export async function saveResumeProgress(
  entry: LocalResumeEntry,
  authFetch?: AuthFetch,
): Promise<void> {
  const now = new Date().toISOString();
  const item: RetentionResumeItem = {
    type: entry.type,
    href: entry.href,
    label: entry.label,
    progressPct: entry.progressPct,
    updatedAt: now,
  };
  const next = [
    entry,
    ...readLocal().filter((e) => e.kind !== entry.kind),
  ].slice(0, 8);
  writeLocal(next);
  if (authFetch) {
    try {
      await postRetentionResume(authFetch, item);
    } catch {
      /* offline — local cache still works */
    }
  }
}

export function getLatestResume(kind?: ResumeKind): LocalResumeEntry | null {
  const items = readLocal();
  if (kind) return items.find((e) => e.kind === kind) ?? null;
  return items[0] ?? null;
}

export function listResumeEntries(): LocalResumeEntry[] {
  return readLocal();
}
