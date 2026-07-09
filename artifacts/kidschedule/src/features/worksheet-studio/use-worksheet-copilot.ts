import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback } from "react";
import {
  parseCopilotCommand,
  type CopilotResult,
  type WorksheetDocument,
  type WorksheetGenerateRequest,
  type WorksheetImproveAction,
} from "@workspace/worksheet-studio";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useWorksheetCopilot(authFetch: AuthFetch) {
  const run = useCallback(
    async (message: string, doc: WorksheetDocument): Promise<CopilotResult> => {
      const local = parseCopilotCommand(message, doc);
      try {
        const res = await authFetch("/api/worksheet-studio/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, document: doc }),
        });
        if (res.ok) {
          const data = await parseApiJson<{ result: CopilotResult }>(res);
          return data.result ?? local;
        }
      } catch { /* offline */ }
      return local;
    },
    [authFetch],
  );

  return { run };
}

export function copilotToGeneratePatch(
  result: CopilotResult,
  doc: WorksheetDocument,
): WorksheetGenerateRequest | null {
  if (result.kind !== "regenerate") return null;
  return {
    prompt: result.request.prompt ?? doc.prompt,
    classLevel: result.request.classLevel ?? doc.meta.classLevel,
    subject: result.request.subject ?? doc.meta.subject,
    difficulty: result.request.difficulty ?? doc.meta.difficulty,
    pageCount: result.request.pageCount ?? doc.meta.pageCount,
    answerKey: doc.meta.isAnswerKey,
  };
}

export function copilotToAction(result: CopilotResult): WorksheetImproveAction | null {
  return result.kind === "action" ? result.action : null;
}
