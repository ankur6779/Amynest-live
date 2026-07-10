import { readResolvedApiJson } from "@/lib/poll-result";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  generateWorksheetLocal,
  stripReferencesForApi,
  type WorksheetDocument,
  type WorksheetGenerateRequest,
  type WorksheetGenerateResponse,
  type WorksheetImproveAction,
  applyWorksheetImprovement,
} from "@workspace/worksheet-studio";
import { scoreWorksheet } from "@workspace/worksheet-studio";
import { enqueueOfflineRequest } from "./worksheet-studio-analytics";

type AuthFetch = (url: string, init?: RequestInit, timeoutMs?: number) => Promise<Response>;

const MAX_RETRIES = 2;
const GENERATE_TIMEOUT_MS = 45_000;
const ENTITLEMENT_STATUSES = new Set([401, 402, 403, 429]);

const AI_POLL = { maxAttempts: 30, intervalMs: 2000, requestTimeoutMs: 15_000 };

async function fetchWithRetry(
  authFetch: AuthFetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const res = await Promise.race([
        authFetch(url, init, GENERATE_TIMEOUT_MS),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timed out")), GENERATE_TIMEOUT_MS);
        }),
      ]);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  if (init.body && typeof init.body === "string") {
    try { enqueueOfflineRequest(url, JSON.parse(init.body) as object); } catch { /* */ }
  }
  throw lastErr;
}

function entitlementMessage(status: number): string {
  if (status === 429) return "AI usage limit reached — try again later.";
  if (status === 402) return "Upgrade your plan to use AI worksheet generation.";
  if (status === 401) return "Sign in to use AI worksheet generation.";
  return "You don't have access to AI worksheets right now.";
}

export function useWorksheetAi(authFetch: AuthFetch) {
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState<WorksheetImproveAction | null>(null);
  const mountedRef = useRef(true);

  const generate = useCallback(
    async (req: WorksheetGenerateRequest): Promise<WorksheetGenerateResponse> => {
      setLoading(true);
      const local = generateWorksheetLocal(req);
      const apiBody = {
        ...req,
        references: req.references?.length ? stripReferencesForApi(req.references) : undefined,
      };
      try {
        const res = await fetchWithRetry(authFetch, "/api/worksheet-studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiBody),
        });
        if (ENTITLEMENT_STATUSES.has(res.status)) {
          toast.error(entitlementMessage(res.status));
          void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
            m.trackOfflineFallback(`entitlement_${res.status}`);
          }).catch(() => { /* */ });
          return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
        }
        if (res.ok) {
          const data = await readResolvedApiJson<
            WorksheetGenerateResponse & { usedFallback?: boolean; qualityScore?: number }
          >(res, authFetch, { poll: AI_POLL });
          if (!mountedRef.current) return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
          const doc = data?.document?.pages?.length ? data.document : local;
          return {
            document: doc,
            source: data.source ?? (data.usedFallback || doc === local ? "local" : "ai"),
            usedFallback: data.usedFallback ?? doc === local,
            qualityScore: data.qualityScore ?? scoreWorksheet(doc).overall,
          };
        }
        return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
      } catch {
        toast.info("Using offline worksheet", { description: "Network issue — template generated locally." });
        void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
          m.trackOfflineFallback("generate_network");
        }).catch(() => { /* */ });
        return { document: local, source: "local", usedFallback: true, qualityScore: scoreWorksheet(local).overall };
      } finally {
        if (mountedRef.current) setLoading(false);
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
        if (mountedRef.current) setImproving(null);
      }
    },
    [generate],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return { generate, improve, loading, improving };
}
