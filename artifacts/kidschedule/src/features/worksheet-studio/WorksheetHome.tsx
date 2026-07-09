import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CLASS_LABELS,
  DIFFICULTY_LABELS,
  PROMPT_PLACEHOLDERS,
  SUBJECT_LABELS,
  type WorksheetClass,
  type WorksheetDifficulty,
  type WorksheetGenerateRequest,
  type WorksheetSubject,
  type WorksheetTemplate,
} from "@workspace/worksheet-studio";
import type { WorksheetLanguage } from "@workspace/worksheet-studio";
import { BookOpen, CalendarDays, FileText, FolderOpen, KeyRound, Loader2, Settings2, Sparkles } from "lucide-react";
import {
  WS_CHIP,
  WS_CHIP_ACTIVE,
  WS_GLASS_CARD,
  WS_HERO_GRADIENT,
  WS_PAGE,
  WS_PRIMARY_BTN,
  WS_PROMPT_BOX,
  WS_SECTION_LABEL,
} from "./worksheet-studio-theme";
import { WorksheetTemplates } from "./WorksheetTemplates";
import { hapticWorksheetTap } from "./worksheet-haptics";

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
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { void hapticWorksheetTap(); onChange(opt); }}
            className={cn(value === opt ? WS_CHIP_ACTIVE : WS_CHIP, "min-w-[4.5rem] touch-manipulation")}
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
  onGenerate, onOpenDrafts, onOpenLibrary, onOpenProductivity, onOpenBranding, onRegisterBuilder, onRegisterLanguage, loading, hasDraft,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [classLevel, setClassLevel] = useState<WorksheetClass>("ukg");
  const [subject, setSubject] = useState<WorksheetSubject>("english");
  const [difficulty, setDifficulty] = useState<WorksheetDifficulty>("easy");
  const [pageCount, setPageCount] = useState(1);
  const [language, setLanguage] = useState<WorksheetLanguage>("english");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PROMPT_PLACEHOLDERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const placeholder = PROMPT_PLACEHOLDERS[placeholderIdx]!;

  const buildRequest = (answerKey: boolean): WorksheetGenerateRequest => ({
    prompt: prompt.trim() || placeholder,
    classLevel,
    subject,
    difficulty,
    pageCount,
    answerKey,
  });

  useEffect(() => {
    onRegisterBuilder?.(() => buildRequest(false));
  }, [prompt, classLevel, subject, difficulty, pageCount, placeholder, onRegisterBuilder]);

  useEffect(() => {
    onRegisterLanguage?.(language);
  }, [language, onRegisterLanguage]);

  const handleGenerate = (answerKey: boolean) => {
    void hapticWorksheetTap();
    onGenerate(buildRequest(answerKey));
  };

  const applyTemplate = (t: WorksheetTemplate) => {
    setPrompt(t.request.prompt);
    setClassLevel(t.request.classLevel);
    setSubject(t.request.subject);
    setDifficulty(t.request.difficulty);
    setPageCount(t.request.pageCount);
  };

  return (
    <div className={cn(WS_PAGE, "pb-28")}>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <header className={cn(WS_GLASS_CARD, "px-5 py-6 text-center")}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2a5a8a] shadow-lg">
            <Sparkles className="h-7 w-7 text-[#c9a227]" aria-hidden />
          </div>
          <h1 className={cn("text-2xl font-bold tracking-tight sm:text-3xl", WS_HERO_GRADIENT)}>
            LPS AI Worksheet Studio
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create beautiful worksheets in seconds — mobile-first, print-ready.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {onOpenLibrary && (
              <Button variant="outline" size="sm" className="h-10 rounded-full touch-manipulation" onClick={onOpenLibrary}>
                <FolderOpen className="mr-1.5 h-4 w-4" /> Library
              </Button>
            )}
            {onOpenProductivity && (
              <Button variant="outline" size="sm" className="h-10 rounded-full touch-manipulation" onClick={onOpenProductivity}>
                <CalendarDays className="mr-1.5 h-4 w-4" /> Productivity
              </Button>
            )}
            {onOpenBranding && (
              <Button variant="outline" size="sm" className="h-10 rounded-full touch-manipulation" onClick={onOpenBranding}>
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

        <div className={cn(WS_GLASS_CARD, "p-4")}>
          <label className="block space-y-2">
            <p className={WS_SECTION_LABEL}>Describe your worksheet</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={4}
              aria-label="Worksheet description"
              className={WS_PROMPT_BOX}
            />
          </label>
        </div>

        <div className={cn(WS_GLASS_CARD, "space-y-4 p-4")}>
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

        <div className="flex flex-col gap-3">
          <Button className={WS_PRIMARY_BTN} disabled={loading} onClick={() => handleGenerate(false)}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Generate Worksheet
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 rounded-2xl border-[#1e3a5f]/20 bg-white/80 text-base font-semibold touch-manipulation"
            disabled={loading}
            onClick={() => handleGenerate(true)}
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Generate Answer Key
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Official LPS header on page 1 · Auto-saved offline
        </p>
      </div>
    </div>
  );
}
