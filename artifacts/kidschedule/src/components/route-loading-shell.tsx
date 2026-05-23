import { Loader2 } from "lucide-react";
import { AuthBootShell } from "@/components/auth-boot-shell";

/** Shown while route data or auth-dependent UI is resolving — never render null. */
export function RouteLoadingShell() {
  return <AuthBootShell />;
}

/** In-layout page transition — keeps header/tab bar visible while a lazy chunk loads. */
export function RouteContentLoadingShell() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16"
      role="status"
      aria-label="Loading page"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
    </div>
  );
}
