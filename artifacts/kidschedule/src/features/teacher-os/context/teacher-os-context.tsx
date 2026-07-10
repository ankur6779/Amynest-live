import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WorksheetClass, WorksheetDifficulty, WorksheetSubject } from "@workspace/worksheet-studio";
import type { TeacherOsModuleId, TeachingPack } from "@workspace/teacher-os";
import { isTeacherOsModuleEnabled } from "@workspace/teacher-os";

export interface TeacherOsState {
  activeModule: TeacherOsModuleId;
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  topic: string;
  lastPack: TeachingPack | null;
  studioInEditor: boolean;
}

interface TeacherOsContextValue extends TeacherOsState {
  setActiveModule: (m: TeacherOsModuleId) => void;
  setClassLevel: (c: WorksheetClass) => void;
  setSubject: (s: WorksheetSubject) => void;
  setDifficulty: (d: WorksheetDifficulty) => void;
  setTopic: (t: string) => void;
  setLastPack: (p: TeachingPack | null) => void;
  setStudioInEditor: (v: boolean) => void;
}

const TeacherOsContext = createContext<TeacherOsContextValue | null>(null);

function readModuleFromUrl(): TeacherOsModuleId | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("module");
  if (!raw) return null;
  return isTeacherOsModuleEnabled(raw as TeacherOsModuleId) ? (raw as TeacherOsModuleId) : null;
}

export function TeacherOsProvider({ children, defaultModule = "dashboard" }: { children: ReactNode; defaultModule?: TeacherOsModuleId }) {
  const [activeModule, setActiveModuleState] = useState<TeacherOsModuleId>(() => readModuleFromUrl() ?? defaultModule);
  const [classLevel, setClassLevel] = useState<WorksheetClass>("ukg");
  const [subject, setSubject] = useState<WorksheetSubject>("english");
  const [difficulty, setDifficulty] = useState<WorksheetDifficulty>("easy");
  const [topic, setTopic] = useState("");
  const [lastPack, setLastPack] = useState<TeachingPack | null>(null);
  const [studioInEditor, setStudioInEditor] = useState(false);

  const setActiveModule = useCallback((m: TeacherOsModuleId) => {
    setActiveModuleState(m);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("module", m);
      window.history.replaceState(null, "", url);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const fromUrl = readModuleFromUrl();
      if (fromUrl) setActiveModuleState(fromUrl);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <TeacherOsContext.Provider
      value={{
        activeModule,
        classLevel,
        subject,
        difficulty,
        topic,
        lastPack,
        studioInEditor,
        setActiveModule,
        setClassLevel,
        setSubject,
        setDifficulty,
        setTopic,
        setLastPack,
        setStudioInEditor,
      }}
    >
      {children}
    </TeacherOsContext.Provider>
  );
}

export function useTeacherOs() {
  const ctx = useContext(TeacherOsContext);
  if (!ctx) throw new Error("useTeacherOs must be used within TeacherOsProvider");
  return ctx;
}
