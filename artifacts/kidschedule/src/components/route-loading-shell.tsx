import { AuthBootShell } from "@/components/auth-boot-shell";

/** Shown while route data or auth-dependent UI is resolving — never render null. */
export function RouteLoadingShell() {
  return <AuthBootShell />;
}
