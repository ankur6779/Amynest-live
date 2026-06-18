import { Clock } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { DAILY_LIMIT_MESSAGE } from "@workspace/speech-coach-v2";

export function SpeechCoachV2LimitReached(props: {
  message?: string;
  isTrial?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}) {
  const { message = DAILY_LIMIT_MESSAGE, isTrial, onUpgrade, onDismiss } = props;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950">
        <Clock className="h-8 w-8 text-sky-600 dark:text-sky-300" />
      </div>
      <h2 className="text-xl font-bold">Amazing work today! 🌟</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{message}</p>
      {isTrial && onUpgrade ? (
        <div className="mt-6 max-w-sm space-y-3">
          <p className="text-sm font-medium text-foreground">
            Your child loved practicing with Amy!
          </p>
          <p className="text-sm text-muted-foreground">
            Unlock 10 minutes of live speech coaching every day with AmyNest Premium.
          </p>
          <Button className="w-full" onClick={onUpgrade}>
            Upgrade Now
          </Button>
          <Button variant="ghost" className="w-full" onClick={onDismiss}>
            Maybe Later
          </Button>
        </div>
      ) : (
        <AppLink href="/speech-coach-v2" className="mt-6">
          <span className="text-sm font-semibold text-primary">Back to Speech Coach</span>
        </AppLink>
      )}
    </div>
  );
}
