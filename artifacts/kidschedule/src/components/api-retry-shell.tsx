import { AppFallbackUi } from "@/components/app-fallback-ui";

type Props = {
  message?: string;
  onRetry: () => void;
};

export function ApiRetryShell({
  message = "Could not load your data. Check your connection and try again.",
  onRetry,
}: Props) {
  return (
    <AppFallbackUi
      message={message}
      onTryAgain={onRetry}
      onGoHome={() => {
        const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
        window.location.assign(`${base}/dashboard`.replace(/\/{2,}/g, "/"));
      }}
    />
  );
}
