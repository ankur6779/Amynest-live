import { useMemo, useRef, useState } from "react";
import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { KeyboardSafeShell } from "@/components/chat-platform";
import { Textarea } from "@/components/ui/textarea";
import { useAutoGrowTextarea } from "@/hooks/use-auto-grow-textarea";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAbacusTranslation } from "@/hooks/use-abacus-translation";
import {
  inferTutorAbacusVisual,
  resolveAbacusLanguage,
  type LevelId,
} from "@workspace/abacus";

export type AbacusTutorVoice = {
  prime: (text: string) => void;
  stop: () => void;
  speak: (text: string) => void | Promise<void>;
  isActiveFor: (text: string) => boolean;
};

export function AbacusTutorKeyboardPanel({
  childId,
  level,
  ageYears,
  voice,
}: {
  childId: number;
  level: LevelId;
  ageYears: number;
  voice: AbacusTutorVoice;
}) {
  const { t, i18n } = useAbacusTranslation();
  void ageYears;
  const authFetch = useAuthFetch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useAutoGrowTextarea(textareaRef, question, { maxHeightPx: 120, minHeightPx: 52 });

  const tutorVisual = useMemo(
    () => (reply ? inferTutorAbacusVisual(reply, level) : null),
    [reply, level],
  );

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setErr(null);
    setReply("");
    try {
      const res = await authFetch("/api/abacus/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          level,
          language: resolveAbacusLanguage(i18n.language),
          question: question.trim(),
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody?.error ?? "ai_failed");
      }
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<{ reply?: string; error?: string }>(res, authFetch);
      if (!data?.reply) throw new Error(data?.error ?? "ai_failed");
      setReply(data.reply);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ai_failed");
    } finally {
      setLoading(false);
    }
  };

  const composer = (
    <div className="space-y-2" data-chat-answer="true">
      <Textarea
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("abacus.tutor_placeholder")}
        rows={1}
        className="min-h-[52px] max-h-[120px] w-full resize-none overflow-y-auto rounded-lg border-2 border-border bg-background px-3 py-2 text-sm"
        style={{ height: 52 }}
        data-testid="abacus-tutor-question"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void ask();
          }
        }}
      />
      <button
        type="button"
        onClick={() => void ask()}
        disabled={loading || !question.trim()}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-primary disabled:opacity-40"
        data-testid="abacus-tutor-ask"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? t("abacus.thinking") : t("abacus.ask_amy")}
      </button>
    </div>
  );

  return (
    <KeyboardSafeShell
      surface="abacus-tutor"
      layout="embedded"
      scrollDeps={[question, reply, loading, err, tutorVisual]}
      footer={composer}
      contentClassName="space-y-3 px-1 py-2"
      footerClassName="px-1 pt-2 pb-safe bg-card/95 backdrop-blur-sm border-t border-border/50"
    >
      <p className="text-xs text-muted-foreground">{t("abacus.tutor_intro")}</p>
      {err && <p className="text-center text-xs text-foreground">⚠️ {err}</p>}
      {reply && (
        <div className="space-y-2 rounded-xl bg-muted p-3" data-testid="abacus-tutor-reply">
          {tutorVisual && (
            <div className="space-y-1.5" data-testid="abacus-tutor-visual">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("abacus.tutor_visual_caption")}: {tutorVisual.caption}
              </p>
            </div>
          )}
          <p className="text-sm leading-relaxed">{reply}</p>
          <button
            type="button"
            onPointerDown={() => voice.prime(reply)}
            onClick={() => (voice.isActiveFor(reply) ? voice.stop() : void voice.speak(reply))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground"
          >
            {voice.isActiveFor(reply) ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            {voice.isActiveFor(reply) ? t("abacus.stop_voice") : t("abacus.amy_voice")}
          </button>
        </div>
      )}
    </KeyboardSafeShell>
  );
}
