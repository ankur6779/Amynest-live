/**
 * Amy Astro Intelligence — full-screen Ask Amy overlay (not a route).
 */

import { useEffect, useId, useRef, useState } from "react";
import type {
  BirthSkyConversation,
  BirthSkyMessage,
  ConversationMachineState,
} from "../../domain/models/conversation";
import { Button } from "@/components/ui/button";
import { AmyAstroCosmicAmbient } from "../../components/cosmic-ambient";
import { AmyAstroEmblem } from "../../components/amy-astro-emblem";
import { AMY_ASTRO_DISCLAIMER, AMY_ASTRO_PRODUCT_SHORT } from "../../lib/branding";
import { useFocusTrap } from "../../lib/focus-trap";
import { nextSuggestionBatch } from "../../lib/reply-memory";
import {
  buildSessionContinuity,
  lookingAtCopy,
  loadGuideMemory,
} from "../../lib/conversation-intelligence";
import { cn } from "@/lib/utils";
import {
  isBirthSkyLivingV1Enabled,
  livingAskAmySheetTitle,
  livingBirthSkyProductShort,
  livingLoadingCopy,
} from "@/lib/birth-sky/living-room";
import "@/components/birth-sky/birth-sky-living-deep.css";
import "../../design/amy-astro.css";

type Props = {
  open: boolean;
  reducedMotion: boolean;
  offline: boolean;
  state: ConversationMachineState;
  conversations: BirthSkyConversation[];
  activeConversationId: string | null;
  messages: BirthSkyMessage[];
  streamingText: string;
  errorMessage: string | null;
  composer: string;
  onComposerChange: (v: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  childName?: string;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string | null;
  moonPhaseLabel?: string;
  /** Continuity line from local cosmic memory. */
  continuityHint?: string | null;
  profileId?: string;
};

const SUGGESTION_POOL = [
  "Where do you already sense their quiet strength?",
  "How does curiosity seem to wake up for them?",
  "What emotional weather should I notice this week?",
  "How can I meet them with softer parenting?",
  "What helps them feel belonging after a big day?",
  "Where does play teach them trust?",
  "What small stage could celebrate effort tonight?",
  "How do they enter a new room — watch first, or leap?",
] as const;

export function BirthSkyConversationSheet({
  open,
  reducedMotion,
  offline,
  state,
  conversations,
  activeConversationId,
  messages,
  streamingText,
  errorMessage,
  composer,
  onComposerChange,
  onSend,
  onRetry,
  onCancel,
  onClose,
  onSelectConversation,
  onNewConversation,
  childName,
  sunSign,
  moonSign,
  risingSign,
  moonPhaseLabel,
  continuityHint,
  profileId,
}: Props) {
  const living = isBirthSkyLivingV1Enabled();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [lookingAt, setLookingAt] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    [...SUGGESTION_POOL].slice(0, 4),
  );

  useFocusTrap(sheetRef, open, onClose);

  useEffect(() => {
    if (!open) {
      setLookingAt(false);
      setKeyboardInset(0);
      return;
    }
    if (profileId) {
      const guide = loadGuideMemory(profileId);
      const avoided = new Set(guide.lastThemes.map((t) => t.toLowerCase()));
      const pool = SUGGESTION_POOL.filter((s) => {
        const low = s.toLowerCase();
        if (avoided.has("school") && low.includes("school")) return false;
        if (avoided.has("sleep and rest") && low.includes("bed")) return false;
        if (avoided.has("curiosity") && low.includes("curiosity")) return false;
        return true;
      });
      setSuggestions(nextSuggestionBatch(profileId, pool.length >= 4 ? pool : SUGGESTION_POOL));
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, profileId]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages, streamingText, state]);

  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 40 ? inset : 0);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [open]);

  if (!open) return null;

  const writing = state === "creating" || state === "streaming";
  const showStream = state === "streaming" && streamingText.length > 0;
  const empty = messages.length === 0 && !writing && !errorMessage && !lookingAt;
  const sessionContinuity =
    profileId && childName ? buildSessionContinuity(profileId, childName) : null;
  const continuity = sessionContinuity ?? continuityHint ?? null;

  const beginSend = () => {
    if (writing || offline || composer.trim().length === 0 || lookingAt) return;
    // Local guide turns (follow-ups) skip the long “looking at” ritual.
    const q = composer.trim();
    const likelyLocal =
      /^(hi|hello|hey|thanks|ok)\b/i.test(q) ||
      q.length < 18 ||
      /\b(worried|tell me more|what should i do)\b/i.test(q);
    if (likelyLocal) {
      onSend();
      return;
    }
    setLookingAt(true);
    window.setTimeout(() => {
      setLookingAt(false);
      onSend();
    }, living || reducedMotion ? 200 : 1400);
  };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        living ? "birth-sky-living-shell bs-living-deep" : "amy-astro-root",
      )}
      data-testid="birth-sky-ai-sheet"
      data-bs-living={living ? "1" : undefined}
      tabIndex={-1}
      style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
    >
      {living ? (
        <div className="birth-sky-living-shell-ambient" aria-hidden="true" />
      ) : (
        <AmyAstroCosmicAmbient
          reducedMotion={reducedMotion}
          showMeteor={false}
          intensity="shell"
        />
      )}

      <header className="relative z-10 flex items-center gap-3 border-b border-[hsl(42_50%_60%/0.18)] px-4 py-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <AmyAstroEmblem size={living ? 40 : 48} reducedMotion={reducedMotion} />
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className={cn(
              "text-xl font-semibold",
              living ? "bs-living-deep-title" : "amy-astro-display amy-astro-gold-text",
            )}
          >
            {living ? livingAskAmySheetTitle() : "Ask Amy About Their Sky"}
          </h2>
          <p className="line-clamp-2 text-[11px] leading-snug text-[hsl(40_20%_96%/0.55)]">
            {living ? livingBirthSkyProductShort() : AMY_ASTRO_PRODUCT_SHORT}
            {childName ? ` · ${childName}` : ""} · parent-only
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-premium amy-astro-btn-secondary min-h-12 shrink-0 rounded-xl px-3"
          onClick={onClose}
          data-testid="birth-sky-ai-close"
        >
          Close
        </Button>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
        <aside
          className="flex max-h-16 shrink-0 gap-2 overflow-x-auto sm:max-h-none"
          aria-label="Conversation list"
        >
          <Button
            type="button"
            variant="secondary"
            className="amy-astro-btn-premium amy-astro-btn-secondary min-h-10 shrink-0 rounded-full text-xs"
            onClick={onNewConversation}
            data-testid="birth-sky-ai-new"
          >
            Begin a New Reflection
          </Button>
          {conversations.length === 0 ? (
            <p
              className="flex items-center text-xs text-[hsl(40_20%_96%/0.45)]"
              data-testid="birth-sky-ai-list-empty"
            >
              No past chats yet
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.conversationId}
                type="button"
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-3 text-xs",
                  activeConversationId === c.conversationId
                    ? "bg-[hsl(42_40%_30%/0.45)] text-[hsl(42_80%_85%)]"
                    : "bg-white/[0.04] text-[hsl(40_20%_96%/0.65)]",
                )}
                onClick={() => onSelectConversation(c.conversationId)}
                data-testid={`birth-sky-ai-conv-${c.conversationId}`}
              >
                {new Date(c.createdAt).toLocaleDateString()}
              </button>
            ))
          )}
        </aside>

        <div
          ref={listRef}
          className="amy-astro-glass amy-astro-scroll-fade min-h-0 flex-1 space-y-3 overflow-y-auto rounded-3xl p-4"
          role="log"
          aria-relevant="additions"
          data-testid="birth-sky-ai-messages"
        >
          {empty ? (
            <div data-testid="birth-sky-ai-empty" className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <AmyAstroEmblem size={88} reducedMotion={reducedMotion} />
                <p className="amy-astro-display mt-4 text-lg text-[hsl(42_70%_78%)]">
                  {childName
                    ? `${childName}'s sky is ready when you are`
                    : "Their sky is ready when you are"}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[hsl(40_20%_96%/0.65)]">
                  Ask about strengths, learning, emotions, or parenting — reflective counsel,
                  never fate. {AMY_ASTRO_DISCLAIMER}
                </p>
                {continuity ? (
                  <p
                    className="mt-3 max-w-sm text-xs leading-relaxed text-[hsl(42_55%_78%/0.85)]"
                    data-testid="amy-astro-session-continuity"
                  >
                    {continuity}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  sunSign ? `Sun · ${sunSign}` : null,
                  moonSign
                    ? `Moon · ${moonSign}${moonPhaseLabel ? ` · ${moonPhaseLabel}` : ""}`
                    : null,
                  risingSign ? `Rising · ${risingSign}` : null,
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <span
                      key={String(chip)}
                      className={cn(
                        "rounded-full border border-[hsl(42_60%_65%/0.35)] bg-[hsl(42_40%_25%/0.3)] px-3 py-1 text-[10px] font-semibold text-[hsl(42_80%_82%)]",
                        writing && !reducedMotion && "amy-astro-pulse-glow",
                      )}
                    >
                      {chip}
                    </span>
                  ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="min-h-11 rounded-full border border-[hsl(42_50%_60%/0.3)] bg-black/25 px-3 py-2 text-left text-xs text-[hsl(40_20%_96%/0.85)]"
                    onClick={() => onComposerChange(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {(writing || showStream) && (sunSign || moonSign) ? (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Chart references"
              data-testid="amy-astro-ai-planet-chips"
            >
              {sunSign ? (
                <span className="rounded-full border border-[hsl(42_50%_60%/0.3)] px-2.5 py-1 text-[10px] text-[hsl(42_80%_80%)]">
                  Sun · {sunSign}
                </span>
              ) : null}
              {moonSign ? (
                <span className="rounded-full border border-[hsl(220_40%_60%/0.3)] px-2.5 py-1 text-[10px] text-[hsl(220_70%_80%)]">
                  Moon · {moonSign}
                </span>
              ) : null}
              {risingSign ? (
                <span className="rounded-full border border-[hsl(275_40%_60%/0.3)] px-2.5 py-1 text-[10px] text-[hsl(275_70%_80%)]">
                  Rising · {risingSign}
                </span>
              ) : null}
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.messageId}
                  className={cn(
                "amy-astro-msg rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-8 bg-gradient-to-br from-[hsl(275_40%_28%/0.7)] to-[hsl(230_40%_18%/0.7)]"
                  : "mr-6 border border-[hsl(42_50%_60%/0.2)] bg-black/30",
              )}
              data-testid={`birth-sky-ai-msg-${m.messageId}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(42_60%_70%/0.65)]">
                {m.role === "user" ? "You" : "Amy"}
              </p>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap leading-relaxed",
                  m.role === "assistant"
                    ? "text-[15px] text-[hsl(40_22%_96%/0.92)]"
                    : "text-[hsl(40_20%_96%/0.92)]",
                )}
              >
                {m.body}
              </p>
            </div>
          ))}

          {showStream ? (
            <div className="mr-6 rounded-2xl border border-[hsl(42_50%_60%/0.2)] bg-black/30 px-3.5 py-2.5 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(42_60%_70%/0.65)]">
                Amy
              </p>
              <p className="amy-astro-chat-cursor mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">
                {streamingText}
              </p>
            </div>
          ) : null}

          {lookingAt ? (
            <div
              className="amy-astro-glass rounded-2xl p-4"
              data-testid="amy-astro-ai-looking-at"
              aria-live="polite"
            >
              <div className="mb-3 flex justify-center">
                <AmyAstroEmblem size={56} reducedMotion={reducedMotion} interactive={false} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_60%_70%/0.75)]">
                {living ? livingLoadingCopy() : "Reading the Stars…"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sunSign ? (
                  <span className="rounded-full border border-[hsl(42_50%_60%/0.35)] px-3 py-1.5 text-xs text-[hsl(42_85%_80%)]">
                    Sun · {sunSign}
                  </span>
                ) : null}
                {moonSign ? (
                  <span className="rounded-full border border-[hsl(220_40%_60%/0.35)] px-3 py-1.5 text-xs text-[hsl(220_70%_82%)]">
                    Moon · {moonSign}
                    {moonPhaseLabel ? ` · ${moonPhaseLabel}` : ""}
                  </span>
                ) : null}
                {risingSign ? (
                  <span className="rounded-full border border-[hsl(275_40%_60%/0.35)] px-3 py-1.5 text-xs text-[hsl(275_70%_82%)]">
                    Rising · {risingSign}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[hsl(42_60%_75%/0.85)]">
                {lookingAtCopy({
                  chart: {
                    childName: childName ?? "your child",
                    sunSign: sunSign ?? "",
                    moonSign: moonSign ?? "",
                    risingSign: risingSign ?? null,
                    moonPhaseLabel: moonPhaseLabel ?? "",
                    daySky: !risingSign,
                  },
                  question: composer,
                })}
              </p>
            </div>
          ) : null}

          {writing && !showStream ? (
            <div
              className="amy-astro-typing flex items-center gap-2 text-sm text-[hsl(42_60%_75%/0.8)]"
              data-testid="birth-sky-ai-typing"
            >
              <span className="amy-astro-typing-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              Amy is reflecting…
            </div>
          ) : null}

          {state === "failed" || errorMessage ? (
            <div
              role="alert"
              className="space-y-2 rounded-2xl border border-red-400/30 px-3 py-2 text-sm"
              data-testid="birth-sky-ai-error"
            >
              <p>{errorMessage ?? "Something went wrong. You can try again."}</p>
              <Button
                type="button"
                className="min-h-10 rounded-xl"
                onClick={onRetry}
                data-testid="birth-sky-ai-retry"
              >
                Retry
              </Button>
            </div>
          ) : null}

          {offline ? (
            <p
              role="status"
              className="text-sm text-[hsl(40_20%_96%/0.7)]"
              data-testid="birth-sky-ai-offline"
            >
              You’re offline. Past messages stay readable; new chat needs a connection.
            </p>
          ) : null}
        </div>

        <div
          ref={liveRef}
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-testid="birth-sky-ai-live"
        >
          {state === "completed"
            ? "Message from Amy"
            : writing
              ? "Amy is writing"
              : state === "moderated"
                ? "Safe reply from Amy"
                : ""}
        </div>

        <div className="space-y-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_50%_70%/0.65)]">
            Ask Amy…
            <textarea
              ref={inputRef}
              className="amy-astro-glass amy-astro-composer mt-2 min-h-20 w-full rounded-2xl p-3 text-sm text-[hsl(40_20%_96%)] placeholder:text-[hsl(40_20%_96%/0.35)]"
              value={composer}
              onChange={(e) => onComposerChange(e.target.value)}
              disabled={writing || offline || lookingAt}
              maxLength={2000}
              placeholder="Strengths, learning, emotions, or how to meet them tonight…"
              data-testid="birth-sky-ai-composer"
            />
          </label>
          <div className="flex gap-2">
            {writing ? (
              <Button
                type="button"
                variant="secondary"
                className="amy-astro-btn-premium amy-astro-btn-secondary min-h-11 flex-1 rounded-xl"
                onClick={onCancel}
                data-testid="birth-sky-ai-cancel"
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                className="amy-astro-btn-premium min-h-11 flex-1 rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] font-semibold"
                disabled={offline || composer.trim().length === 0 || lookingAt}
                onClick={beginSend}
                data-testid="birth-sky-ai-send"
              >
                {lookingAt
                  ? living
                    ? livingLoadingCopy()
                    : "Reading the Stars…"
                  : living
                    ? livingAskAmySheetTitle()
                    : "Ask Amy"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
