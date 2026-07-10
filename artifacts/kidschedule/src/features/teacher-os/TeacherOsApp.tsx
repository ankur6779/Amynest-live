import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import type { WorksheetDocument } from "@workspace/worksheet-studio";
import {
  isTeacherOsModuleEnabled,
  isAdminToolsVisible,
  type OnboardingStepId,
  type TeacherOsModuleId,
} from "@workspace/teacher-os";
import { saveToLibrary } from "@workspace/worksheet-studio/client";
import { TeacherOsProvider, useTeacherOs } from "./context/teacher-os-context";
import { TeacherOsNav } from "./layout/TeacherOsNav";
import { TeacherOsDashboard } from "./TeacherOsDashboard";
import { TeacherOsTeachingPack } from "./TeacherOsTeachingPack";
import { TeacherOsDailyPlanner } from "./TeacherOsDailyPlanner";
import { TeacherOsWeeklyPlanner } from "./TeacherOsWeeklyPlanner";
import { TeacherOsCurriculum } from "./TeacherOsCurriculum";
import { TeacherOsLessonChat } from "./TeacherOsLessonChat";
import { TeacherOsSearch } from "./TeacherOsSearch";
import { TeacherOsAnalytics } from "./TeacherOsAnalytics";
import { TeacherOsComingSoon } from "./TeacherOsComingSoon";
import { TeacherOsOnboarding, shouldShowTeacherOsOnboarding } from "./TeacherOsOnboarding";
import { TeacherOsFeatureTip } from "./TeacherOsFeatureTip";
import { TeacherOsFeedbackSheet } from "./TeacherOsFeedbackSheet";
import { TeacherOsSatisfactionPrompt } from "./TeacherOsSatisfactionPrompt";
import { TeacherOsPilotDashboard } from "./TeacherOsPilotDashboard";
import { WorksheetStudioApp } from "@/features/worksheet-studio/WorksheetStudioApp";
import { WorksheetErrorBoundary } from "@/features/worksheet-studio/WorksheetErrorBoundary";
import { WS_PAGE } from "@/features/worksheet-studio/worksheet-studio-theme";
import {
  initTeacherOsSession,
  endTeacherOsSession,
  trackTeacherOsModule,
} from "./teacher-os-analytics";

type Props = {
  defaultModule?: TeacherOsModuleId;
};

function TeacherOsShell() {
  const { activeModule, setActiveModule, setStudioInEditor, studioInEditor, topic } = useTeacherOs();
  const openPackRef = useRef<((docs: WorksheetDocument[], label: string) => void) | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowTeacherOsOnboarding);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [satisfactionContext, setSatisfactionContext] = useState<string | null>(null);
  const prevModule = useRef(activeModule);

  useEffect(() => {
    initTeacherOsSession();
    return () => endTeacherOsSession();
  }, []);

  useEffect(() => {
    if (prevModule.current !== activeModule) {
      trackTeacherOsModule(activeModule);
      prevModule.current = activeModule;
    }
  }, [activeModule]);

  const handleOpenDocuments = useCallback(async (docs: WorksheetDocument[], label: string) => {
    for (const doc of docs) {
      void saveToLibrary(doc, { collection: label }).catch(() => {});
    }
    setSatisfactionContext(label);
    setActiveModule("studio");
    if (openPackRef.current) {
      openPackRef.current(docs, label);
    } else {
      toast.info(`${label} ready`, { description: `${docs.length} items saved to library.` });
    }
  }, [setActiveModule]);

  const goToOnboardingStep = (step: OnboardingStepId) => {
    const map: Record<OnboardingStepId, TeacherOsModuleId> = {
      create_first_lesson: "dashboard",
      generate_first_worksheet: "studio",
      export_pdf: "studio",
      open_studio: "studio",
      create_homework: "teaching_pack",
    };
    setActiveModule(map[step]);
    setShowOnboarding(false);
  };

  const renderModule = () => {
    if (activeModule === "admin_dashboard" && isAdminToolsVisible()) {
      return <TeacherOsPilotDashboard />;
    }
    if (!isTeacherOsModuleEnabled(activeModule)) {
      return <TeacherOsComingSoon moduleId={activeModule} />;
    }
    switch (activeModule) {
      case "dashboard":
        return <TeacherOsDashboard onOpenDocuments={handleOpenDocuments} />;
      case "teaching_pack":
        return <TeacherOsTeachingPack onOpenDocuments={handleOpenDocuments} />;
      case "daily_planner":
        return <TeacherOsDailyPlanner />;
      case "weekly_planner":
        return <TeacherOsWeeklyPlanner onOpenDocuments={handleOpenDocuments} />;
      case "curriculum":
        return <TeacherOsCurriculum />;
      case "studio":
        return (
          <WorksheetStudioApp
            embedded
            onViewChange={setStudioInEditor}
            onRegisterOpenPack={(fn) => { openPackRef.current = fn; }}
            onWorksheetReady={(ctx) => setSatisfactionContext(ctx)}
          />
        );
      case "lesson_chat":
        return <TeacherOsLessonChat onCreateLesson={() => setActiveModule("dashboard")} />;
      case "search":
        return <TeacherOsSearch />;
      case "analytics":
        return isAdminToolsVisible() ? <TeacherOsPilotDashboard /> : <TeacherOsAnalytics />;
      default:
        return <TeacherOsComingSoon moduleId={activeModule} />;
    }
  };

  const hideNav = activeModule === "studio" && studioInEditor;

  return (
    <div className={cn(WS_PAGE, "min-h-dvh pb-20", hideNav && "pb-0")}>
      {!hideNav && (
        <div className="sticky top-0 z-20 flex justify-end px-3 py-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-[#1e3a5f]/8 px-3 py-1.5 text-xs font-medium text-[#1e3a5f] touch-manipulation"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Feedback
          </button>
        </div>
      )}
      <main className="w-full min-w-0">{renderModule()}</main>
      {!hideNav && <TeacherOsFeatureTip onNavigate={setActiveModule} />}
      {!hideNav && <TeacherOsNav />}
      {showOnboarding && !hideNav && (
        <TeacherOsOnboarding onComplete={() => setShowOnboarding(false)} onGoToStep={goToOnboardingStep} />
      )}
      <TeacherOsFeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        worksheetMeta={studioInEditor && topic ? { title: topic, topic, id: "studio-active" } : undefined}
      />
      {satisfactionContext && (
        <TeacherOsSatisfactionPrompt context={satisfactionContext} onDismiss={() => setSatisfactionContext(null)} />
      )}
    </div>
  );
}

export function TeacherOsApp({ defaultModule = "dashboard" }: Props) {
  return (
    <TeacherOsProvider defaultModule={defaultModule}>
      <WorksheetErrorBoundary>
        <TeacherOsShell />
      </WorksheetErrorBoundary>
    </TeacherOsProvider>
  );
}
