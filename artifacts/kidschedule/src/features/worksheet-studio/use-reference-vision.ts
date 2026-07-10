import { useCallback, useState } from "react";
import { parseApiJson } from "@/lib/safe-json-response";
import {
  analyzeReferences,
  mergeReferenceAnalyses,
  cacheReferenceAnalysis,
  type ReferenceAnalysis,
  type WorksheetReferenceContext,
} from "@workspace/worksheet-studio";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useReferenceVision(authFetch: AuthFetch) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<ReferenceAnalysis[]>([]);
  const [merged, setMerged] = useState<Partial<ReferenceAnalysis>>({});

  const analyze = useCallback(async (refs: WorksheetReferenceContext[], force = false) => {
    if (!refs.length) return { analyses: [], merged: {} };
    setAnalyzing(true);
    try {
      if (!force) {
        const cached = analyzeReferences(refs, true);
        if (cached.every((a) => a.confidence >= 60)) {
          const m = mergeReferenceAnalyses(cached);
          setAnalyses(cached);
          setMerged(m);
          return { analyses: cached, merged: m };
        }
      }
      const res = await authFetch("/api/worksheet-studio/analyze-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: refs }),
      });
      if (res.ok) {
        const data = await parseApiJson<{
          analyses: ReferenceAnalysis[];
          merged: Partial<ReferenceAnalysis>;
          source: string;
        }>(res);
        for (const a of data.analyses) cacheReferenceAnalysis(a);
        setAnalyses(data.analyses);
        setMerged(data.merged);
        return data;
      }
      const local = analyzeReferences(refs, false);
      const m = mergeReferenceAnalyses(local);
      setAnalyses(local);
      setMerged(m);
      return { analyses: local, merged: m };
    } catch {
      const local = analyzeReferences(refs, false);
      const m = mergeReferenceAnalyses(local);
      setAnalyses(local);
      setMerged(m);
      return { analyses: local, merged: m };
    } finally {
      setAnalyzing(false);
    }
  }, [authFetch]);

  return { analyze, analyzing, analyses, merged, setAnalyses, setMerged };
}
