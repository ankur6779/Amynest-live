import { useLocation } from "wouter";
import { AppFallbackUi } from "@/components/app-fallback-ui";

/** Catch-all when no route matches or lazy chunk fails to render. */
export default function RouteFailedPage() {
  const [, navigate] = useLocation();

  return (
    <AppFallbackUi
      message="We're having trouble loading this screen.\nPlease try again."
      onTryAgain={() => window.location.reload()}
      onGoHome={() => navigate("/dashboard")}
    />
  );
}
