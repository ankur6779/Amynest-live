/** Live countdown parts until an event date (ISO YYYY-MM-DD, morning anchor). */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
  /** True when ≤7 days remain — show live ticker. */
  isUrgent: boolean;
}

const MS_MIN = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const URGENT_DAYS = 7;

export function eventTargetDate(isoDate: string): Date {
  return new Date(`${isoDate}T09:00:00`);
}

export function getCountdownParts(targetIso: string, now = new Date()): CountdownParts {
  const diff = eventTargetDate(targetIso).getTime() - now.getTime();
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isPast: true,
      isUrgent: true,
    };
  }
  const days = Math.floor(diff / MS_DAY);
  const hours = Math.floor((diff % MS_DAY) / MS_HOUR);
  const minutes = Math.floor((diff % MS_HOUR) / MS_MIN);
  const seconds = Math.floor((diff % MS_MIN) / 1000);
  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diff,
    isPast: false,
    isUrgent: days <= URGENT_DAYS,
  };
}

export function formatCountdownClock(parts: CountdownParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (parts.isPast) return "00:00:00";
  if (parts.days > 0) {
    return `${parts.days}d ${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
  }
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
