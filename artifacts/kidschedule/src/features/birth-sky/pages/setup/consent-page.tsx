/**
 * Consent step (Pack 2 Part 6).
 * Clarification: Primary advances to Review when checked; Create fires on Review
 * (Pack 2 §8.6 + IM-1 objective). Checkbox still required before Create.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../../lib/analytics";
import {
  BIRTH_SKY_CONSENT_SCOPES,
  BIRTH_SKY_CONSENT_VERSION,
} from "../../constants/consent";
import type { SetupDraft } from "../../domain/models/setup-draft";
import { saveSetupDraft } from "../../infrastructure/repositories/setup-draft-store";
import { AMY_ASTRO_PRODUCT_NAME } from "../../lib/branding";

type Props = {
  draft: SetupDraft;
  childName: string;
  onChange: (draft: SetupDraft) => void;
  onBack: () => void;
  onContinueToReview: () => void;
  onSaveForLater: () => void;
};

export function BirthSkyConsentPage({
  draft,
  childName,
  onChange,
  onBack,
  onContinueToReview,
  onSaveForLater,
}: Props) {
  const [sheet, setSheet] = useState<"privacy" | "birth-data" | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "consent" });
  }, []);

  const checked = draft.consent.disclaimerAccepted;

  return (
    <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onBack} testId="birth-sky-setup-consent">
      <h2 className="font-quicksand text-2xl font-bold">Your privacy</h2>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[hsl(40_20%_96%/0.78)]">
        <li>Private</li>
        <li>Parent-only</li>
        <li>Deletable anytime</li>
        <li>Not used for ads</li>
        <li>Optional module</li>
      </ul>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
        <p>We compute the sky positions from your details.</p>
        <p>Optional cultural stories are labeled as tradition — not science.</p>
        <p>This is reflective and cultural — not a prediction, and not medical or career certainty.</p>
        <p>You can remove Amy Astro Intelligence data later in Settings.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" className="h-auto px-2 py-1 text-sm underline" onClick={() => setSheet("privacy")}>
          Privacy details
        </Button>
        <Button type="button" variant="ghost" className="h-auto px-2 py-1 text-sm underline" onClick={() => setSheet("birth-data")}>
          How we use birth data
        </Button>
      </div>

      {sheet ? (
        <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm" role="dialog">
          {sheet === "privacy" ? (
            <p>Birth details stay on your account for Amy Astro Intelligence only. Parent-only. Never for ads.</p>
          ) : (
            <p>
              Date, optional time, and place are used to place the sky. Coordinates are not shared with
              analytics.
            </p>
          )}
          <Button type="button" className="mt-3 min-h-11 rounded-xl" onClick={() => setSheet(null)}>
            Close
          </Button>
        </div>
      ) : null}

      <label className="mt-8 flex items-start gap-3 text-sm leading-snug">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5"
          checked={checked}
          onChange={(e) => {
            const on = e.target.checked;
            onChange({
              ...draft,
              dirty: true,
              consent: {
                disclaimerAccepted: on,
                consentVersion: on ? BIRTH_SKY_CONSENT_VERSION : null,
                acceptedAt: on ? new Date().toISOString() : null,
                scopes: on ? [...BIRTH_SKY_CONSENT_SCOPES] : [],
              },
            });
          }}
          data-testid="birth-sky-consent-checkbox"
        />
        <span>
          I understand this is reflective and cultural — not a prediction.
        </span>
      </label>

      <Button
        type="button"
        className="mt-8 min-h-12 w-full rounded-xl"
        disabled={!checked}
        aria-disabled={!checked}
        aria-describedby={!checked ? "birth-sky-consent-disabled-reason" : undefined}
        onClick={onContinueToReview}
        data-testid="birth-sky-consent-continue"
      >
        Continue
      </Button>
      {!checked ? (
        <p id="birth-sky-consent-disabled-reason" className="mt-2 text-xs text-[hsl(40_20%_96%/0.55)]">
          Accept the consent checkbox to continue to review.
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="amy-astro-btn-secondary mt-3 min-h-12 w-full rounded-xl"
        onClick={() => {
          saveSetupDraft(draft);
          trackBirthSkyEvent("birth_sky.setup_saved_for_later", { referrer: "parenting_hub" });
          onSaveForLater();
        }}
        data-testid="birth-sky-consent-save-later"
      >
        Save for later
      </Button>
      <p className="sr-only">Creating {childName}&apos;s Amy Astro Intelligence requires review next.</p>
    </BirthSkyModuleShell>
  );
}
