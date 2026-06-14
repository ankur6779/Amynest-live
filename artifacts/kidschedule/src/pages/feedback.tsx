import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Link } from "wouter";
import {
  MessageSquarePlus,
  Upload,
  X,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Heart,
  CheckCircle2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticGameSuccess } from "@/lib/game-haptics";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "feature_request",       emoji: "💡", label: "Feature Request" },
  { id: "bug_report",            emoji: "🐞", label: "Report a Bug" },
  { id: "ui_feedback",           emoji: "🎨", label: "UI / Design" },
  { id: "ai_feedback",           emoji: "🤖", label: "Ask AMY Feedback" },
  { id: "content_suggestion",    emoji: "📚", label: "Content Suggestion" },
  { id: "nutrition_feedback",    emoji: "🍱", label: "Nutrition Feedback" },
  { id: "notification_feedback", emoji: "🔔", label: "Notification Feedback" },
  { id: "general_experience",    emoji: "❤️", label: "General Experience" },
  { id: "improvement_idea",      emoji: "🚀", label: "Improvement Idea" },
] as const;

const PRIMARY_CATEGORY_IDS = new Set([
  "feature_request",
  "bug_report",
  "ui_feedback",
  "ai_feedback",
  "content_suggestion",
]);

const CATEGORY_PROMPTS: Record<string, string> = {
  feature_request: "What feature would help your parenting most?",
  bug_report: "What were you doing when this happened? What did you expect instead?",
  ui_feedback: "Which screen or element feels confusing or hard to use?",
  ai_feedback: "What should AMY improve in her answers or suggestions?",
  content_suggestion: "What stories, activities, or topics would your child enjoy?",
  nutrition_feedback: "What would make meal planning easier for your family?",
  notification_feedback: "Are notifications too frequent, poorly timed, or easy to miss?",
  general_experience: "What would make AmyNest feel more personal for your family?",
  improvement_idea: "What's one change that would save you the most time each day?",
};

const GENERIC_PROMPTS = [
  "What feature would help your parenting most?",
  "Anything confusing in the app?",
  "Is there anything frustrating about the daily schedule?",
  "How could we make the app feel more personal?",
];

const RATINGS = [
  { value: 1, emoji: "😞", label: "Poor" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "😊", label: "Good" },
  { value: 4, emoji: "🤩", label: "Amazing" },
] as const;

const APP_VERSION = "2.0.0";

const primaryCategories = CATEGORIES.filter(c => PRIMARY_CATEGORY_IDS.has(c.id));
const moreCategories = CATEGORIES.filter(c => !PRIMARY_CATEGORY_IDS.has(c.id));

// ─── Image compression helper ─────────────────────────────────────────────────

function compressImage(file: File, maxPx = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Metadata collection ──────────────────────────────────────────────────────

function collectMeta() {
  const ua = navigator.userAgent;
  let deviceType = "desktop";
  if (/Mobi|Android/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";
  return {
    platform: "web",
    appVersion: APP_VERSION,
    deviceType,
    country: Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/")[0] ?? undefined,
  };
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({
  label,
  hint,
  complete,
}: {
  label: string;
  hint?: string;
  complete?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-primary/70">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {complete && (
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

function FormProgress({
  categoryDone,
  messageDone,
}: {
  categoryDone: boolean;
  messageDone: boolean;
}) {
  const steps = [
    { label: "Topic", done: categoryDone },
    { label: "Message", done: messageDone },
    { label: "Send", done: categoryDone && messageDone },
  ] as const;

  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuenow={steps.filter(s => s.done).length}
      aria-valuemin={0}
      aria-valuemax={3}
      aria-label="Feedback form progress"
    >
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                step.done ? "bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "bg-white/20"
              )}
            />
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wide",
                step.done ? "text-primary/80" : "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-6 mb-3 transition-colors duration-300",
                steps[i + 1].done || step.done ? "bg-primary/40" : "bg-white/10"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CharCounter({ count }: { count: number }) {
  if (count === 0) return null;
  if (count > 4500) {
    return (
      <span className={cn("text-[10px] tabular-nums", count > 4800 ? "text-red-400" : "text-amber-400")}>
        {count} / 5000
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground tabular-nums">{count} chars</span>;
}

// ─── Category Chip ────────────────────────────────────────────────────────────

function CategoryChip({
  id, emoji, label, selected, onToggle,
}: { id: string; emoji: string; label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${label}${selected ? ", selected" : ""}`}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-full text-xs font-semibold border transition-all duration-200 select-none",
        selected
          ? "bg-primary/25 border-primary text-primary shadow-[0_0_14px_rgba(139,92,246,0.45)] scale-[1.02]"
          : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground active:scale-[0.98]"
      )}
    >
      <span className="text-sm leading-none" aria-hidden="true">{emoji}</span>
      <span>{label}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-violet-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)]"> {/* audit-ok: brand gradient accent on dark success card */}
          <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2} />
        </div>
      </div>

      <div className="space-y-1 mb-2">
        <p className="text-2xl font-bold text-foreground font-quicksand">Thank you ❤️</p>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Your feedback helps us improve AmyNest for families worldwide. We read every single message.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
        <Heart className="h-4 w-4 text-pink-400 fill-pink-400 shrink-0" /> {/* audit-ok: brand accent pink on dark card */}
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">10,000+ parents</span> are shaping AmyNest with you
        </p>
      </div>

      <button
        onClick={onReset}
        className="mt-8 text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
      >
        Send another message
      </button>
    </div>
  );
}

// ─── Submit button (shared inline + sticky) ───────────────────────────────────

function SubmitButton({
  isReady,
  submitting,
  onClick,
  label,
  className,
}: {
  isReady: boolean;
  submitting: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!isReady || submitting}
      onClick={onClick}
      aria-disabled={!isReady || submitting}
      className={cn(
        "w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200 relative overflow-hidden",
        isReady && !submitting
          ? "bg-gradient-to-r from-primary via-violet-500 to-pink-500 text-white shadow-[0_4px_32px_rgba(139,92,246,0.45)] hover:shadow-[0_4px_48px_rgba(139,92,246,0.6)] hover:scale-[1.01] active:scale-[0.99] animate-[pulse_2.5s_ease-in-out_infinite]"
          : "bg-white/5 border border-white/10 text-muted-foreground cursor-not-allowed",
        className
      )}
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          Sending your feedback…
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Heart className="h-4 w-4" />
          {label}
        </span>
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isBugReport = selectedCategories.includes("bug_report");
  const categoryDone = selectedCategories.length > 0;
  const messageDone = message.trim().length >= 10;
  const charCount = message.length;
  const isReady = categoryDone && messageDone;

  const activePrompt = useMemo(() => {
    if (selectedCategories.length > 0) {
      const primary = selectedCategories.find(id => CATEGORY_PROMPTS[id]);
      return primary ? CATEGORY_PROMPTS[primary] : GENERIC_PROMPTS[0];
    }
    return GENERIC_PROMPTS[promptIdx];
  }, [selectedCategories, promptIdx]);

  // Rotate generic prompts only when no category is selected
  useEffect(() => {
    if (selectedCategories.length > 0) return;
    const interval = setInterval(() => {
      setPromptIdx(i => (i + 1) % GENERIC_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedCategories.length]);

  // Auto-expand optional section for bug reports
  useEffect(() => {
    if (isBugReport) setOptionalOpen(true);
  }, [isBugReport]);

  const toggleCategory = useCallback((id: string) => {
    void hapticGameSuccess(false);
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }, []);

  const selectRating = useCallback((value: number) => {
    void hapticGameSuccess(false);
    setRating(prev => (prev === value ? null : value));
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setCompressing(true);
    setError(null);
    try {
      const dataUrl = await compressImage(file, 900, 0.75);
      setScreenshot(dataUrl);
      setScreenshotName(file.name);
      void hapticGameSuccess(true);
    } catch {
      setError("Could not process the image. Please try a different file.");
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!categoryDone) { setError("Please select at least one category."); return; }
    if (!messageDone) { setError("Please write at least 10 characters."); return; }
    setError(null);
    setSubmitting(true);
    const meta = collectMeta();
    try {
      const res = await authFetch("/api/user-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          message: message.trim(),
          rating: rating ?? undefined,
          screenshotUrl: screenshot ?? undefined,
          ...meta,
        }),
      });
      if (!res.ok) throw new Error("server_error");
      setSubmitted(true);
      void hapticGameSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [authFetch, selectedCategories, message, rating, screenshot, categoryDone, messageDone]);

  const handleReset = useCallback(() => {
    setSelectedCategories([]);
    setMessage("");
    setRating(null);
    setScreenshot(null);
    setScreenshotName(null);
    setError(null);
    setSubmitted(false);
    setShowMoreCategories(false);
    setOptionalOpen(false);
  }, []);

  const submitLabel = t("feedback_page.submit_btn", { defaultValue: "Send Feedback" });
  const submitHint = !categoryDone
    ? "Pick a topic to continue"
    : !messageDone
      ? "Write at least 10 characters"
      : null;

  const visibleCategories = showMoreCategories
    ? CATEGORIES
    : [...primaryCategories, ...moreCategories.filter(c => selectedCategories.includes(c.id))];

  const hiddenSelectedCount = moreCategories.filter(
    c => selectedCategories.includes(c.id) && !showMoreCategories
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-500/8 blur-3xl" /> {/* audit-ok: ambient glow decorative only */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full bg-violet-600/6 blur-3xl" /> {/* audit-ok: ambient glow decorative only */}
      </div>

      <div
        className={cn(
          "relative mx-auto max-w-2xl px-4",
          "pt-[max(2rem,env(safe-area-inset-top,0px))]",
          submitted ? "pb-8" : "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]"
        )}
      >
        {/* ── Back link ── */}
        <div className="mb-4">
          <Link href="/dashboard">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors min-h-[44px]"
              aria-label="Back to Dashboard"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] shrink-0"> {/* audit-ok: brand gradient icon container */}
              <MessageSquarePlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-quicksand text-foreground leading-tight">
                {t("feedback_page.title", { defaultValue: "Feedback & Suggestions" })}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/85 mt-0.5">
                {t("feedback_page.subtitle", { defaultValue: "Help us make AmyNest smarter for families ❤️" })}
              </p>
            </div>
          </div>

          {!submitted && <FormProgress categoryDone={categoryDone} messageDone={messageDone} />}
        </div>

        {submitted ? (
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden">
            <SuccessCard onReset={handleReset} />
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── 1. Categories ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <SectionHeader
                label={t("feedback_page.step_category", { defaultValue: "What's this about?" })}
                hint="(pick one or more)"
                complete={categoryDone}
              />
              <div className="flex flex-wrap gap-2">
                {visibleCategories.map(cat => (
                  <CategoryChip
                    key={cat.id}
                    {...cat}
                    selected={selectedCategories.includes(cat.id)}
                    onToggle={() => toggleCategory(cat.id)}
                  />
                ))}
                {!showMoreCategories && (
                  <button
                    type="button"
                    onClick={() => setShowMoreCategories(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-full text-xs font-semibold border border-dashed border-white/20 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    aria-expanded={showMoreCategories}
                  >
                    + More topics
                    {hiddenSelectedCount > 0 && (
                      <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                        {hiddenSelectedCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
              {showMoreCategories && (
                <button
                  type="button"
                  onClick={() => setShowMoreCategories(false)}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Show fewer topics
                </button>
              )}
            </section>

            {/* ── 2. Message ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SectionHeader
                  label={t("feedback_page.step_message", { defaultValue: "Your Message" })}
                  complete={messageDone}
                />
                <CharCounter count={charCount} />
              </div>

              <div className="flex items-start gap-2 bg-primary/8 rounded-2xl px-3 py-2.5 border border-primary/15 min-h-[40px]">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <p
                  key={activePrompt}
                  className="text-xs text-primary/85 italic leading-relaxed animate-in fade-in duration-300"
                >
                  {activePrompt}
                </p>
              </div>

              <textarea
                className={cn(
                  "w-full min-h-[140px] resize-none rounded-2xl bg-white/5 border text-sm text-foreground",
                  "placeholder:text-muted-foreground/60 px-4 py-3 leading-relaxed",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
                  "border-white/10 transition-colors"
                )}
                placeholder="Tell us what would make AmyNest better for your family…"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 5000))}
                maxLength={5000}
                aria-label="Your feedback message"
                aria-describedby="feedback-char-hint"
              />
              <p id="feedback-char-hint" className="sr-only">
                Minimum 10 characters required. Maximum 5000 characters.
              </p>
            </section>

            {/* ── 3. Optional: rating + screenshot ── */}
            <section
              className={cn(
                "rounded-3xl bg-white/[0.03] border backdrop-blur-xl overflow-hidden transition-colors duration-300",
                isBugReport && !screenshot
                  ? "border-amber-400/35 shadow-[0_0_24px_rgba(251,191,36,0.12)]"
                  : "border-white/10"
              )}
            >
              <button
                type="button"
                onClick={() => setOptionalOpen(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left min-h-[44px]"
                aria-expanded={optionalOpen}
                aria-controls="feedback-optional-panel"
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                    Optional extras
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Rate your experience & attach a screenshot
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    optionalOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {optionalOpen && (
                <div id="feedback-optional-panel" className="px-5 pb-5 space-y-5 border-t border-white/8 pt-4">
                  {/* Rating */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                      {t("feedback_page.step_rating", { defaultValue: "How's your experience been?" })}
                    </span>
                    <div className="flex gap-2 sm:gap-3" role="group" aria-label="Experience rating">
                      {RATINGS.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => selectRating(r.value)}
                          aria-pressed={rating === r.value}
                          aria-label={`${r.label} — ${r.value} of 4`}
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 min-h-[72px] py-3 rounded-2xl border text-center transition-all duration-200",
                            rating === r.value
                              ? "bg-primary/15 border-primary shadow-[0_0_16px_rgba(139,92,246,0.3)] scale-105"
                              : "bg-white/5 border-white/10 hover:border-white/25 active:scale-[0.98]"
                          )}
                        >
                          <span className="text-2xl leading-none" aria-hidden="true">{r.emoji}</span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              rating === r.value ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Screenshot */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                        {t("feedback_page.step_screenshot", { defaultValue: "Attach a Screenshot" })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isBugReport ? "recommended for bugs" : "optional"}
                      </span>
                    </div>

                    {isBugReport && !screenshot && (
                      <p className="text-xs text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2 leading-relaxed">
                        A screenshot helps us reproduce and fix bugs much faster.
                      </p>
                    )}

                    {screenshot ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                        <img src={screenshot} alt="Screenshot preview" className="w-full max-h-48 object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => { setScreenshot(null); setScreenshotName(null); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Remove screenshot"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                        {screenshotName && (
                          <p className="absolute bottom-2 left-3 text-[10px] text-white/60 truncate max-w-[80%]">
                            {screenshotName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={compressing}
                        onClick={() => fileRef.current?.click()}
                        className={cn(
                          "w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed min-h-[44px]",
                          "border-white/15 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200",
                          isBugReport && "border-amber-400/30 hover:border-amber-400/50 hover:bg-amber-400/5",
                          compressing && "opacity-60 cursor-wait"
                        )}
                        aria-label="Upload screenshot"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">
                          {compressing ? "Compressing…" : "Tap to upload a screenshot"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP · auto-compressed</span>
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              )}
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            {/* Desktop / tablet inline submit */}
            <div className="hidden sm:block space-y-3">
              <SubmitButton
                isReady={isReady}
                submitting={submitting}
                onClick={handleSubmit}
                label={submitLabel}
              />
              <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
                Your feedback is stored securely and reviewed by the AmyNest team.
                Device info (platform, version) is included automatically to help us reproduce issues.
              </p>
            </div>

            {/* Mobile privacy note (submit is sticky) */}
            <p className="sm:hidden text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
              Your feedback is stored securely. Device info is included to help us reproduce issues.
            </p>
          </div>
        )}
      </div>

      {/* Sticky submit bar (mobile-first; also shown on small screens) */}
      {!submitted && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-background/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="max-w-2xl mx-auto space-y-2">
            {submitHint && (
              <p className="text-center text-[10px] text-muted-foreground">{submitHint}</p>
            )}
            <SubmitButton
              isReady={isReady}
              submitting={submitting}
              onClick={handleSubmit}
              label={submitLabel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
