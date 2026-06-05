import type { ReactNode } from "react";
import { AmyNestSplashShell } from "@/components/amynest-splash-shell";

/**
 * Shown while Firebase Auth resolves the initial session — prevents a blank
 * screen after the HTML splash is dismissed.
 */
export function AuthBootShell({ children }: { children?: ReactNode }) {
  return (
    <AmyNestSplashShell variant="boot" overlay>
      {children}
    </AmyNestSplashShell>
  );
}
