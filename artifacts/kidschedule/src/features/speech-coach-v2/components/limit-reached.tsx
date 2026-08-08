import { Clock } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { DAILY_LIMIT_MESSAGE } from "@workspace/speech-coach-v2";
import { isSpeechCoachLivingV1Enabled, livingSpeechLimitTitle } from "@/lib/speech-coach/living-room";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";

export function SpeechCoachV2LimitReached(props: {
  message?: string;
  isTrial?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}) {
  const { message = DAILY_LIMIT_MESSAGE, isTrial, onUpgrade, onDismiss } = props;
  const living = isSpeechCoachLivingV1Enabled();

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      data-testid="speech-coach-v2-limit-reached"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950">
        <Clock className="h-8 w-8 text-sky-600 dark:text-sky-300" />
      </div>
      <h2 className="text-xl font-bold">
        {living ? livingSpeechLimitTitle() : "Amazing work today! 🌟"}
      </h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{message}</p>
      {isTrial && onUpgrade ? (
        <div className="mt-6 max-w-sm space-y-3">
          <p className="text-sm font-medium text-foreground">
            {living
              ? "Amy can keep supporting speech practice whenever you're ready."
              : "Your child loved practicing with Amy!"}
          </p>
          {!living ? (
            <p className="text-sm text-muted-foreground">
              Unlock 10 minutes of live speech coaching every day with AmyNest Premium.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{PREMIUM_VOICE.invitation}</p>
          )}
          <Button className="w-full min-h-12" onClick={onUpgrade}>
            {living ? PREMIUM_VOICE.continueCta : "Upgrade Now"}
          </Button>
          <Button variant="ghost" className="w-full min-h-12" onClick={onDismiss}>
            {living ? "Not now" : "Maybe Later"}
          </Button>
          {living ? (
            <AmyNestLeaveContinuity
              continueHref="/speech-coach"
              continueLabel="Back to today's help"
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <AppLink href={living ? "/speech-coach" : "/speech-coach-v2"}>
            <span className="text-sm font-semibold text-primary">
              {living ? "Back to today's help" : "Back to Speech Coach"}
            </span>
          </AppLink>
          {living ? (
            <AmyNestLeaveContinuity
              continueHref="/speech-coach"
              continueLabel="Back to today's help"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
