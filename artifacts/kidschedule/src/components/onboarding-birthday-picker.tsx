import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type PickerStep = "month" | "day" | "year";

export function OnboardingBirthdayPicker({
  max,
  initialIso,
  onConfirm,
  confirmLabel,
  theme = "onboarding",
}: {
  max?: string;
  initialIso?: string;
  onConfirm: (iso: string) => void;
  confirmLabel: string;
  theme?: "onboarding" | "app";
}) {
  const maxIso = max ?? new Date().toISOString().split("T")[0]!;
  const maxParts = useMemo(() => {
    const [y, m, d] = maxIso.split("-").map(Number);
    return { year: y, month: m, day: d };
  }, [maxIso]);

  const parsedInitial = initialIso?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    ? {
        year: Number(initialIso.slice(0, 4)),
        month: Number(initialIso.slice(5, 7)),
        day: Number(initialIso.slice(8, 10)),
      }
    : { year: maxParts.year - 4, month: maxParts.month, day: maxParts.day };

  const [step, setStep] = useState<PickerStep>("month");
  const [month, setMonth] = useState(parsedInitial.month);
  const [day, setDay] = useState(parsedInitial.day);
  const [year, setYear] = useState(parsedInitial.year);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = maxParts.year; y >= maxParts.year - 18; y--) out.push(y);
    return out;
  }, [maxParts.year]);

  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  const chipClass = (active: boolean) =>
    theme === "onboarding"
      ? cn(
          "min-h-[44px] rounded-2xl px-3 py-2.5 text-sm font-semibold border transition-all active:scale-95",
          active ? "opacity-100" : "",
        )
      : cn(
          "min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        );

  const chipStyle =
    theme === "onboarding"
      ? {
          background: "rgba(255,255,255,0.10)",
          color: "#fff",
          border: "1px solid rgba(168,85,247,0.30)",
        }
      : undefined;

  const activeChipStyle =
    theme === "onboarding"
      ? {
          background: "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))",
          color: "#fff",
          border: "1px solid transparent",
        }
      : undefined;

  const candidate = toIso(year, month, safeDay);
  const canConfirm = candidate <= maxIso;

  return (
    <div className="space-y-3" data-chat-answer="true">
      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide">
        {(["month", "day", "year"] as PickerStep[]).map((s) => (
          <span
            key={s}
            style={{
              color: step === s ? "#fff" : "rgba(255,255,255,0.45)",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {step === "month" ? (
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS.map((label, i) => {
            const m = i + 1;
            const on = month === m;
            return (
              <button
                key={label}
                type="button"
                className={chipClass(on)}
                style={on ? activeChipStyle : chipStyle}
                onClick={() => {
                  setMonth(m);
                  setStep("day");
                }}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      ) : null}

      {step === "day" ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => {
            const on = safeDay === d;
            return (
              <button
                key={d}
                type="button"
                className={chipClass(on)}
                style={on ? activeChipStyle : chipStyle}
                onClick={() => {
                  setDay(d);
                  setStep("year");
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      ) : null}

      {step === "year" ? (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {years.map((y) => {
            const on = year === y;
            return (
              <button
                key={y}
                type="button"
                className={chipClass(on)}
                style={on ? activeChipStyle : chipStyle}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex gap-2">
        {step !== "month" ? (
          <button
            type="button"
            className={chipClass(false)}
            style={chipStyle}
            onClick={() => setStep(step === "year" ? "day" : "month")}
          >
            Back
          </button>
        ) : null}
        {step === "year" ? (
          <button
            type="button"
            disabled={!canConfirm}
            className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))",
            }}
            onClick={() => onConfirm(toIso(year, month, safeDay))}
          >
            {confirmLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
