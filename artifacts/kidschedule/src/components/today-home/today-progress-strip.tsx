/**
 * Quiet execution progress — secondary to Today Home Hero.
 * Never streak / score / coins / dopamine.
 */
type Props = {
  done: number;
  total: number;
};

export function TodayProgressStrip({ done, total }: Props) {
  if (total <= 0) return null;

  const safeDone = Math.max(0, Math.min(done, total));
  const pct = Math.round((safeDone / total) * 100);
  const complete = safeDone >= total;
  const label = complete
    ? "Today’s plan is complete"
    : `${safeDone} of ${total} for today`;

  return (
    <div
      className="th-progress"
      data-testid="today-progress-strip"
      role="status"
      aria-label={label}
    >
      <div className="th-progress-row">
        <span className="th-progress-label">{label}</span>
        <span className="th-progress-pct" aria-hidden>
          {pct}%
        </span>
      </div>
      <div className="th-progress-track" aria-hidden>
        <div className="th-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
