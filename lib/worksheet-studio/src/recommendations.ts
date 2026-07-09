import type { LibraryEntry } from "./teacher-library.js";
import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { suggestNextTopics, type CurriculumTopic } from "./curriculum-engine.js";
import { buildVariantRequest, type WorksheetVariant } from "./teacher-productivity.js";

export type RecommendationKind =
  | "next"
  | "revision"
  | "harder"
  | "easier"
  | "related"
  | "homework"
  | "assessment";

export interface WorksheetRecommendation {
  kind: RecommendationKind;
  label: string;
  prompt: string;
  request?: Partial<WorksheetGenerateRequest>;
}

export function getSmartRecommendations(
  library: LibraryEntry[],
  current?: WorksheetDocument,
): WorksheetRecommendation[] {
  const recs: WorksheetRecommendation[] = [];
  const recent = library.filter((e) => !e.trashed && !e.archived).slice(0, 5);
  const doc = current ?? recent[0]?.document;

  if (doc) {
    const variants: Array<{ kind: RecommendationKind; variant: WorksheetVariant; label: string }> = [
      { kind: "next", variant: "next", label: "Next lesson" },
      { kind: "revision", variant: "revision", label: "Revision sheet" },
      { kind: "harder", variant: "assessment", label: "Harder worksheet" },
      { kind: "easier", variant: "homework", label: "Easier practice" },
      { kind: "homework", variant: "homework", label: "Homework version" },
      { kind: "assessment", variant: "assessment", label: "Assessment" },
    ];
    for (const { kind, variant, label } of variants) {
      const req = buildVariantRequest(doc, variant);
      if (req) recs.push({ kind, label, prompt: req.prompt, request: req });
    }
  }

  const topics = suggestNextTopics(doc?.meta.classLevel ?? "ukg", 3);
  for (const t of topics) {
    recs.push({
      kind: "related",
      label: `Try ${t.label}`,
      prompt: t.prompts[0] ?? t.label,
      request: {
        prompt: `${t.label} worksheet`,
        subject: t.subject,
        classLevel: doc?.meta.classLevel ?? "ukg",
      },
    });
  }

  return recs.slice(0, 8);
}

export function getTrendingTopics(library: LibraryEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of library) {
    if (e.trashed) continue;
    counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
}

export function curriculumRecommendation(classLevel: WorksheetDocument["meta"]["classLevel"]): CurriculumTopic | null {
  const next = suggestNextTopics(classLevel, 1);
  return next[0] ?? null;
}
