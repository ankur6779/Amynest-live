import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function AmyCoachSearchInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)} data-chat-answer="true">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        autoFocus={autoFocus}
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-border bg-card py-3 pl-10 pr-4 text-sm focus:border-border focus:outline-none"
        data-testid="amy-coach-search-input"
      />
    </div>
  );
}

/**
 * Amy Coach goals catalog — plain document scroll under the app header.
 * Avoids KeyboardSafeShell nested flex + explicit pixel heights that clip content on iOS WKWebView.
 */
export function AmyCoachGoalsShell({
  header,
  search,
  children,
  className,
}: {
  header: ReactNode;
  search: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={cn("amy-coach-goals-shell mx-auto w-full max-w-2xl pb-28", className)}>
        {header ? <div className="shrink-0">{header}</div> : null}
        <div className="space-y-5 px-4 py-3">{children}</div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background px-4 pt-3 pb-safe">
        <div className="mx-auto w-full max-w-2xl">{search}</div>
      </div>
    </>
  );
}

/** @deprecated Use AmyCoachGoalsShell — kept for call-site compatibility. */
export const AmyCoachGoalsKeyboardShell = AmyCoachGoalsShell;
