import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useState } from "react";
import {
  generateQuickActionLocal,
  type QuickActionInput,
  type QuickActionResult,
  type QuickActionType,
} from "@workspace/event-prep";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useEventPrepQuickAction(authFetch: AuthFetch) {
  const [loading, setLoading] = useState<QuickActionType | null>(null);
  const [result, setResult] = useState<QuickActionResult | null>(null);

  const clear = useCallback(() => setResult(null), []);

  const run = useCallback(
    async (input: QuickActionInput) => {
      setLoading(input.type);
      const local = generateQuickActionLocal(input);
      try {
        const res = await authFetch("/api/event-prep/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: input.type,
            eventId: input.event.id,
            childAge: input.childAge,
            childName: input.childName,
            country: input.country,
            customTheme: input.customTheme,
          }),
        });
        if (res.ok) {
          const data = (await parseApiJson<QuickActionResult & { usedFallback?: boolean }>(res));
          setResult({
            type: data.type,
            title: data.title,
            intro: data.intro,
            items: data.items,
            source: data.source ?? (data.usedFallback ? "local" : "ai"),
          });
        } else {
          setResult(local);
        }
      } catch {
        setResult(local);
      } finally {
        setLoading(null);
      }
    },
    [authFetch],
  );

  return { run, loading, result, clear };
}
