import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Layout } from "@/components/layout";
import { Loader2, Check, Sparkles, SendHorizonal } from "lucide-react";

const FEATURE_KEY = "kids_control_center";

type FeedbackKind = "interested" | "not_interested";

type ServerFeedback = {
  feedback: FeedbackKind | null;
  comment: string | null;
};

const HIGHLIGHTS = [
  { icon: "🛡️", text: "Safe child-friendly UI" },
  { icon: "🔄", text: "Sync with parent routines" },
  { icon: "🎁", text: "Reward-based engagement" },
  { icon: "🚫", text: "No distractions" },
];

const FEATURES = [
  { icon: "⏱", title: "Screen Time Guidance", desc: "Healthy limits, gentle nudges" },
  { icon: "📋", title: "Routine Control",      desc: "Daily flow, on autopilot" },
  { icon: "🎯", title: "Focus Mode",           desc: "Quiet time for study & sleep" },
  { icon: "📊", title: "Activity Tracking",    desc: "See what your child enjoys" },
  { icon: "🔒", title: "Parent Lock",          desc: "PIN-protected controls" },
];

export default function KidsControlCenterPage() {
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
          <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-violet-400/30 dark:bg-violet-500/25 blur-3xl" />
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-pink-400/25 dark:bg-pink-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-72 w-[40rem] rounded-full bg-amber-300/20 dark:bg-amber-400/15 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-2 sm:pt-4 pb-6 sm:pb-10">
          {/* HEADER */}
          <header className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/15 to-pink-500/15 border border-violet-300/40 dark:border-violet-500/30 text-xs font-bold text-violet-700 dark:text-violet-300 mb-3">
              <Sparkles className="h-3 w-3" /> Coming Soon 🚀
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-violet-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              👶 Kids Control Center
            </h1>
          </header>

          {/* HERO */}
          <section className="rounded-3xl p-5 sm:p-7 mb-5 backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_8px_40px_-12px_rgba(124,58,237,0.35)]">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
              Smart Control for Parents, Safe Experience for Kids
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
              Guide your child's routine, learning, and screen time with ease.
            </p>
          </section>

          {/* AMYNEST KIDS */}
          <section className="rounded-3xl p-5 sm:p-7 mb-5 backdrop-blur-xl bg-gradient-to-br from-violet-500/10 via-white/60 to-pink-500/10 dark:from-violet-500/15 dark:via-white/5 dark:to-pink-500/15 border border-violet-200/60 dark:border-violet-500/20 shadow-[0_8px_40px_-12px_rgba(236,72,153,0.25)]">
            <h3 className="text-lg sm:text-xl font-extrabold text-foreground mb-2">
              👶 AmyNest Kids{" "}
              <span className="text-sm font-semibold text-muted-foreground">(Child Experience)</span>
            </h3>
            <p className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed mb-4">
              AmyNest Kids is a safe and guided environment for children that syncs with the parent app.
              Kids see only their routines, activities, and rewards, while parents manage everything in the background.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.text}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white/70 dark:bg-white/8 border border-white/60 dark:border-white/10"
                >
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground/90">{h.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURE PREVIEW */}
          <section className="mb-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              Feature Preview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl p-4 backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 hover:border-violet-300/60 dark:hover:border-violet-500/40 hover:shadow-[0_8px_30px_-10px_rgba(124,58,237,0.4)] transition-all"
                  data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{f.icon}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-[15px] leading-tight">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="rounded-3xl p-5 sm:p-6 mb-5 backdrop-blur-xl bg-gradient-to-br from-amber-100/50 to-rose-100/50 dark:from-amber-500/10 dark:to-rose-500/10 border border-amber-200/60 dark:border-amber-500/20">
            <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed text-center">
              Kids Control Center helps parents guide children in a balanced way by focusing on
              <span className="font-bold text-violet-700 dark:text-violet-300"> habits, routines, and learning </span>
              instead of strict restrictions.
            </p>
          </section>

          {/* FEEDBACK */}
          <section className="rounded-3xl p-5 sm:p-7 backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_8px_40px_-12px_rgba(124,58,237,0.30)]">
            <h3 className="text-lg sm:text-xl font-extrabold text-foreground text-center mb-1">
              Would you like this feature?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5">
              Select an option, add your thoughts, then hit Submit.
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
                    label="👍 Interested"
                    selected={pendingFeedback === "interested"}
                    onClick={() => setPendingFeedback("interested")}
                  />
                  <SelectionButton
                    kind="not_interested"
                    label="👎 Not Interested"
                    selected={pendingFeedback === "not_interested"}
                    onClick={() => setPendingFeedback("not_interested")}
                  />
                </div>

                {/* Comment box */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 px-1">
                    Tell us what you want in this feature (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                    placeholder="e.g. I'd love a daily reading streak, kid-friendly themes, reward points…"
                    rows={3}
                    className="w-full rounded-2xl px-4 py-3 text-sm bg-white/80 dark:bg-white/5 border border-border focus:border-violet-400 dark:focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/30 transition-all text-foreground placeholder:text-muted-foreground/70 resize-none"
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
                      ? "bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 text-white shadow-[0_8px_30px_-8px_rgba(168,85,247,0.7)] hover:shadow-[0_12px_36px_-8px_rgba(168,85,247,0.85)] hover:scale-[1.01]"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </button>

                {/* Success message */}
                {submitted && (
                  <div
                    className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-gradient-to-r from-violet-500/15 to-pink-500/15 border border-violet-300/40 dark:border-violet-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    data-testid="text-feedback-thanks"
                  >
                    <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                      {savedFeedback === "interested"
                        ? "🎉 Thanks! We'll keep you posted when this launches."
                        : "💛 Got it — we appreciate the honest feedback!"}
                    </span>
                  </div>
                )}

                {/* Already submitted indicator */}
                {savedFeedback && !submitted && !isDirty && (
                  <p className="text-center text-xs text-muted-foreground">
                    ✓ Your feedback has been saved.{" "}
                    <button
                      type="button"
                      className="underline hover:text-foreground transition-colors"
                      onClick={() => setPendingFeedback(pendingFeedback === "interested" ? "not_interested" : "interested")}
                    >
                      Change it
                    </button>
                  </p>
                )}
              </div>
            )}
          </section>

          <p className="text-center text-xs text-muted-foreground mt-6 pb-4">
            Built with care by the AmyNest team · Coming soon
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
            ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-[0_6px_24px_-8px_rgba(168,85,247,0.6)]"
            : "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-[0_6px_24px_-8px_rgba(100,116,139,0.5)]"
          : "bg-white/80 dark:bg-white/5 border border-border hover:border-violet-300 dark:hover:border-violet-500/40 text-foreground"
        }`}
    >
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}
