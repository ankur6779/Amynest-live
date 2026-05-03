import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Layout } from "@/components/layout";
import { Loader2, Check, Sparkles, SendHorizonal } from "lucide-react";

const FEATURE_KEY = "kids_control_center";

type FeedbackKind = "interested" | "not_interested";

type ServerFeedback = {
  feedback: FeedbackKind | null;
  comment: string | null;
};

const HIGHLIGHT_KEYS = [
  { icon: "🛡️", key: "highlight_safe_ui" },
  { icon: "🔄", key: "highlight_sync" },
  { icon: "🎁", key: "highlight_reward" },
  { icon: "🚫", key: "highlight_no_distractions" },
] as const;

const FEATURE_KEYS = [
  { icon: "⏱", titleKey: "feature_screen_time_title", descKey: "feature_screen_time_desc" },
  { icon: "📋", titleKey: "feature_routine_title",     descKey: "feature_routine_desc" },
  { icon: "🎯", titleKey: "feature_focus_title",       descKey: "feature_focus_desc" },
  { icon: "📊", titleKey: "feature_activity_title",    descKey: "feature_activity_desc" },
  { icon: "🔒", titleKey: "feature_lock_title",        descKey: "feature_lock_desc" },
] as const;

export default function KidsControlCenterPage() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // What user has selected but NOT yet submitted
  const [pendingFeedback, setPendingFeedback] = useState<FeedbackKind | null>(null);
  // What is saved on the server
  const [savedFeedback, setSavedFeedback] = useState<FeedbackKind | null>(null);

  const [comment, setComment] = useState("");
  const [savedComment, setSavedComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authFetch(`/api/feature-feedback?feature=${FEATURE_KEY}`);
        if (!alive) return;
        if (res.ok) {
          const data: ServerFeedback = await res.json();
          if (data.feedback) {
            setSavedFeedback(data.feedback);
            setPendingFeedback(data.feedback);
          }
          if (data.comment) {
            setComment(data.comment);
            setSavedComment(data.comment);
          }
        }
      } catch { /* non-fatal */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [authFetch]);

  const handleSubmit = async () => {
    if (!pendingFeedback || submitting) return;
    setSubmitting(true);
    setSubmitted(false);
    try {
      const res = await authFetch("/api/feature-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: FEATURE_KEY,
          feedback: pendingFeedback,
          comment: comment.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSavedFeedback(pendingFeedback);
        setSavedComment(comment.trim());
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3500);
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const isDirty =
    pendingFeedback !== null &&
    (pendingFeedback !== savedFeedback || comment.trim() !== savedComment.trim());

  const canSubmit = pendingFeedback !== null && !submitting;

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary blur-3xl" />
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full bg-primary blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-2 sm:pt-4 pb-6 sm:pb-10">
          {/* HEADER */}
          <header className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-xs font-bold text-foreground mb-3">
              <Sparkles className="h-3 w-3" /> {t("screens.kids_control_center.coming_soon_badge")}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-card bg-clip-text text-transparent">
              {t("screens.kids_control_center.title")}
            </h1>
          </header>

          {/* HERO */}
          <section className="rounded-3xl p-5 sm:p-7 mb-5 backdrop-blur-xl bg-card border border-border shadow-[0_8px_40px_-12px_rgba(124,58,237,0.35)]">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
              {t("screens.kids_control_center.hero_title")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              {t("screens.kids_control_center.hero_sub")}
            </p>
          </section>

          {/* AMYNEST KIDS */}
          <section className="rounded-3xl p-5 sm:p-7 mb-5 backdrop-blur-xl bg-card via-white/60 border border-border shadow-[0_8px_40px_-12px_rgba(236,72,153,0.25)]">
            <h3 className="text-lg sm:text-xl font-extrabold text-foreground mb-2">
              {t("screens.kids_control_center.kids_section_title")}{""}
              <span className="text-sm font-semibold text-muted-foreground">{t("screens.kids_control_center.kids_section_subtitle")}</span>
            </h3>
            <p className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed mb-4">
              {t("screens.kids_control_center.kids_section_body")}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {HIGHLIGHT_KEYS.map((h) => (
                <div
                  key={h.key}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-card border border-border"
                >
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground/90">{t(`screens.kids_control_center.${h.key}`)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURE PREVIEW */}
          <section className="mb-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              {t("screens.kids_control_center.feature_preview_label")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURE_KEYS.map((f) => (
                <div
                  key={f.titleKey}
                  className="group rounded-2xl p-4 backdrop-blur-xl bg-card border border-border hover:border-border hover:shadow-[0_8px_30px_-10px_rgba(124,58,237,0.4)] transition-all"
                  data-testid={`feature-${f.titleKey}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{f.icon}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-[15px] leading-tight">{t(`screens.kids_control_center.${f.titleKey}`)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t(`screens.kids_control_center.${f.descKey}`)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="rounded-3xl p-5 sm:p-6 mb-5 backdrop-blur-xl bg-card border border-border">
            <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed text-center">
              {t("screens.kids_control_center.description_part1")}
              <span className="font-bold text-foreground"> {t("screens.kids_control_center.description_emphasis")} </span>
              {t("screens.kids_control_center.description_part2")}
            </p>
          </section>

          {/* FEEDBACK */}
          <section className="rounded-3xl p-5 sm:p-7 backdrop-blur-xl bg-card border border-border shadow-[0_8px_40px_-12px_rgba(124,58,237,0.30)]">
            <h3 className="text-lg sm:text-xl font-extrabold text-foreground text-center mb-1">
              {t("screens.kids_control_center.feedback_question")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5">
              {t("screens.kids_control_center.feedback_help")}
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Feedback option buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <SelectionButton
                    kind="interested"
                    label={t("screens.kids_control_center.interested")}
                    selected={pendingFeedback === "interested"}
                    onClick={() => setPendingFeedback("interested")}
                  />
                  <SelectionButton
                    kind="not_interested"
                    label={t("screens.kids_control_center.not_interested")}
                    selected={pendingFeedback === "not_interested"}
                    onClick={() => setPendingFeedback("not_interested")}
                  />
                </div>

                {/* Comment box */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 px-1">
                    {t("screens.kids_control_center.comment_label")}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                    placeholder={t("screens.kids_control_center.comment_placeholder")}
                    rows={3}
                    className="w-full rounded-2xl px-4 py-3 text-sm bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground/70 resize-none"
                    data-testid="input-feedback-comment"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-muted-foreground/60">{comment.length}/1000</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="button-submit-feedback"
                  className={`relative w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 font-bold text-base transition-all active:scale-[0.97]
                    ${canSubmit
                      ? "bg-card text-primary-foreground shadow-[0_8px_30px_-8px_rgba(168,85,247,0.7)] hover:shadow-[0_12px_36px_-8px_rgba(168,85,247,0.85)] hover:scale-[1.01]"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("screens.kids_control_center.submitting")}
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="h-4 w-4" />
                      {t("screens.kids_control_center.submit")}
                    </>
                  )}
                </button>

                {/* Success message */}
                {submitted && (
                  <div
                    className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-card border border-border animate-in fade-in slide-in-from-bottom-2 duration-300"
                    data-testid="text-feedback-thanks"
                  >
                    <Check className="h-4 w-4 text-foreground shrink-0" />
                    <span className="text-sm font-bold text-foreground">
                      {savedFeedback === "interested"
                        ? t("screens.kids_control_center.thanks_interested")
                        : t("screens.kids_control_center.thanks_not_interested")}
                    </span>
                  </div>
                )}

                {/* Already submitted indicator */}
                {savedFeedback && !submitted && !isDirty && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("screens.kids_control_center.saved_prefix")}{""}
                    <button
                      type="button"
                      className="underline hover:text-foreground transition-colors"
                      onClick={() => setPendingFeedback(pendingFeedback === "interested" ? "not_interested" : "interested")}
                    >
                      {t("screens.kids_control_center.change_it")}
                    </button>
                  </p>
                )}
              </div>
            )}
          </section>

          <p className="text-center text-xs text-muted-foreground mt-6 pb-4">
            {t("screens.kids_control_center.footer")}
          </p>
        </div>
      </div>
    </Layout>
  );
}

function SelectionButton({
  kind, label, selected, onClick,
}: {
  kind: FeedbackKind;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const isInterested = kind === "interested";

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`button-select-${kind}`}
      className={`relative flex items-center justify-center gap-2 rounded-2xl px-4 py-4 font-bold text-sm transition-all active:scale-[0.97]
        ${selected
          ? isInterested
            ? "bg-card text-primary-foreground shadow-[0_6px_24px_-8px_rgba(168,85,247,0.6)]"
            : "bg-gradient-to-br from-muted to-muted text-primary-foreground shadow-[0_6px_24px_-8px_rgba(100,116,139,0.5)]"
          : "bg-card border border-border hover:border-border text-foreground"
        }`}
    >
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}
