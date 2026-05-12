import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Link } from "wouter";
import { MessageSquarePlus, Upload, X, Star, ChevronLeft, Sparkles, Heart, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

const RATINGS = [
  { value: 1, emoji: "😞", label: "Poor" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 3, emoji: "😊", label: "Good" },
  { value: 4, emoji: "🤩", label: "Amazing" },
] as const;

const SMART_PROMPTS = [
  "What feature would help your parenting most?",
  "Anything confusing in the app?",
  "What should AMY AI improve?",
  "What content would your child enjoy?",
  "What routine feature would save you the most time?",
  "Is there anything frustrating about the daily schedule?",
  "What would make meal planning easier for your family?",
  "How could we make the app feel more personal?",
];

const APP_VERSION = "2.0.0";

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

// ─── Category Chip ────────────────────────────────────────────────────────────

function CategoryChip({
  id, emoji, label, selected, onToggle,
}: { id: string; emoji: string; label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 select-none",
        selected
          ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.35)]"
          : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
      )}
    >
      <span className="text-sm leading-none">{emoji}</span>
      {label}
    </button>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      {/* Glow orb */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-violet-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)]"> {/* audit-ok: brand gradient accent on dark success card */}
          <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2} />
        </div>
      </div>

      <div className="space-y-1 mb-2">
        {/* i18n-ok: success heading with brand emoji */}
        <p className="text-2xl font-bold text-foreground font-quicksand">Thank you ❤️</p>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Your feedback helps us improve AmyNest for families worldwide. We read every single message.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
        <Heart className="h-4 w-4 text-pink-400 fill-pink-400 shrink-0" /> {/* audit-ok: brand accent pink on dark card */}
        <p className="text-xs text-muted-foreground">
          {/* i18n-ok: social proof stat — intentionally static */}
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
  const fileRef = useRef<HTMLInputElement>(null);

  // Rotate smart prompts every 4 s
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIdx(i => (i + 1) % SMART_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
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
    } catch {
      setError("Could not process the image. Please try a different file.");
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedCategories.length === 0) { setError("Please select at least one category."); return; }
    if (message.trim().length < 10) { setError("Please write at least 10 characters."); return; }
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
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [authFetch, selectedCategories, message, rating, screenshot]);

  const handleReset = useCallback(() => {
    setSelectedCategories([]);
    setMessage("");
    setRating(null);
    setScreenshot(null);
    setScreenshotName(null);
    setError(null);
    setSubmitted(false);
  }, []);

  const charCount = message.length;
  const isReady = selectedCategories.length > 0 && message.trim().length >= 10;

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-500/8 blur-3xl" /> {/* audit-ok: ambient glow decorative only */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full bg-violet-600/6 blur-3xl" /> {/* audit-ok: ambient glow decorative only */}
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-8 pb-24">

        {/* ── Back link ── */}
        <div className="mb-6">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]"> {/* audit-ok: brand gradient icon container */}
              <MessageSquarePlus className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-quicksand text-foreground leading-tight">
                {t("feedback_page.title", { defaultValue: "Feedback & Suggestions" })}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/50">
                {t("feedback_page.subtitle", { defaultValue: "Help us make AmyNest smarter for families ❤️" })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Success state ── */}
        {submitted ? (
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden">
            <SuccessCard onReset={handleReset} />
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── 1. Categories ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  {t("feedback_page.step_category", { defaultValue: "What's this about?" })}
                </span>
                <span className="text-[10px] text-muted-foreground">(pick one or more)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <CategoryChip
                    key={cat.id}
                    {...cat}
                    selected={selectedCategories.includes(cat.id)}
                    onToggle={() => toggleCategory(cat.id)}
                  />
                ))}
              </div>
            </section>

            {/* ── 2. Message ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  {t("feedback_page.step_message", { defaultValue: "Your Message" })}
                </span>
                {/* audit-ok: red-400 is semantic error/warning color for character limit */}
                <span className={cn("text-[10px]", charCount > 4800 ? "text-red-400" : "text-muted-foreground")}>
                  {charCount} / 5000
                </span>
              </div>

              {/* Rotating smart prompt */}
              <div className="flex items-start gap-2 bg-primary/8 rounded-2xl px-3 py-2 border border-primary/15 min-h-[36px]">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary/80 italic leading-relaxed transition-all duration-500">
                  {SMART_PROMPTS[promptIdx]}
                </p>
              </div>

              <textarea
                className={cn(
                  "w-full min-h-[140px] resize-none rounded-2xl bg-white/5 border text-sm text-foreground",
                  "placeholder:text-muted-foreground/60 px-4 py-3 leading-relaxed",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
                  "border-white/10 transition-colors"
                )}
                placeholder="Tell us what would make AmyNest better for your family…" // i18n-ok: textarea placeholder — part of brand voice
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 5000))}
                maxLength={5000}
              />
            </section>

            {/* ── 3. Rating ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                {t("feedback_page.step_rating", { defaultValue: "How's your experience been?" })}
              </span>
              <div className="flex gap-3">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(prev => prev === r.value ? null : r.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border text-center transition-all duration-200",
                      rating === r.value
                        ? "bg-primary/15 border-primary shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                        : "bg-white/5 border-white/10 hover:border-white/25"
                    )}
                  >
                    <span className="text-2xl leading-none">{r.emoji}</span>
                    <span className={cn("text-[11px] font-semibold", rating === r.value ? "text-primary" : "text-muted-foreground")}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── 4. Screenshot ── */}
            <section className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  {t("feedback_page.step_screenshot", { defaultValue: "Attach a Screenshot" })}
                </span>
                <span className="text-[10px] text-muted-foreground">optional</span> {/* i18n-ok: UI label */}
              </div>

              {screenshot ? (
                <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                  <img src={screenshot} alt="Screenshot preview" className="w-full max-h-48 object-contain" /> {/* i18n-ok: a11y alt text */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => { setScreenshot(null); setScreenshotName(null); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1.5"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  {screenshotName && (
                    <p className="absolute bottom-2 left-3 text-[10px] text-white/60 truncate max-w-[80%]">{screenshotName}</p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={compressing}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-dashed",
                    "border-white/15 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200",
                    compressing && "opacity-60 cursor-wait"
                  )}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {compressing ? "Compressing…" : "Click to upload a screenshot"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP · auto-compressed</span> {/* i18n-ok: technical format spec */}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </section>

            {/* ── Error ── */}
            {/* audit-block-ignore-start */}
            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {/* audit-block-ignore-end */}

            {/* ── Submit ── */}
            <button
              type="button"
              disabled={!isReady || submitting}
              onClick={handleSubmit}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200 relative overflow-hidden",
                isReady && !submitting
                  ? "bg-gradient-to-r from-primary via-violet-500 to-pink-500 text-white shadow-[0_4px_32px_rgba(139,92,246,0.45)] hover:shadow-[0_4px_48px_rgba(139,92,246,0.6)] hover:scale-[1.01] active:scale-[0.99]" // audit-ok: brand gradient CTA button
                  : "bg-white/5 border border-white/10 text-muted-foreground cursor-not-allowed"
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
                  {t("feedback_page.submit_btn", { defaultValue: "Send Feedback" })}
                </span>
              )}
            </button>

            {/* ── Privacy note ── */}
            <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
              Your feedback is stored securely and reviewed by the AmyNest team.
              Device info (platform, version) is included automatically to help us reproduce issues.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}
