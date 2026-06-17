import { Clock } from "lucide-react";
import { AppLink } from "@/components/app-link";

export function SpeechCoachV2LimitReached(props: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950">
        <Clock className="h-8 w-8 text-sky-600 dark:text-sky-300" />
      </div>
      <h2 className="text-xl font-bold">Amazing work today.</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{props.message}</p>
      <AppLink href="/speech-coach-v2" className="mt-6">
        <span className="text-sm font-semibold text-primary">Back to Speech Coach</span>
      </AppLink>
    </div>
  );
}
