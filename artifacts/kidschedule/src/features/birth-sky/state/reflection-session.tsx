/**
 * Module-session reflection composer draft (Pack 5 Addendum A §2).
 * Keep across segment switches; discard on module unmount.
 * Never persist draft text to disk / analytics.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReflectionComposerDraft } from "../domain/models/reflection";

type ReflectionSessionValue = {
  draft: ReflectionComposerDraft | null;
  setDraft: (draft: ReflectionComposerDraft | null) => void;
  clearDraft: () => void;
  /** Sticky prompt override for the module session (e.g. Tradition → Reflect). */
  activePromptId: string | null;
  setActivePromptId: (id: string | null) => void;
  /** One-shot: open composer when arriving from Tradition. */
  openComposerRequest: boolean;
  requestOpenComposer: (promptId: string) => void;
  consumeOpenComposerRequest: () => void;
};

const ReflectionSessionContext = createContext<ReflectionSessionValue | null>(null);

export function BirthSkyReflectionSessionProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<ReflectionComposerDraft | null>(null);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [openComposerRequest, setOpenComposerRequest] = useState(false);

  const setDraft = useCallback((next: ReflectionComposerDraft | null) => {
    setDraftState(next);
  }, []);

  const clearDraft = useCallback(() => setDraftState(null), []);

  const requestOpenComposer = useCallback((promptId: string) => {
    setActivePromptId(promptId);
    setOpenComposerRequest(true);
  }, []);

  const consumeOpenComposerRequest = useCallback(() => {
    setOpenComposerRequest(false);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      clearDraft,
      activePromptId,
      setActivePromptId,
      openComposerRequest,
      requestOpenComposer,
      consumeOpenComposerRequest,
    }),
    [
      draft,
      setDraft,
      clearDraft,
      activePromptId,
      openComposerRequest,
      requestOpenComposer,
      consumeOpenComposerRequest,
    ],
  );

  return (
    <ReflectionSessionContext.Provider value={value}>
      {children}
    </ReflectionSessionContext.Provider>
  );
}

export function useReflectionSession(): ReflectionSessionValue {
  const ctx = useContext(ReflectionSessionContext);
  if (!ctx) {
    // Fallback for isolated tests — session-local only.
    return {
      draft: null,
      setDraft: () => undefined,
      clearDraft: () => undefined,
      activePromptId: null,
      setActivePromptId: () => undefined,
      openComposerRequest: false,
      requestOpenComposer: () => undefined,
      consumeOpenComposerRequest: () => undefined,
    };
  }
  return ctx;
}
