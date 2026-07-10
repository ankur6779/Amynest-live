import { readResolvedApiJson } from "@/lib/poll-result";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  enhancePromptLocal,
  stripReferencesForApi,
  type EnhancePromptRequest,
  type EnhancePromptResponse,
} from "@workspace/worksheet-studio";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

const ENHANCE_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Enhance timed out")), ms);
    promise
      .then((v) => { window.clearTimeout(timer); resolve(v); })
      .catch((e) => { window.clearTimeout(timer); reject(e); });
  });
}

export function useWorksheetPromptEnhancer(authFetch: AuthFetch) {
  const [enhancing, setEnhancing] = useState(false);
  const inFlightRef = useRef(false);

  const enhance = useCallback(
    async (req: EnhancePromptRequest): Promise<EnhancePromptResponse> => {
      if (inFlightRef.current) {
        return { enhancedPrompt: enhancePromptLocal(req), source: "local" };
      }
      inFlightRef.current = true;
      setEnhancing(true);
      const local = enhancePromptLocal(req);
      try {
        const res = await withTimeout(
          authFetch("/api/worksheet-studio/enhance-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...req,
              references: req.references?.length ? stripReferencesForApi(req.references) : undefined,
            }),
          }),
          ENHANCE_TIMEOUT_MS,
        );
        if (res.ok) {
          const data = await readResolvedApiJson<EnhancePromptResponse>(res, authFetch, {
            poll: { maxAttempts: 20, intervalMs: 2000 },
          });
          if (data.enhancedPrompt?.trim()) {
            toast.success("Prompt enhanced", { description: "AI expanded your teaching brief." });
            return data;
          }
        }
        toast.info("Using offline enhancement", { description: "AI unavailable — local brief applied." });
        return { enhancedPrompt: local, source: "local" };
      } catch {
        toast.info("Using offline enhancement", { description: "Network issue — local brief applied." });
        return { enhancedPrompt: local, source: "local" };
      } finally {
        setEnhancing(false);
        inFlightRef.current = false;
      }
    },
    [authFetch],
  );

  return { enhance, enhancing };
}
