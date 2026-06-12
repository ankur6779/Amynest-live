import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { KeyboardSafeShell } from "@/components/chat-platform";
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

export function AmyCoachGoalsKeyboardShell({
  header,
  search,
  children,
  scrollDeps,
  className,
}: {
  header: ReactNode;
  search: ReactNode;
  children: ReactNode;
  scrollDeps?: unknown[];
  className?: string;
}) {
  return (
    <KeyboardSafeShell
      surface="amy-coach"
      layout="embedded"
      scrollDeps={scrollDeps ?? [search, children]}
      header={header}
      footer={search}
      className={cn("min-h-0 flex-1", className)}
      contentClassName="px-4 py-4 space-y-5 max-w-2xl mx-auto w-full"
      footerClassName="px-4 pt-3 pb-safe max-w-2xl mx-auto w-full bg-background/95 backdrop-blur-sm border-t border-border/40"
    >
      {children}
    </KeyboardSafeShell>
  );
}
