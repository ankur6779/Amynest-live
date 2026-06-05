type Props = {
  visible: boolean;
  onRetry: () => void;
};

/** Inline notice — does not block navigation or hero. */
export function DashboardAvailabilityBanner({ visible, onRetry }: Props) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-950/85 px-3 py-2.5 text-xs text-amber-50 shadow-sm"
    >
      <p className="leading-snug">Some information is temporarily unavailable.</p>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/30 active:scale-[0.98] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
