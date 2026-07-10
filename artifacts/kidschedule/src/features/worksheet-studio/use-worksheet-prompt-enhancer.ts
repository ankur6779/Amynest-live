import { useCallback, useState } from "react";
import { parseApiJson } from "@/lib/safe-json-response";
import {
  enhancePromptLocal,
  stripReferencesForApi,
  type EnhancePromptRequest,
  type EnhancePromptResponse,
} from "@workspace/worksheet-studio";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useWorksheetPromptEnhancer(authFetch: AuthFetch) {
  const [enhancing, setEnhancing] = useState(false);

  const enhance = useCallback(
    async (req: EnhancePromptRequest): Promise<EnhancePromptResponse> => {
      setEnhancing(true);
      const local = enhancePromptLocal(req);
      try {
        const res = await authFetch("/api/worksheet-studio/enhance-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...req,
            references: req.references?.length ? stripReferencesForApi(req.references) : undefined,
          }),
        });
        if (res.ok) {
          return await parseApiJson<EnhancePromptResponse>(res);
        }
        return { enhancedPrompt: local, source: "local" };
      } catch {
        return { enhancedPrompt: local, source: "local" };
      } finally {
        setEnhancing(false);
      }
    },
    [authFetch],
  );

  return { enhance, enhancing };
}
