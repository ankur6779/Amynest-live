import { useCallback, useEffect, useRef, useState } from "react";
import type { WorksheetDocument, WorksheetGenerateRequest } from "@workspace/worksheet-studio";
import {
  AUTO_SAVE_INTERVAL_MS,
  loadLatestDraft,
  saveDraftVersion,
} from "@workspace/worksheet-studio/client";

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

export function useWorksheetAutosave(
  document: WorksheetDocument | null,
  onRestore?: (doc: WorksheetDocument) => void,
) {
  const restored = useRef(false);
  const lastHash = useRef("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (restored.current || document) return;
    restored.current = true;
    void loadLatestDraft().then((draft) => {
      if (draft?.document && onRestore) {
        onRestore(draft.document);
        setSavedAt(draft.savedAt);
      }
    });
  }, [document, onRestore]);

  useEffect(() => {
    if (!document) return;

    const save = async () => {
      const hash = documentContentHash(document);
      if (hash === lastHash.current) return;
      lastHash.current = hash;
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
  }, [document]);

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
