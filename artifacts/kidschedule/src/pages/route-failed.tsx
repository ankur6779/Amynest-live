import { useLocation } from "wouter";
import { AppFallbackUi } from "@/components/app-fallback-ui";

/** Catch-all when no route matches or lazy chunk fails to render. */
export default function RouteFailedPage() {
  const [, navigate] = useLocation();

  return (
    <AppFallbackUi
      title="Page failed to load"
      message="This page could not be opened. Go home or reload the app."
      onReload={() => {
        navigate("/");
      }}
    />
  );
}
