import { useCallback, useEffect, useRef, useState } from "react";
import type { WorksheetDocument } from "@workspace/worksheet-studio";
import { shouldSkipDraftRestore } from "@workspace/worksheet-studio";
import {
  AUTO_SAVE_INTERVAL_MS,
  saveDraftVersion,
} from "@workspace/worksheet-studio/client";
import { getEditorSyncAudit } from "./editor-state-sync-audit";

type SaveState = "idle" | "saving" | "saved" | "offline";

function documentContentHash(doc: WorksheetDocument): string {
  return JSON.stringify({
    v: doc.version,
    pages: doc.pages.map((p) =>
      p.elements.map((e) => ({
        id: e.id,
        x: Math.round(e.x),
        y: Math.round(e.y),
        t: e.type,
        c: e.type === "text" ? e.content : e.type === "question_block" ? e.prompt : undefined,
      })),
    ),
  });
}

export function useWorksheetAutosave(document: WorksheetDocument | null) {
  const lastHash = useRef("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const cleanSession = shouldSkipDraftRestore();

  useEffect(() => {
    if (!document || cleanSession) return;

    const save = async () => {
      const hash = documentContentHash(document);
      if (hash === lastHash.current) return;
      lastHash.current = hash;
      getEditorSyncAudit()?.logOp("autosave", "Autosave", "interval_save", {
        documentId: document.id,
        version: document.version,
      });
      // Autosave must NEVER mutate WorksheetDocument — only persist.
      setSaveState("saving");
      try {
        const ver = await saveDraftVersion(document);
        setSavedAt(ver.savedAt);
        setSaveState(navigator.onLine ? "saved" : "offline");
      } catch {
        setSaveState("offline");
      }
    };

    const timer = window.setInterval(() => void save(), AUTO_SAVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [document, cleanSession]);

  useEffect(() => {
    const onOnline = () => setSaveState((s) => (s === "offline" ? "saved" : s));
    const onOffline = () => setSaveState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const saveNow = useCallback(async (doc: WorksheetDocument) => {
    if (shouldSkipDraftRestore()) {
      setSaveState("idle");
      return;
    }
    getEditorSyncAudit()?.logOp("autosave", "Autosave", "saveNow", {
      documentId: doc.id,
      version: doc.version,
    });
    setSaveState("saving");
    try {
      const ver = await saveDraftVersion(doc);
      setSavedAt(ver.savedAt);
      setSaveState(navigator.onLine ? "saved" : "offline");
      lastHash.current = documentContentHash(doc);
    } catch {
      setSaveState("offline");
      throw new Error("Failed to save draft");
    }
  }, []);

  return { saveNow, saveState, savedAt };
}
