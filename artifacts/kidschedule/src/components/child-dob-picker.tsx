import { useEffect, useMemo, useState, type CSSProperties } from "react";

function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function defaultChildDobParts(maxIso: string): { year: number; month: number; day: number } {
  const max = parseIsoDate(maxIso) ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };
  let year = max.year - 3;
  let month = max.month;
  let day = max.day;
  const dim = daysInMonth(year, month);
  if (day > dim) day = dim;
  return { year, month, day };
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface ChildDobPickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  /** YYYY-MM-DD — defaults to today */
  max?: string;
  className?: string;
  selectStyle?: CSSProperties;
}

/**
 * Day / month / year selects — reliable in iOS WKWebView where `<input type="date">`
 * often shows an empty field and no picker.
 */
export function ChildDobPicker({
  value,
  onChange,
  max,
  className,
  selectStyle,
}: ChildDobPickerProps) {
  const maxIso = max ?? new Date().toISOString().split("T")[0];
  const maxParts = parseIsoDate(maxIso)!;

  const initial = parseIsoDate(value) ?? defaultChildDobParts(maxIso);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    const parsed = parseIsoDate(value);
    if (!parsed) return;
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [value]);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = maxParts.year; y >= maxParts.year - 18; y--) out.push(y);
    return out;
  }, [maxParts.year]);

  const maxDay = daysInMonth(year, month);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [day, maxDay]);

  useEffect(() => {
    const candidate = toIso(year, month, day);
    if (candidate > maxIso) {
      onChange(maxIso);
      const clamped = parseIsoDate(maxIso)!;
      setYear(clamped.year);
      setMonth(clamped.month);
      setDay(clamped.day);
      return;
    }
    onChange(candidate);
  }, [year, month, day, maxIso, onChange]);

  const selectClass =
    "min-w-0 flex-1 rounded-2xl px-3 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors appearance-none";

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      <div className="flex gap-2">
        <select
          aria-label="Birth month"
          className={selectClass}
          style={selectStyle}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {MONTH_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Birth day"
          className={selectClass}
          style={selectStyle}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label="Birth year"
          className={selectClass}
          style={selectStyle}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground px-1">
        {toIso(year, month, day)}
      </p>
    </div>
  );
}
