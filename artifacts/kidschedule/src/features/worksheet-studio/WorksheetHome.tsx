import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  CLASS_LABELS,
  DIFFICULTY_LABELS,
  PROMPT_PLACEHOLDERS,
  SUBJECT_LABELS,
  buildGenerationSummary,
  savePromptHistory,
  incrementPromptUsage,
  type ReferenceImageMode,
  type WorksheetClass,
  type WorksheetDifficulty,
  type WorksheetGenerateRequest,
  type WorksheetLanguage,
  type WorksheetReconstructRequest,
  type WorksheetReferenceContext,
  type WorksheetSubject,
  type WorksheetTemplate,
} from "@workspace/worksheet-studio";
import { BookOpen, CalendarDays, FileText, FolderOpen, KeyRound, Loader2, Settings2, Sparkles } from "lucide-react";
import {
  WS_CHIP,
  WS_CHIP_ACTIVE,
  WS_GLASS_CARD,
  WS_HERO_GRADIENT,
  WS_PAGE,
  WS_PRIMARY_BTN,
  WS_SECTION_LABEL,
  WS_OUTLINE_BTN,
  WS_MUTED_TEXT,
  WS_CAPTION,
  WS_CONTAINER,
  WS_TOUCH,
  WS_HEADING,
  WS_ACTION_STACK,
} from "./worksheet-studio-theme";
import { WorksheetTemplates } from "./WorksheetTemplates";
import { WorksheetReconstructionPanel } from "./WorksheetReconstructionPanel";
import { WorksheetPromptComposer } from "./WorksheetPromptComposer";
import { GenerationSummaryDialog } from "./GenerationSummaryDialog";
import { PromptHistorySheet } from "./PromptHistorySheet";
import { PromptQualityMeter } from "./PromptQualityMeter";
import { ReferenceAnalysisCard } from "./ReferenceAnalysisCard";
import { useWorksheetPromptEnhancer } from "./use-worksheet-prompt-enhancer";
import { useReferenceVision } from "./use-reference-vision";
import { hapticWorksheetTap } from "./worksheet-haptics";
import { trackWorksheetEvent } from "./worksheet-studio-analytics";
import type { PromptHistoryEntry } from "@workspace/worksheet-studio";

const LPS_BANNER_LOGO = "/illustrations/worksheet-studio/lps-banner-logo.png";

const CLASSES = Object.keys(CLASS_LABELS) as WorksheetClass[];
const SUBJECTS = Object.keys(SUBJECT_LABELS) as WorksheetSubject[];
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as WorksheetDifficulty[];
const PAGE_OPTIONS = [1, 2, 3, 4] as const;

const LANGUAGES: { id: WorksheetLanguage; label: string }[] = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "bilingual", label: "Bilingual" },
];

type Props = {
  onGenerate: (req: WorksheetGenerateRequest) => void;
  onReconstruct?: (req: WorksheetReconstructRequest) => void;
  onOpenDrafts?: () => void;
  onOpenLibrary?: () => void;
  onOpenProductivity?: () => void;
  onOpenBranding?: () => void;
  onRegisterBuilder?: (fn: () => WorksheetGenerateRequest) => void;
  onRegisterLanguage?: (lang: WorksheetLanguage) => void;
  loading: boolean;
  hasDraft?: boolean;
};

function ChipRow<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className={WS_SECTION_LABEL}>{label}</p>
      <div className="flex w-full min-w-0 flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { void hapticWorksheetTap(); onChange(opt); }}
            className={cn(
              value === opt ? WS_CHIP_ACTIVE : WS_CHIP,
              "min-h-12 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto touch-manipulation",
            )}
            aria-pressed={value === opt}
            aria-label={`${label}: ${labels[opt]}`}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorksheetHome({
  onGenerate, onReconstruct, onOpenDrafts, onOpenLibrary, onOpenProductivity, onOpenBranding, onRegisterBuilder, onRegisterLanguage, loading, hasDraft,
}: Props) {
  const authFetch = useAuthFetch();
  const { enhance, enhancing } = useWorksheetPromptEnhancer(authFetch);
  const { analyze, analyzing, merged, setMerged } = useReferenceVision(authFetch);

  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | undefined>();
  const [references, setReferences] = useState<WorksheetReferenceContext[]>([]);
  const [imageMode, setImageMode] = useState<ReferenceImageMode>("similar_style");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisApplied, setAnalysisApplied] = useState(false);
  const [classLevel, setClassLevel] = useState<WorksheetClass>("ukg");
  const [subject, setSubject] = useState<WorksheetSubject>("english");
  const [difficulty, setDifficulty] = useState<WorksheetDifficulty>("easy");
  const [pageCount, setPageCount] = useState(1);
  const [language, setLanguage] = useState<WorksheetLanguage>("english");
  const [placeholderIdx] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingAnswerKey, setPendingAnswerKey] = useState(false);
  const generateGuardRef = useRef(false);

  const placeholder = PROMPT_PLACEHOLDERS[placeholderIdx]!;
  const effectivePrompt = prompt.trim() || placeholder;

  const buildRequest = useCallback((answerKey: boolean): WorksheetGenerateRequest => ({
    prompt: prompt.trim() || placeholder,
    classLevel,
    subject,
    difficulty,
    pageCount,
    answerKey,
    enhancedPrompt: enhancedPrompt?.trim() || undefined,
    references: references.length ? references : undefined,
    imageMode: references.length ? imageMode : undefined,
    language,
  }), [prompt, classLevel, subject, difficulty, pageCount, placeholder, enhancedPrompt, references, imageMode, language]);

  useEffect(() => {
    onRegisterBuilder?.(() => buildRequest(false));
  }, [buildRequest, onRegisterBuilder]);

  useEffect(() => {
    onRegisterLanguage?.(language);
  }, [language, onRegisterLanguage]);

  const summary = buildGenerationSummary({
    classLevel,
    subject,
    difficulty,
    pageCount,
    prompt: prompt.trim() || placeholder,
    enhancedPrompt,
    references,
    imageMode,
    language,
  });

  const handleEnhance = async () => {
    if (enhancing) return;
    trackWorksheetEvent("worksheet_prompt_enhance");
    setOriginalPrompt(effectivePrompt);
    try {
      const result = await enhance({
        prompt: effectivePrompt,
        classLevel,
        subject,
        difficulty,
        pageCount,
        language,
        references,
      });
      if (result.enhancedPrompt?.trim()) {
        setEnhancedPrompt(result.enhancedPrompt);
      } else {
        toast.error("Could not enhance prompt", { description: "Please try again." });
      }
    } catch {
      toast.error("Enhance failed", { description: "Check your connection and try again." });
    }
  };

  useEffect(() => {
    if (references.length > 0) {
      setShowAnalysis(true);
      void analyze(references).then(() => {
        trackWorksheetEvent("worksheet_vision_analyze", { count: references.length });
      });
    } else {
      setShowAnalysis(false);
      setAnalysisApplied(false);
      setMerged({});
    }
  }, [references.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyAnalysis = () => {
    if (merged.classLevel) setClassLevel(merged.classLevel);
    if (merged.subject) setSubject(merged.subject);
    if (merged.difficulty) setDifficulty(merged.difficulty);
    if (merged.pageCount && merged.pageCount >= 1) setPageCount(Math.min(4, merged.pageCount));
    if (merged.language) setLanguage(merged.language);
    if (merged.topic && !prompt.trim()) setPrompt(`Create a worksheet on ${merged.topic}`);
    setAnalysisApplied(true);
    trackWorksheetEvent("worksheet_vision_template_apply");
  };

  const promptQualityInput = {
    prompt: prompt.trim() || placeholder,
    classLevel,
    subject,
    difficulty,
    pageCount,
    language,
    enhancedPrompt,
    referenceCount: references.length,
    analysis: merged,
  };

  const confirmGenerate = () => {
    if (loading || generateGuardRef.current) return;
    generateGuardRef.current = true;
    const req = buildRequest(pendingAnswerKey);
    savePromptHistory({
      prompt: req.prompt,
      enhancedPrompt: req.enhancedPrompt,
      classLevel: req.classLevel,
      subject: req.subject,
      difficulty: req.difficulty,
      pageCount: req.pageCount,
      referenceCount: references.length,
    });
    setSummaryOpen(false);
    toast.info("Generating worksheet…", { description: "This usually takes under 20 seconds." });
    onGenerate(req);
    window.setTimeout(() => { generateGuardRef.current = false; }, 1500);
  };

  const requestGenerate = (answerKey: boolean) => {
    if (loading) return;
    void hapticWorksheetTap();
    if (!effectivePrompt.trim()) {
      toast.error("Add a prompt first", { description: "Describe your worksheet or pick a template." });
      return;
    }
    setPendingAnswerKey(answerKey);
    setSummaryOpen(true);
  };

  const applyTemplate = (t: WorksheetTemplate) => {
    setPrompt(t.request.prompt);
    setClassLevel(t.request.classLevel);
    setSubject(t.request.subject);
    setDifficulty(t.request.difficulty);
    setPageCount(t.request.pageCount);
    setEnhancedPrompt(undefined);
  };

  const restoreHistory = (entry: PromptHistoryEntry) => {
    incrementPromptUsage(entry.id);
    setPrompt(entry.prompt);
    setEnhancedPrompt(entry.enhancedPrompt);
    setClassLevel(entry.classLevel);
    setSubject(entry.subject);
    setDifficulty(entry.difficulty);
    setPageCount(entry.pageCount);
  };

  return (
    <div className={WS_PAGE}>
      <div className={WS_CONTAINER}>
        <header className={cn(WS_GLASS_CARD, "w-full min-w-0 px-4 py-6 text-center sm:px-5")}>
          <img
            src={LPS_BANNER_LOGO}
            alt="Lucknow Public School — C.P. Singh Foundation"
            className="mx-auto h-16 w-auto max-w-full object-contain sm:h-[4.5rem]"
          />
          <h1 className={cn(WS_HEADING, WS_HERO_GRADIENT)}>
            LPS AI Worksheet Studio
          </h1>
          <p className={cn("mt-2 text-sm", WS_MUTED_TEXT)}>
            Create beautiful worksheets in seconds — mobile-first, print-ready.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {onOpenLibrary && (
              <Button variant="outline" size="sm" className={cn(WS_OUTLINE_BTN, "h-10 rounded-full")} onClick={onOpenLibrary}>
                <FolderOpen className="mr-1.5 h-4 w-4" /> Library
              </Button>
            )}
            {onOpenProductivity && (
              <Button variant="outline" size="sm" className={cn(WS_OUTLINE_BTN, "h-10 rounded-full")} onClick={onOpenProductivity}>
                <CalendarDays className="mr-1.5 h-4 w-4" /> Productivity
              </Button>
            )}
            {onOpenBranding && (
              <Button variant="outline" size="sm" className={cn(WS_OUTLINE_BTN, "h-10 rounded-full")} onClick={onOpenBranding}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Branding
              </Button>
            )}
            {hasDraft && onOpenDrafts && (
              <Button variant="link" className="h-10 text-[#1e3a5f] touch-manipulation" onClick={onOpenDrafts}>
                <FileText className="mr-1.5 h-4 w-4" /> Resume draft
              </Button>
            )}
          </div>
        </header>

        <WorksheetTemplates onSelect={applyTemplate} />

        {onReconstruct && (
          <WorksheetReconstructionPanel
            classLevel={classLevel}
            subject={subject}
            difficulty={difficulty}
            language={language}
            onReconstruct={onReconstruct}
            loading={loading}
          />
        )}

        <WorksheetPromptComposer
          prompt={prompt}
          onPromptChange={setPrompt}
          enhancedPrompt={enhancedPrompt}
          originalPrompt={originalPrompt}
          onEnhancedPromptChange={setEnhancedPrompt}
          references={references}
          onReferencesChange={setReferences}
          imageMode={imageMode}
          onImageModeChange={setImageMode}
          onEnhance={() => void handleEnhance()}
          enhancing={enhancing}
          canEnhance={Boolean(effectivePrompt.trim())}
          onOpenHistory={() => setHistoryOpen(true)}
        />

        <ReferenceAnalysisCard
          visible={showAnalysis && references.length > 0 && !analysisApplied}
          merged={merged}
          analyzing={analyzing}
          onAnalyze={() => void analyze(references, true)}
          onUseTemplate={applyAnalysis}
          onIgnore={() => { setShowAnalysis(false); setAnalysisApplied(true); }}
        />

        <PromptQualityMeter input={promptQualityInput} />

        <div className={cn(WS_GLASS_CARD, "w-full min-w-0 space-y-4 p-4")}>
          <ChipRow label="Age / Class" options={CLASSES} labels={CLASS_LABELS} value={classLevel} onChange={setClassLevel} />
          <ChipRow label="Subject" options={SUBJECTS} labels={SUBJECT_LABELS} value={subject} onChange={setSubject} />
          <ChipRow label="Difficulty" options={DIFFICULTIES} labels={DIFFICULTY_LABELS} value={difficulty} onChange={setDifficulty} />
          <div className="space-y-2.5">
            <p className={WS_SECTION_LABEL}>Language</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => { void hapticWorksheetTap(); setLanguage(lang.id); }}
                  className={cn(language === lang.id ? WS_CHIP_ACTIVE : WS_CHIP, "touch-manipulation")}
                  aria-pressed={language === lang.id}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <p className={WS_SECTION_LABEL}>Pages</p>
            <div className="flex gap-2">
              {PAGE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} pages`}
                  onClick={() => { void hapticWorksheetTap(); setPageCount(n); }}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold touch-manipulation",
                    pageCount === n ? WS_CHIP_ACTIVE : WS_CHIP,
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={WS_ACTION_STACK}>
          <Button className={cn(WS_PRIMARY_BTN, WS_TOUCH, "w-full")} disabled={loading} onClick={() => requestGenerate(false)}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            {loading ? "Generating…" : "Generate Worksheet"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-14 w-full rounded-2xl text-base")}
            disabled={loading}
            onClick={() => requestGenerate(true)}
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Generate Answer Key
          </Button>
        </div>

        <p className={cn("flex items-center justify-center gap-1.5 text-center", WS_CAPTION)}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Official LPS header on page 1 · Auto-saved offline
        </p>
      </div>

      <GenerationSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        summary={summary}
        onConfirm={confirmGenerate}
        loading={loading}
        answerKey={pendingAnswerKey}
      />

      <PromptHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestore={restoreHistory}
      />
    </div>
  );
}
