import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gauge, Loader2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import {
  getLessonText,
  partIndexForLesson,
  type Lesson,
  type LessonSeries,
} from "@/lib/audio-lessons";
import { useLessonPlayback } from "@/hooks/use-lesson-playback";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { warmLessonParagraphStatic } from "@/lib/lesson-audio-playback";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { createAudioIdentity } from "@/lib/lesson-audio-identity";
import { prefetchLessonParagraph } from "@/lib/amy-voice-pipeline-optimizer";
import { loadResume, saveResume } from "@/lib/audio-lessons-storage";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { isMobileStaticAudioDevice } from "@/lib/static-audio-edge";

import { AMY_TTS_MODEL_ID, AMY_TTS_VOICE_ID } from "@workspace/static-audio/browser";

const VOICE_AMY_EN = AMY_TTS_VOICE_ID;
const MODEL_EN = AMY_TTS_MODEL_ID;

export type PlayerSheetPlayback = {
  playing: boolean;
  loading: boolean;
  play: () => void;
  pause: () => void;
};

type PlayerSheetProps = {
  lesson: Lesson;
  series: LessonSeries | null;
  autoPlay?: boolean;
  visible?: boolean;
  onMinimize: () => void;
  onLessonComplete?: (lessonId: string) => void;
  onPlaybackChange?: (state: PlayerSheetPlayback) => void;
};

export function PlayerSheet({
  lesson,
  series,
  autoPlay,
  visible = true,
  onMinimize,
  onLessonComplete,
  onPlaybackChange,
}: PlayerSheetProps) {
  const lang = "en";
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [rate, setRate] = useState<number>(1);
  const playStartedFromPointerRef = useRef(false);

  const text = useMemo(() => getLessonText(lesson, lang), [lesson, lang]);
  const paragraphs = text.paragraphs.length > 0 ? text.paragraphs : [""];

  const initialParagraphIdx = useMemo(() => {
    const saved = loadResume()[lesson.id] ?? 0;
    if (saved > 0 && saved < paragraphs.length) return saved;
    return 0;
  }, [lesson.id, paragraphs.length]);

  const {
    paragraphIdx,
    jumpToParagraph,
    intent,
    playbackError,
    speaking,
    loading,
    error,
    play,
    pause,
    primeSpeakGesture,
  } = useLessonPlayback({
    paragraphs,
    lessonId: lesson.id,
    voiceId: VOICE_AMY_EN,
    modelId: MODEL_EN,
    playbackRate: rate,
    autoPlay,
    initialParagraphIdx,
    onLessonComplete,
  });

  const playing = intent === "playing";

  // Warm current + next paragraph blobs as soon as the sheet is visible so Play
  // never has to await fetch (mobile WebView gesture + Range/206 constraints).
  useEffect(() => {
    if (!visible) return;
    for (const idx of [paragraphIdx, paragraphIdx + 1]) {
      const txt = paragraphs[idx];
      if (!txt?.trim()) continue;
      try {
        warmLessonParagraphStatic(createAudioIdentity(lesson.id, idx, txt));
      } catch {
        /* identity validation */
      }
    }
  }, [visible, lesson.id, paragraphIdx, paragraphs]);

  useEffect(() => {
    onPlaybackChange?.({ playing, loading: loading && !speaking, play, pause });
  }, [playing, loading, speaking, play, pause, onPlaybackChange]);

  const handleMinimize = useCallback(() => {
    onMinimize();
  }, [onMinimize]);

  useEffect(() => {
    const r = loadResume();
    r[lesson.id] = paragraphIdx;
    saveResume(r);
  }, [lesson.id, paragraphIdx]);

  const seriesPart = series ? partIndexForLesson(series, lesson.id) : -1;

  if (!visible) {
    return <div aria-hidden style={{ display: "none" }} data-testid="audio-player-sheet-hidden" />;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(8,5,25,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={handleMinimize}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="audio-player-sheet"
        style={{
          width: "100%",
          maxWidth: 560,
          background: "linear-gradient(180deg, #1a1040 0%, #0f0c29 100%)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "16px 20px calc(12px + var(--app-bottom-clearance, 48px))",
          color: "#fff",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28 }}>{lesson.emoji}</div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "Quicksand, sans-serif",
                }}
              >
                {text.title}
              </h3>
              <div style={{ fontSize: 11, color: "#a99fd9" }}>
                {series && seriesPart >= 0
                  ? t("pages.audio_lessons.series_part", {
                      series: series.title.en,
                      current: seriesPart + 1,
                      total: series.lessonIds.length,
                    })
                  : `${lesson.expert} · ${lesson.durationMin} ${t("pages.audio_lessons.min_2")}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            aria-label={t("pages.audio_lessons.close")}
            style={{
              color: "hsl(var(--brand-violet-300))",
              background: "rgba(167,139,250,0.15)",
              borderRadius: 999,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              touchAction: "manipulation",
              position: "relative",
              zIndex: 2,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {(error || playbackError) && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "hsl(var(--brand-red-200))",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error
              ? "Couldn't load Amy's voice right now. Please try again in a moment — you can still read the lesson below."
              : playbackError === "playback_blocked_tap_again"
                ? "Tap Play again to start Amy's voice."
                : "Amy's voice couldn't play this paragraph. Tap Play to try again."}
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {paragraphs.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= paragraphIdx ? "hsl(var(--brand-violet-500))" : "rgba(139,92,246,0.2)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <div
          style={{
            background: "rgba(139,92,246,0.10)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            fontSize: 15,
            lineHeight: 1.6,
            color: "#fff",
          }}
        >
          {paragraphs[paragraphIdx]}
        </div>

        <details style={{ marginBottom: 14, color: "#c7c0e8" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: "hsl(var(--brand-violet-300))",
            }}
          >
            Show full transcript
          </summary>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {paragraphs.map((p, i) => (
              <button
                key={i}
                onClick={() => jumpToParagraph(i)}
                style={{
                  textAlign: "left",
                  color: i === paragraphIdx ? "#fff" : "#c7c0e8",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1.55,
                  opacity: i === paragraphIdx ? 1 : 0.85,
                }}
              >
                <strong style={{ color: "#a99fd9", marginRight: 6 }}>{i + 1}.</strong>
                {p}
              </button>
            ))}
          </div>
        </details>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => paragraphIdx > 0 && jumpToParagraph(paragraphIdx - 1)}
            disabled={paragraphIdx === 0}
            aria-label={t("pages.audio_lessons.previous")}
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 999,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: paragraphIdx === 0 ? "default" : "pointer",
              opacity: paragraphIdx === 0 ? 0.4 : 1,
            }}
          >
            <SkipBack size={18} />
          </button>

          <button
            onPointerDown={() => {
              const txt = paragraphs[paragraphIdx];
              if (!txt) return;
              recordTtsUserGesture();
              primeSpeakGesture(txt);
              primeStaticAudioInUserGesture(txt, "default");
              const identity = createAudioIdentity(lesson.id, paragraphIdx, txt);
              warmLessonParagraphStatic(identity);
              prefetchLessonParagraph(identity, authFetch, VOICE_AMY_EN, MODEL_EN);
              // Android WebView: start play inside pointerdown so audio.play()
              // keeps the user-gesture token (click is often too late after await).
              if (
                !playing &&
                (isAndroidAmyNestAudioClient() || isMobileStaticAudioDevice())
              ) {
                playStartedFromPointerRef.current = true;
                play();
              }
            }}
            onClick={() => {
              if (playStartedFromPointerRef.current) {
                playStartedFromPointerRef.current = false;
                return;
              }
              if (playing) pause();
              else play();
            }}
            aria-label={playing ? "Pause" : "Play"}
            style={{
              color: "#fff",
              background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
              border: "none",
              borderRadius: 999,
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(139,92,246,0.5)",
            }}
          >
            {!playing ? (
              <Play size={26} style={{ marginLeft: 3 }} />
            ) : loading && !speaking ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Pause size={26} />
            )}
          </button>

          <button
            onClick={() =>
              paragraphIdx + 1 < paragraphs.length && jumpToParagraph(paragraphIdx + 1)
            }
            disabled={paragraphIdx === paragraphs.length - 1}
            aria-label={t("pages.audio_lessons.next")}
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 999,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: paragraphIdx === paragraphs.length - 1 ? "default" : "pointer",
              opacity: paragraphIdx === paragraphs.length - 1 ? 0.4 : 1,
            }}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Gauge size={14} color="#a99fd9" />
          <span style={{ fontSize: 12, color: "#a99fd9", marginRight: 6 }}>Speed</span>
          {[0.85, 1, 1.15, 1.3, 1.5].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid " + (rate === r ? "transparent" : "rgba(139,92,246,0.3)"),
                background:
                  rate === r
                    ? "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))"
                    : "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
