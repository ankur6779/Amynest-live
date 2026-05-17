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
      title="Connection problem"
      message={message}
      onReload={onRetry}
    />
  );
}
