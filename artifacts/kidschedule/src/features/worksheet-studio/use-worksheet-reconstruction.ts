import { readResolvedApiJson } from "@/lib/poll-result";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  analyzeReconstructionSources,
  mergeReconstructionAnalyses,
  prepareVisionImagesForApi,
  reconstructWorksheetLocal,
  stripSourcesForReconstructionApi,
  type ReconstructionAnalysis,
  type ReconstructionProgressStage,
  type WorksheetReconstructRequest,
  type WorksheetReconstructResponse,
} from "@workspace/worksheet-studio";
import { preprocessReconstructionSources } from "./reconstruction-preprocess";
import { enqueueOfflineRequest } from "./worksheet-studio-analytics";
import { useAuth } from "@/lib/firebase-auth-hooks";

type AuthFetch = (url: string, init?: RequestInit, timeoutMs?: number) => Promise<Response>;

const MAX_RETRIES = 2;
const TIMEOUT_MS = 60_000;
const AI_POLL = { maxAttempts: 30, intervalMs: 2000, requestTimeoutMs: 15_000 };

const STAGE_LABELS: Record<ReconstructionProgressStage, string> = {
  uploading: "Uploading…",
  cleaning: "Cleaning image…",
  detecting_layout: "Detecting layout…",
  reading_text: "Reading text…",
  understanding: "Understanding worksheet…",
  generating: "Generating editable version…",
  validating: "Validating quality…",
  opening: "Opening editor…",
};

async function fetchWithRetry(
  authFetch: AuthFetch,
  url: string,
  init: RequestInit,
  userId?: string | null,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const res = await Promise.race([
        authFetch(url, init, TIMEOUT_MS),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS);
        }),
      ]);
      if (res.ok || res.status < 500) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  if (init.body && typeof init.body === "string") {
    try {
      enqueueOfflineRequest(url, JSON.parse(init.body) as object, userId);
    } catch { /* */ }
  }
  throw lastErr;
}

export function useWorksheetReconstruction(authFetch: AuthFetch) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<ReconstructionProgressStage | null>(null);
  const [merged, setMerged] = useState<ReconstructionAnalysis | null>(null);

  const stageLabel = stage ? STAGE_LABELS[stage] : null;

  const analyze = useCallback(
    async (sources: WorksheetReconstructRequest["sources"], force = false): Promise<ReconstructionAnalysis | null> => {
      if (!sources.length) return null;
      setAnalyzing(true);
      setStage("understanding");
      try {
        setStage("cleaning");
        const visionImages = await preprocessReconstructionSources(sources);
        const body = {
          sources: stripSourcesForReconstructionApi(sources),
          visionImages: visionImages.length ? visionImages : prepareVisionImagesForApi(sources),
        };
        const res = await fetchWithRetry(
          authFetch,
          "/api/worksheet-studio/analyze-reconstruction",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          userId,
        );
        if (res.ok) {
          const data = await readResolvedApiJson<{ merged: ReconstructionAnalysis; source: string }>(
            res,
            authFetch,
            { poll: AI_POLL },
          );
          setMerged(data.merged);
          return data.merged;
        }
        if (force) toast.error("Analysis failed", { description: "Using local detection." });
        const localAnalyses = analyzeReconstructionSources(sources);
        const localMerged = mergeReconstructionAnalyses(localAnalyses);
        setMerged(localMerged);
        return localMerged;
      } catch {
        toast.info("Offline analysis", { description: "Using local worksheet detection." });
        void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
          m.trackOfflineFallback("reconstruct_analyze");
        }).catch(() => { /* */ });
        return null;
      } finally {
        setAnalyzing(false);
        setStage(null);
      }
    },
    [authFetch, userId],
  );

  const reconstruct = useCallback(
    async (req: WorksheetReconstructRequest): Promise<WorksheetReconstructResponse> => {
      setLoading(true);
      setStage("uploading");
      const local = reconstructWorksheetLocal(req);

      try {
        setStage("cleaning");
        const visionImages = await preprocessReconstructionSources(req.sources);
        setStage("detecting_layout");
        const apiBody = {
          ...req,
          sources: stripSourcesForReconstructionApi(req.sources),
          visionImages: visionImages.length ? visionImages : prepareVisionImagesForApi(req.sources),
        };
        setStage("reading_text");
        setStage("understanding");
        setStage("generating");
        const res = await fetchWithRetry(
          authFetch,
          "/api/worksheet-studio/reconstruct",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiBody),
          },
          userId,
        );
        setStage("validating");
        if (res.ok) {
          const data = await readResolvedApiJson<WorksheetReconstructResponse>(res, authFetch, { poll: AI_POLL });
          setStage("opening");
          if (data.usedFallback) {
            toast.info("AI enhancement unavailable", {
              description: "Basic editable worksheet created from your upload.",
            });
          }
          return data;
        }
        return { ...local, usedFallback: true };
      } catch {
        toast.info("Offline reconstruction", {
          description: "AI unavailable — basic editable worksheet generated locally.",
        });
        void import("@/features/teacher-os/teacher-os-analytics").then((m) => {
          m.trackOfflineFallback("reconstruct");
        }).catch(() => { /* */ });
        return { ...local, usedFallback: true };
      } finally {
        setLoading(false);
        setStage(null);
      }
    },
    [authFetch, userId],
  );

  return { analyze, reconstruct, loading, analyzing, stage, stageLabel, merged, setMerged };
}
