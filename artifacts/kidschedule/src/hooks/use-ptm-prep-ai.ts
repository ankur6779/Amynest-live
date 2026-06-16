import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useState } from "react";
import {
  generateAmyActionsLocal,
  generateAmyQuestionsLocal,
  type AmyActionsResult,
  type AmyQuestionsResult,
  type PtmNotes,
} from "@workspace/ptm-prep";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function usePtmPrepAi(authFetch: AuthFetch) {
  const [loading, setLoading] = useState<"questions" | "actions" | null>(null);

  const generateQuestions = useCallback(
    async (input: {
      childAge?: number;
      childName?: string;
      teacherName?: string;
      className?: string;
      previousWeakAreas?: string;
    }): Promise<AmyQuestionsResult> => {
      const local = generateAmyQuestionsLocal(input);
      setLoading("questions");
      try {
        const res = await authFetch("/api/ptm-prep/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "questions", ...input }),
        });
        if (res.ok) {
          const data = (await parseApiJson<AmyQuestionsResult & { usedFallback?: boolean }>(res));
          return {
            questions: data.questions ?? local.questions,
            source: data.source ?? (data.usedFallback ? "local" : "ai"),
          };
        }
      } catch {
        /* fall through */
      } finally {
        setLoading(null);
      }
      return local;
    },
    [authFetch],
  );

  const generateActions = useCallback(
    async (input: {
      childAge?: number;
      childName?: string;
      notes: PtmNotes;
    }): Promise<AmyActionsResult> => {
      const local = generateAmyActionsLocal(input.notes);
      setLoading("actions");
      try {
        const res = await authFetch("/api/ptm-prep/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "actions",
            childAge: input.childAge,
            childName: input.childName,
            notes: input.notes,
          }),
        });
        if (res.ok) {
          const data = (await parseApiJson<AmyActionsResult & { usedFallback?: boolean }>(res));
          return {
            actions: data.actions ?? local.actions,
            source: data.source ?? (data.usedFallback ? "local" : "ai"),
          };
        }
      } catch {
        /* fall through */
      } finally {
        setLoading(null);
      }
      return local;
    },
    [authFetch],
  );

  return { generateQuestions, generateActions, loading };
}
