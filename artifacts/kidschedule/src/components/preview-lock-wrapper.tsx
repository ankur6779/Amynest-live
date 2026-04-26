import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PreviewLockMode = "infant" | "next-level";

/**
 * Context provided by HubSection so descendant `<PreviewLockWrapper>`s can
 * request the section to auto-collapse when the preview cap fires. This is
 * how Section 2 non-media tiles satisfy "auto-close after 5–8 s" without
 * the wrapper needing a direct ref to its parent section.
 */
export const HubSectionAutoCloseContext = createContext<(() => void) | null>(
  null,
);

export function useHubSectionAutoClose(): (() => void) | null {
  return useContext(HubSectionAutoCloseContext);
}

const COPY: Record<PreviewLockMode, { title: string; subtitle: string }> = {
  infant: {
    title: "This is for when your child grows",
    subtitle: "You'll unlock this soon — it's just a peek for today.",
  },
  "next-level": {
    title: "Complete current level to unlock this",
    subtitle:
      "Finish today's stage and the next level will open up automatically.",
  },
};

export function getPreviewLockCopy(mode: PreviewLockMode) {
  return COPY[mode];
}

interface PreviewLockWrapperProps {
  mode: PreviewLockMode;
  /** Cap in milliseconds. Default 6000, clamped to the 5–8 s contract. */
  capMs?: number;
  /** Fired once when the timer expires. */
  onLocked?: () => void;
  /** Optional dismiss handler — when omitted, the overlay has no close button. */
  onClose?: () => void;
  /** Optional explicit close action label. */
  closeLabel?: string;
  /** Test id override for the wrapping element. */
  testId?: string;
  children: React.ReactNode;
}

/**
 * Non-media preview-and-lock wrapper. Wraps any panel/dialog/screen in
 * Section 2: starts a 5–8 second timer on mount, then drops a centered lock
 * overlay over the content with the appropriate message. Disables interaction
 * inside the wrapped content the moment the overlay appears.
 *
 * Re-mounting the wrapper restarts the timer — HubSection unmounts children
 * when collapsed, so reopening a Section-2 tile is automatically a clean
 * preview restart.
 */
export function PreviewLockWrapper({
  mode,
  capMs = 6000,
  onLocked,
  onClose,
  closeLabel = "Got it",
  testId = "preview-lock-wrapper",
  children,
}: PreviewLockWrapperProps) {
  const [locked, setLocked] = useState(false);
  const onLockedRef = useRef(onLocked);
  const onCloseRef = useRef(onClose);
  const sectionAutoClose = useHubSectionAutoClose();
  const sectionAutoCloseRef = useRef(sectionAutoClose);
  useEffect(() => {
    onLockedRef.current = onLocked;
    onCloseRef.current = onClose;
    sectionAutoCloseRef.current = sectionAutoClose;
  }, [onLocked, onClose, sectionAutoClose]);

  // Clamp to the 5–8s contract — anything outside that range would violate
  // the brief, so we silently snap rather than trust callers.
  const safeCap = Math.min(8000, Math.max(5000, capMs));

  useEffect(() => {
    setLocked(false);
    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const t = setTimeout(() => {
      setLocked(true);
      onLockedRef.current?.();
      // Hand control back to the host HubSection so the section auto-collapses
      // shortly after the lock appears. This satisfies the "auto-close after
      // 5–8 s" contract for non-media tiles. We keep the overlay visible for
      // a short beat so the user actually sees the lock copy before collapse.
      const section = sectionAutoCloseRef.current;
      const userClose = onCloseRef.current;
      if (section || userClose) {
        closeTimer = setTimeout(() => {
          if (section) section();
          if (userClose) userClose();
        }, 1200);
      }
    }, safeCap);
    return () => {
      clearTimeout(t);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [safeCap]);

  const copy = COPY[mode];

  return (
    <div
      className="relative"
      data-testid={testId}
      data-preview-mode={mode}
      data-preview-locked={locked ? "true" : "false"}
    >
      <div
        aria-hidden={locked || undefined}
        className={
          locked ? "pointer-events-none select-none opacity-40 saturate-50" : ""
        }
      >
        {children}
      </div>

      {locked && (
        <div
          data-testid="preview-lock-overlay"
          className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-violet-500/15 backdrop-blur-[3px] rounded-2xl"
        >
          <div className="max-w-xs rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-amber-200/60 dark:border-amber-400/30 shadow-2xl px-5 py-4 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-2">
              <Lock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </div>
            <p className="font-bold text-sm text-foreground">{copy.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              {copy.subtitle}
            </p>
            {onClose && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onClose}
                className="mt-3 rounded-full h-8 px-3 text-xs font-bold gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                {closeLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
