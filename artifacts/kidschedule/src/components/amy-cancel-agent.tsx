import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, MoreVertical, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AmyIcon } from "@/components/amy-icon";
import { FF_CANCEL_ANNUAL_SAVE } from "@/lib/subscription-feature-flags";
import { trackSubscriptionEvent } from "@/lib/subscription-analytics";
import { cn } from "@/lib/utils";

export type CancelReasonId =
  | "too_expensive"
  | "not_using"
  | "missing_features"
  | "technical_issues"
  | "child_grown"
  | "other";

type ChatMessage = {
  id: string;
  role: "amy" | "user";
  text: string;
};

type Step =
  | "greeting"
  | "ask_reason"
  | "retention"
  | "ask_feedback"
  | "final";

type BillingMode = "razorpay" | "store";

type Props = {
  open: boolean;
  onClose: () => void;
  billingMode: BillingMode;
  periodEnd: string | null;
  annualMonthlyEquivalent?: string | null;
  storeTarget?: "apple" | "google" | "both";
  onSwitchToAnnual: () => void;
  onConfirmCancel: () => void;
  onOpenStore: (store: "apple" | "google") => void;
  cancelling: boolean;
};

const REASON_IDS: CancelReasonId[] = [
  "too_expensive",
  "not_using",
  "missing_features",
  "technical_issues",
  "child_grown",
  "other",
];

function AmyBubble({ text, showBadge }: { text: string; showBadge?: boolean }) {
  return (
    <div className="flex items-start gap-2.5" role="article" aria-label={`Amy: ${text}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground">
        <Sparkles className="h-4 w-4 text-background" aria-hidden />
      </div>
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-2xl rounded-tl-sm bg-muted/80 px-4 py-3 text-sm leading-relaxed text-foreground">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
        {showBadge ? (
          <p className="pl-1 text-[10px] text-muted-foreground">(Amy AI)</p>
        ) : null}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end" role="article" aria-label={`You: ${text}`}>
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

export function AmyCancelAgent({
  open,
  onClose,
  billingMode,
  periodEnd,
  annualMonthlyEquivalent,
  storeTarget = "both",
  onSwitchToAnnual,
  onConfirmCancel,
  onOpenStore,
  cancelling,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("greeting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedReason, setSelectedReason] = useState<CancelReasonId | null>(null);
  const [feedback, setFeedback] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return `msg-${idRef.current}`;
  }, []);

  const pushAmy = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: nextId(), role: "amy", text }]);
    },
    [nextId],
  );

  const pushUser = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    },
    [nextId],
  );

  const reset = useCallback(() => {
    idRef.current = 0;
    setStep("greeting");
    setMessages([]);
    setSelectedReason(null);
    setFeedback("");
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    trackSubscriptionEvent({ event: "cancel_agent_opened", source: "pricing" });
    const greeting = [
      t("pages.pricing.amy_cancel_agent.greeting"),
      t("pages.pricing.amy_cancel_agent.ask_reason"),
      t("pages.pricing.amy_cancel_agent.feedback_helps"),
    ];
    setMessages(
      greeting.map((text, i) => ({
        id: `init-${i}`,
        role: "amy" as const,
        text,
      })),
    );
    setStep("ask_reason");
    if (FF_CANCEL_ANNUAL_SAVE) {
      trackSubscriptionEvent({ event: "cancel_save_offer_shown", plan: "yearly" });
    }
  }, [open, reset, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step]);

  const retentionForReason = useCallback(
    (reason: CancelReasonId): string => {
      const priceHint = annualMonthlyEquivalent ?? t("pages.pricing.amy_cancel_agent.lower_monthly_rate");
      switch (reason) {
        case "too_expensive":
          return t("pages.pricing.amy_cancel_agent.retention_too_expensive", { priceHint });
        case "not_using":
          return t("pages.pricing.amy_cancel_agent.retention_not_using");
        case "missing_features":
          return t("pages.pricing.amy_cancel_agent.retention_missing_features");
        case "technical_issues":
          return t("pages.pricing.amy_cancel_agent.retention_technical_issues");
        case "child_grown":
          return t("pages.pricing.amy_cancel_agent.retention_child_grown");
        default:
          return periodEnd
            ? t("pages.pricing.cancel_body_with_date", { date: periodEnd })
            : t("pages.pricing.cancel_body");
      }
    },
    [annualMonthlyEquivalent, periodEnd, t],
  );

  const onSelectReason = (reason: CancelReasonId) => {
    const label = t(`pages.pricing.amy_cancel_agent.reasons.${reason}`);
    setSelectedReason(reason);
    pushUser(label);
    trackSubscriptionEvent({
      event: "cancel_agent_reason_selected",
      source: "pricing",
      extra: { reason },
    });
    setTimeout(() => {
      pushAmy(retentionForReason(reason));
      setStep("retention");
    }, 350);
  };

  const onKeepPlan = () => {
    trackSubscriptionEvent({ event: "cancel_agent_retained", source: "pricing" });
    onClose();
  };

  const onSwitchAnnual = () => {
    trackSubscriptionEvent({ event: "cancel_save_offer_accepted", plan: "yearly" });
    trackSubscriptionEvent({ event: "annual_upgrade", source: "cancel_save" });
    trackSubscriptionEvent({ event: "cancel_agent_annual_accepted", source: "pricing" });
    onClose();
    onSwitchToAnnual();
  };

  const onStillCancel = () => {
    trackSubscriptionEvent({ event: "cancel_continue" });
    pushUser(t("pages.pricing.amy_cancel_agent.still_want_cancel"));
    setTimeout(() => {
      pushAmy(t("pages.pricing.amy_cancel_agent.before_you_go"));
      setStep("ask_feedback");
    }, 350);
  };

  const onSubmitFeedback = () => {
    const trimmed = feedback.trim();
    if (trimmed) {
      pushUser(trimmed);
      trackSubscriptionEvent({
        event: "cancel_agent_feedback_submitted",
        source: "pricing",
        extra: { reason: selectedReason ?? "unknown", feedback: trimmed.slice(0, 500) },
      });
    } else {
      trackSubscriptionEvent({
        event: "cancel_agent_feedback_skipped",
        source: "pricing",
        extra: { reason: selectedReason ?? "unknown" },
      });
    }
    setTimeout(() => {
      if (billingMode === "store") {
        pushAmy(t("pages.pricing.amy_cancel_agent.store_redirect_intro"));
      } else {
        pushAmy(
          periodEnd
            ? t("pages.pricing.amy_cancel_agent.razorpay_confirm_with_date", { date: periodEnd })
            : t("pages.pricing.amy_cancel_agent.razorpay_confirm"),
        );
      }
      setStep("final");
    }, trimmed ? 350 : 0);
  };

  const onOpenStoreAndClose = (store: "apple" | "google") => {
    trackSubscriptionEvent({
      event: "cancel_agent_store_redirect",
      source: "pricing",
      extra: { store },
    });
    trackSubscriptionEvent({ event: "cancel_confirmed" });
    onClose();
    onOpenStore(store);
  };

  const onConfirmRazorpayCancel = () => {
    trackSubscriptionEvent({ event: "cancel_confirmed" });
    onConfirmCancel();
  };

  if (!open) return null;

  const showAnnualSave = FF_CANCEL_ANNUAL_SAVE && selectedReason === "too_expensive";
  const lastAmyIndex = messages.map((m) => m.role).lastIndexOf("amy");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex h-[min(640px,92dvh)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-labelledby="amy-cancel-agent-title"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <AmyIcon size={32} ring />
          <h2 id="amy-cancel-agent-title" className="flex-1 text-base font-bold text-foreground">
            {t("pages.pricing.amy_cancel_agent.title")}
          </h2>
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            aria-label={t("pages.pricing.amy_cancel_agent.close")}
            onClick={onClose}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            aria-label={t("pages.pricing.amy_cancel_agent.close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((msg, index) =>
            msg.role === "amy" ? (
              <AmyBubble
                key={msg.id}
                text={msg.text}
                showBadge={index === lastAmyIndex && step !== "ask_reason"}
              />
            ) : (
              <UserBubble key={msg.id} text={msg.text} />
            ),
          )}
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-3">
          {step === "ask_reason" && (
            <div className="flex flex-wrap gap-2">
              {REASON_IDS.map((reason) => (
                <Button
                  key={reason}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-3 py-1.5 text-xs font-medium"
                  onClick={() => onSelectReason(reason)}
                >
                  {t(`pages.pricing.amy_cancel_agent.reasons.${reason}`)}
                </Button>
              ))}
            </div>
          )}

          {step === "retention" && (
            <div className="flex flex-col gap-2">
              <Button type="button" className="w-full font-semibold" onClick={onKeepPlan}>
                {t("pages.pricing.keep_premium")}
              </Button>
              {showAnnualSave ? (
                <Button type="button" variant="secondary" className="w-full" onClick={onSwitchAnnual}>
                  {t("pages.pricing.amy_cancel_agent.switch_to_growth_year")}
                </Button>
              ) : null}
              <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={onStillCancel}>
                {t("pages.pricing.amy_cancel_agent.continue_cancellation")}
              </Button>
            </div>
          )}

          {step === "ask_feedback" && (
            <div className="space-y-2">
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t("pages.pricing.amy_cancel_agent.feedback_placeholder")}
                  className="min-h-[44px] max-h-[100px] flex-1 resize-none border-none bg-transparent p-2 text-sm shadow-none focus-visible:ring-0"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSubmitFeedback();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={onSubmitFeedback}
                  aria-label={t("pages.pricing.amy_cancel_agent.send")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={onSubmitFeedback}
              >
                {t("pages.pricing.amy_cancel_agent.skip_feedback")}
              </Button>
            </div>
          )}

          {step === "final" && billingMode === "store" && (
            <div className="flex flex-col gap-2">
              {(storeTarget === "apple" || storeTarget === "both") && (
                <Button
                  type="button"
                  className="w-full font-semibold"
                  disabled={cancelling}
                  onClick={() => onOpenStoreAndClose("apple")}
                  data-testid="amy-agent-cancel-app-store"
                >
                  {t("pages.pricing.cancel_in_app_store")}
                </Button>
              )}
              {(storeTarget === "google" || storeTarget === "both") && (
                <Button
                  type="button"
                  variant={storeTarget === "both" ? "outline" : "default"}
                  className="w-full font-semibold"
                  disabled={cancelling}
                  onClick={() => onOpenStoreAndClose("google")}
                  data-testid="amy-agent-cancel-google-play"
                >
                  {t("pages.pricing.cancel_in_google_play")}
                </Button>
              )}
            </div>
          )}

          {step === "final" && billingMode === "razorpay" && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onKeepPlan}
              >
                {t("pages.pricing.keep_premium")}
              </Button>
              <Button
                type="button"
                className={cn("w-full bg-destructive text-white hover:bg-destructive/90")}
                disabled={cancelling}
                onClick={onConfirmRazorpayCancel}
                data-testid="amy-agent-confirm-cancel"
              >
                {cancelling
                  ? t("pricing.cancelling")
                  : t("pages.pricing.yes_cancel")}
              </Button>
            </div>
          )}
        </div>

        <p className="shrink-0 pb-3 text-center text-[10px] text-muted-foreground">
          {t("pages.pricing.amy_cancel_agent.powered_by")}
        </p>
      </div>
    </div>
  );
}
