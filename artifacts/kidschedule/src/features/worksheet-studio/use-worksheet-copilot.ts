import { readResolvedApiJson } from "@/lib/poll-result";
import { useCallback } from "react";
import {
  parseCopilotCommand,
  type CopilotResult,
  type WorksheetDocument,
  type WorksheetGenerateRequest,
  type WorksheetImproveAction,
} from "@workspace/worksheet-studio";

type AuthFetch = (url: string, init?: RequestInit, timeoutMs?: number) => Promise<Response>;

const AI_POLL = { maxAttempts: 20, intervalMs: 2000, requestTimeoutMs: 15_000 };
const MAX_DOC_BYTES = 400_000;

/** Trim document payload before copilot API to avoid 413 rejections. */
function trimDocumentForCopilot(doc: WorksheetDocument): WorksheetDocument {
  const clone = structuredClone(doc);
  for (const page of clone.pages) {
    for (const el of page.elements) {
      if (el.type === "image" && el.src.startsWith("data:")) {
        el.src = "";
      }
    }
  }
  let json = JSON.stringify(clone);
  if (json.length <= MAX_DOC_BYTES) return clone;
  clone.pages = clone.pages.slice(0, 1);
  json = JSON.stringify(clone);
  if (json.length <= MAX_DOC_BYTES) return clone;
  return { ...clone, pages: clone.pages.map((p) => ({ ...p, elements: p.elements.slice(0, 12) })) };
}

export function useWorksheetCopilot(authFetch: AuthFetch) {
  const run = useCallback(
    async (message: string, doc: WorksheetDocument): Promise<CopilotResult> => {
      const local = parseCopilotCommand(message, doc);
      try {
        const trimmed = trimDocumentForCopilot(doc);
        const res = await authFetch("/api/worksheet-studio/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, document: trimmed }),
        }, 30_000);
        if (res.ok) {
          const data = await readResolvedApiJson<{ result: CopilotResult }>(res, authFetch, { poll: AI_POLL });
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
