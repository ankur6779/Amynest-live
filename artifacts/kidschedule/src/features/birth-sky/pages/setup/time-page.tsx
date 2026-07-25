import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { validateBirthTime } from "../../domain/validators/setup-validators";
import type { SetupDraft, TimePrecision } from "../../domain/models/setup-draft";

type Props = {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  onBack: () => void;
  onContinue: () => void;
};

const MODES: { id: TimePrecision; label: string; helper: string }[] = [
  { id: "exact", label: "Exact time", helper: "As on the birth record" },
  { id: "approximate", label: "Approximate", helper: "Close enough is fine" },
  { id: "unknown", label: "I don’t know", helper: "We’ll create a Day Sky — still meaningful." },
];

export function BirthSkyTimePage({ draft, onChange, onBack, onContinue }: Props) {
  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "time" });
  }, []);

  const precision = draft.timePrecision;
  const needsClock = precision === "exact" || precision === "approximate";
  const validation = validateBirthTime(precision, draft.birthTime);

  return (
    <BirthSkyModuleShell title="Birth Sky" onBack={onBack} testId="birth-sky-setup-time">
      <h2 className="font-quicksand text-2xl font-bold">Do you know the exact time?</h2>
      <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
        Time unlocks Ascendant and houses. Without it, a Day Sky is still meaningful.
      </p>

      <div className="mt-6 space-y-2" role="radiogroup" aria-label="Birth time precision">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={precision === m.id}
            className={`w-full rounded-xl border px-4 py-3 text-left ${
              precision === m.id
                ? "border-[hsl(40_30%_70%/0.5)] bg-white/10"
                : "border-white/10 bg-white/[0.03]"
            }`}
            onClick={() => {
              onChange({
                ...draft,
                timePrecision: m.id,
                birthTime: m.id === "unknown" ? null : draft.birthTime,
                dirty: true,
              });
              if (m.id === "unknown") {
                trackBirthSkyEvent("birth_sky.unknown_time_selected", {
                  time_precision: "unknown",
                });
              }
            }}
            data-testid={`birth-sky-time-mode-${m.id}`}
          >
            <p className="font-semibold">{m.label}</p>
            <p className="mt-0.5 text-xs text-[hsl(40_20%_96%/0.65)]">{m.helper}</p>
          </button>
        ))}
      </div>

      {needsClock ? (
        <div className="mt-6">
          <label className="block text-sm font-semibold" htmlFor="birth-sky-time">
            Birth time
          </label>
          <input
            id="birth-sky-time"
            type="time"
            className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base"
            value={draft.birthTime ?? ""}
            onChange={(e) =>
              onChange({
                ...draft,
                birthTime: e.target.value || null,
                dirty: true,
              })
            }
            data-testid="birth-sky-time-input"
          />
        </div>
      ) : null}

      <Button
        type="button"
        className="mt-8 min-h-12 w-full rounded-xl"
        disabled={!validation.ok}
        onClick={() => {
          trackBirthSkyEvent("birth_sky.time_completed", {
            time_precision: precision ?? "unknown",
          });
          onContinue();
        }}
        data-testid="birth-sky-time-continue"
      >
        Continue
      </Button>
    </BirthSkyModuleShell>
  );
}
