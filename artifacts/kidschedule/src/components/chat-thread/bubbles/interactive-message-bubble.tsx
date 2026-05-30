import { useMemo, useState } from "react";
import { AmyMessageBubble } from "./amy-message-bubble";
import { Button } from "@/components/ui/button";
import { CHAT_PROMPT_ATTR } from "@/lib/chat-platform";
import { cn } from "@/lib/utils";
import { Check, Loader2, X } from "lucide-react";
import type { InteractionEvent, InteractionSpec, InteractionState, ThreadTheme } from "../types";

const ONBOARDING_CHIP =
  "px-4 py-2.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all";
const ONBOARDING_CHIP_STYLE = {
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  border: "1px solid rgba(168,85,247,0.30)",
} as const;

function from24h(v: string): string {
  const [h, m] = (v || "07:00").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

function InteractionBody({
  messageId,
  interaction,
  state,
  theme,
  onInteraction,
}: {
  messageId: string;
  interaction: InteractionSpec;
  state: InteractionState;
  theme: ThreadTheme;
  onInteraction: (event: InteractionEvent) => void;
}) {
  const resolved = state.status === "resolved";
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [dateDraft, setDateDraft] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState(interaction.type === "time-quick" ? interaction.defaultValue ?? "07:00" : "07:00");

  const chipClass = (active: boolean) =>
    theme === "onboarding"
      ? cn(ONBOARDING_CHIP, active && "opacity-100")
      : cn(
          "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:border-primary/40",
        );

  const chipStyle = theme === "onboarding" && !resolved ? ONBOARDING_CHIP_STYLE : undefined;

  if (interaction.type === "single-select") {
    const layout = interaction.layout ?? "row";
    const containerClass =
      layout === "grid"
        ? "grid grid-cols-2 gap-2"
        : layout === "stack"
          ? "flex flex-col gap-2"
          : "flex flex-wrap gap-2";
    return (
      <div className={containerClass}>
        {interaction.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={resolved}
            className={chipClass(false)}
            style={chipStyle}
            onClick={() =>
              onInteraction({
                messageId,
                type: interaction.type,
                optionId: opt.id,
                optionValue: opt.value,
                optionLabel: opt.label,
              })
            }
          >
            {opt.emoji ? `${opt.emoji} ` : ""}
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (interaction.type === "multi-select") {
    const selected = resolved ? (state.selectedIds ?? []) : multiDraft;
    const toggle = (id: string) => {
      if (resolved) return;
      setMultiDraft((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (interaction.max != null && prev.length >= interaction.max) return prev;
        return [...prev, id];
      });
    };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {interaction.options.map((opt) => {
            const on = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={resolved}
                className={chipClass(on)}
                style={
                  theme === "onboarding"
                    ? {
                        background: on
                          ? "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))"
                          : ONBOARDING_CHIP_STYLE.background,
                        color: "#fff",
                        border: on ? "1px solid transparent" : ONBOARDING_CHIP_STYLE.border,
                      }
                    : undefined
                }
                onClick={() => toggle(opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {!resolved ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={chipClass(false)}
              style={theme === "onboarding" ? { background: "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))", color: "#fff" } : undefined}
              disabled={selected.length < (interaction.min ?? 0)}
              onClick={() =>
                onInteraction({
                  messageId,
                  type: interaction.type,
                  selectedIds: selected,
                })
              }
            >
              {interaction.confirmLabel ?? "Continue"}
            </button>
            {interaction.skipLabel ? (
              <button
                type="button"
                className="text-xs self-center text-muted-foreground"
                onClick={() =>
                  onInteraction({ messageId, type: interaction.type, selectedIds: [] })
                }
              >
                {interaction.skipLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (interaction.type === "date") {
    return (
      <div className="space-y-3">
        <input
          type="date"
          max={interaction.max}
          value={dateDraft}
          disabled={resolved}
          onChange={(e) => setDateDraft(e.target.value)}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
        />
        {!resolved ? (
          <button
            type="button"
            disabled={!dateDraft}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            onClick={() =>
              onInteraction({ messageId, type: interaction.type, dateValue: dateDraft })
            }
          >
            {interaction.confirmLabel ?? "Confirm"}
          </button>
        ) : null}
      </div>
    );
  }

  if (interaction.type === "time-quick") {
    if (showCustomTime && !resolved) {
      return (
        <div className="space-y-3">
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCustomTime(false)}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                onInteraction({
                  messageId,
                  type: interaction.type,
                  timeValue: from24h(customTime),
                })
              }
            >
              {interaction.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {interaction.options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={resolved}
            className={chipClass(false)}
            style={chipStyle}
            onClick={() =>
              onInteraction({ messageId, type: interaction.type, timeValue: opt })
            }
          >
            {opt}
          </button>
        ))}
        {interaction.allowCustom !== false ? (
          <button
            type="button"
            disabled={resolved}
            className={chipClass(false)}
            style={chipStyle}
            onClick={() => setShowCustomTime(true)}
          >
            ⏰ Other time…
          </button>
        ) : null}
      </div>
    );
  }

  if (interaction.type === "mcq") {
    const picked = state.status === "resolved" ? state.pickedIndex : undefined;
    const correctIdx =
      typeof interaction.correctIndex === "number" ? interaction.correctIndex : null;
    return (
      <div className="space-y-2">
        {interaction.content ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{interaction.content}</p>
        ) : null}
        {interaction.examples && interaction.examples.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {interaction.examples.map((ex) => (
              <span
                key={ex}
                className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground"
              >
                {ex}
              </span>
            ))}
          </div>
        ) : null}
        {interaction.question ? (
          <div className="mt-2 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-bold text-foreground">{interaction.question}</p>
            <div className="grid gap-1.5">
              {interaction.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = correctIdx === i;
                const showVerdict = picked !== undefined;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={showVerdict}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !showVerdict
                        ? "border-border bg-card hover:border-primary/40 hover:bg-primary/10"
                        : isPicked && isCorrect
                          ? "border-primary bg-muted text-foreground"
                          : isPicked && !isCorrect
                            ? "border-primary bg-muted text-foreground"
                            : isCorrect
                              ? "border-border bg-muted text-foreground"
                              : "border-border opacity-70",
                    )}
                    onClick={() =>
                      onInteraction({ messageId, type: interaction.type, pickedIndex: i, optionValue: opt })
                    }
                  >
                    <span className="flex-1">{opt}</span>
                    {showVerdict && isPicked && isCorrect ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                    {showVerdict && isPicked && !isCorrect ? (
                      <X className="h-4 w-4 shrink-0 text-destructive" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {picked !== undefined && correctIdx !== null ? (
              <p className="mt-1 text-xs font-semibold">
                {picked === correctIdx ? "🎉 Right on!" : `The answer is: ${interaction.options[correctIdx]}`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (interaction.type === "actions") {
    return (
      <div className="flex w-full flex-wrap gap-2">
        {interaction.buttons.map((btn) => (
          <Button
            key={btn.id}
            type="button"
            variant={btn.variant ?? "default"}
            disabled={resolved}
            className="rounded-full"
            onClick={() => onInteraction({ messageId, type: interaction.type, actionId: btn.id })}
          >
            {btn.icon}
            {btn.label}
          </Button>
        ))}
      </div>
    );
  }

  if (interaction.type === "country-detect") {
    if (interaction.isLocating) {
      return (
        <div className="flex flex-col items-center gap-3 py-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground">Detecting your location…</p>
        </div>
      );
    }
    if (interaction.needsPermission) {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            Allow location to detect your country automatically.
          </p>
          <Button
            disabled={interaction.locationRequesting}
            className="w-full rounded-2xl py-6"
            onClick={() => interaction.onAllowLocation?.()}
          >
            {interaction.locationRequesting ? "Detecting…" : "Allow location"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => interaction.onPickManually?.()}>
            Select country manually
          </Button>
        </div>
      );
    }
    if (interaction.detected) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="text-4xl leading-none">{interaction.detected.flag}</span>
            <div>
              {interaction.detected.sourceLabel ? (
                <p className="text-xs text-muted-foreground">{interaction.detected.sourceLabel}</p>
              ) : null}
              <p className="text-lg font-bold text-foreground">{interaction.detected.name}</p>
            </div>
          </div>
          <Button className="w-full rounded-2xl py-6" onClick={() => interaction.onConfirmDetected?.()}>
            Yes, that&apos;s correct
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => interaction.onChangeCountry?.()}>
            Choose a different country
          </Button>
        </div>
      );
    }
    return null;
  }

  if (interaction.type === "topic-grid") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {interaction.topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            disabled={resolved}
            className="rounded-xl border border-border bg-card p-2.5 text-left text-sm font-medium text-foreground/80 transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40"
            onClick={() =>
              onInteraction({
                messageId,
                type: interaction.type,
                optionId: topic.id,
                optionValue: topic.label,
              })
            }
          >
            {topic.label}
          </button>
        ))}
      </div>
    );
  }

  if (interaction.type === "start-session") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="max-w-sm space-y-2">
          <h2 className="font-quicksand text-xl font-bold text-foreground">{interaction.title}</h2>
          <p className="text-sm text-muted-foreground">{interaction.body}</p>
        </div>
        <Button
          size="lg"
          className="rounded-full px-8"
          disabled={resolved}
          onClick={() => onInteraction({ messageId, type: interaction.type, actionId: "start" })}
        >
          {interaction.buttonLabel}
        </Button>
      </div>
    );
  }

  return null;
}

export function InteractiveMessageBubble({
  messageId,
  amyText,
  interaction,
  state,
  theme = "app",
  promptId,
  onInteraction,
}: {
  messageId: string;
  amyText?: string;
  interaction: InteractionSpec;
  state: InteractionState;
  theme?: ThreadTheme;
  promptId?: string | null;
  onInteraction: (event: InteractionEvent) => void;
}) {
  const promptProps =
    promptId != null && promptId !== "" ? { [CHAT_PROMPT_ATTR]: promptId } : undefined;

  const body = useMemo(
    () => (
      <InteractionBody
        messageId={messageId}
        interaction={interaction}
        state={state}
        theme={theme}
        onInteraction={onInteraction}
      />
    ),
    [interaction, messageId, onInteraction, state, theme],
  );

  if (amyText) {
    return (
      <div className="space-y-2" {...promptProps}>
        <AmyMessageBubble text={amyText} theme={theme} />
        <div className="pl-10">{body}</div>
      </div>
    );
  }

  return (
    <div {...promptProps} className="interactive-message-bubble">
      {body}
    </div>
  );
}
