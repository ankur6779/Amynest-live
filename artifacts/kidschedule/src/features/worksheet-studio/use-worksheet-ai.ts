import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useState } from "react";
import {
  generateWorksheetLocal,
  type WorksheetDocument,
  type WorksheetGenerateRequest,
  type WorksheetGenerateResponse,
  type WorksheetImproveAction,
  applyWorksheetImprovement,
} from "@workspace/worksheet-studio";
import { scoreWorksheet } from "@workspace/worksheet-studio";
import { enqueueOfflineRequest } from "./worksheet-studio-analytics";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

const MAX_RETRIES = 2;

async function fetchWithRetry(
  authFetch: AuthFetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const res = await authFetch(url, init);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  if (init.body && typeof init.body === "string") {
    try { enqueueOfflineRequest(url, JSON.parse(init.body) as object); } catch { /* */ }
  }
  throw lastErr;
}

export function useWorksheetAi(authFetch: AuthFetch) {
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState<WorksheetImproveAction | null>(null);

  const generate = useCallback(
    async (req: WorksheetGenerateRequest): Promise<WorksheetGenerateResponse> => {
      setLoading(true);
      const local = generateWorksheetLocal(req);
      try {
        const res = await fetchWithRetry(authFetch, "/api/worksheet-studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (res.ok) {
          const data = await parseApiJson<WorksheetGenerateResponse & { usedFallback?: boolean; qualityScore?: number }>(res);
          return {
            document: data.document,
            source: data.source ?? (data.usedFallback ? "local" : "ai"),
            usedFallback: data.usedFallback,
            qualityScore: data.qualityScore,
          };
        }
        return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
      } catch {
        return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  const improve = useCallback(
    async (doc: WorksheetDocument, action: WorksheetImproveAction): Promise<WorksheetDocument> => {
      setImproving(action);
      try {
        if (action === "easier" || action === "harder" || action === "more_questions" || action === "fewer_questions") {
          const nextDifficulty =
            action === "easier" ? "easy" : action === "harder" ? "hard" : doc.meta.difficulty;
          const nextPages =
            action === "more_questions"
              ? Math.min(4, doc.meta.pageCount + 1)
              : action === "fewer_questions"
                ? Math.max(1, doc.meta.pageCount - 1)
                : doc.meta.pageCount;
          const regen = await generate({
            prompt: doc.prompt,
            classLevel: doc.meta.classLevel,
            subject: doc.meta.subject,
            difficulty: nextDifficulty,
            pageCount: nextPages,
            answerKey: doc.meta.isAnswerKey,
          });
          return { ...regen.document, id: doc.id };
        }
        return applyWorksheetImprovement(doc, action);
      } finally {
        setImproving(null);
      }
    },
    [generate],
  );

  return { generate, improve, loading, improving };
}
