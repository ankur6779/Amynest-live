import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../../lib/analytics";
import {
  needsAgeSanityWarning,
  validateBirthDate,
} from "../../domain/validators/setup-validators";
import type { SetupDraft } from "../../domain/models/setup-draft";

type Props = {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function BirthSkyDatePage({ draft, onChange, onBack, onContinue }: Props) {
  const [showAgeWarn, setShowAgeWarn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "date" });
  }, []);

  const tryContinue = () => {
    const v = validateBirthDate(draft.birthDate);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setError(null);
    if (draft.birthDate && needsAgeSanityWarning(draft.birthDate, draft.ageSanityConfirmed)) {
      setShowAgeWarn(true);
      return;
    }
    trackBirthSkyEvent("birth_sky.date_completed", { place_provided: false });
    onContinue();
  };

  return (
    <BirthSkyModuleShell title="Birth Sky" onBack={onBack} testId="birth-sky-setup-date">
      <h2 className="font-quicksand text-2xl font-bold">When did they arrive?</h2>
      <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
        Used for the Sun and the day-sky.
      </p>
      <label className="mt-8 block text-sm font-semibold" htmlFor="birth-sky-date">
        Birth date
      </label>
      <input
        id="birth-sky-date"
        type="date"
        className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base"
        value={draft.birthDate ?? ""}
        max={new Date().toISOString().slice(0, 10)}
        min="1900-01-01"
        onChange={(e) =>
          onChange({
            ...draft,
            birthDate: e.target.value || null,
            dirty: true,
            ageSanityConfirmed: false,
          })
        }
        data-testid="birth-sky-date-input"
      />
      {error ? (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {showAgeWarn ? (
        <div
          className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4"
          role="dialog"
          aria-labelledby="birth-sky-age-warn-title"
          data-testid="birth-sky-age-sanity"
        >
          <p id="birth-sky-age-warn-title" className="font-semibold">
            Does this date look right?
          </p>
          <p className="mt-1 text-sm text-[hsl(40_20%_96%/0.72)]">
            This date is more than 25 years ago.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1 rounded-xl"
              onClick={() => setShowAgeWarn(false)}
            >
              Edit
            </Button>
            <Button
              type="button"
              className="min-h-11 flex-1 rounded-xl"
              onClick={() => {
                onChange({ ...draft, ageSanityConfirmed: true, dirty: true });
                setShowAgeWarn(false);
                trackBirthSkyEvent("birth_sky.date_completed", { place_provided: false });
                onContinue();
              }}
              data-testid="birth-sky-age-confirm"
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-8 min-h-12 w-full rounded-xl"
          onClick={tryContinue}
          data-testid="birth-sky-date-continue"
        >
          Continue
        </Button>
      )}
    </BirthSkyModuleShell>
  );
}
