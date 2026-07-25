/**
 * Review + Create (Pack 2 Parts 7–8). Create is free — no paywall, no AI.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../../lib/analytics";
import {
  isOnlineForCreate,
  validateReadyForCreate,
} from "../../domain/validators/setup-validators";
import type { SetupDraft } from "../../domain/models/setup-draft";
import { AMY_ASTRO_PRODUCT_NAME } from "../../lib/branding";

type Props = {
  draft: SetupDraft;
  childName: string;
  creating: boolean;
  onBack: () => void;
  onEdit: (step: "date" | "time" | "place" | "consent") => void;
  onCreate: () => void;
};

function Chip({
  label,
  value,
  onEdit,
  testId,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
      <button
        type="button"
        className="min-h-11 min-w-11 rounded-full text-sm font-semibold text-[hsl(40_30%_80%)]"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        data-testid={testId}
      >
        Edit
      </button>
    </div>
  );
}

export function BirthSkyReviewPage({
  draft,
  childName,
  creating,
  onBack,
  onEdit,
  onCreate,
}: Props) {
  const [offline, setOffline] = useState(!isOnlineForCreate());
  const gate = validateReadyForCreate(draft);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "review" });
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const timeValue =
    draft.timePrecision === "unknown"
      ? "Unknown (Day Sky)"
      : `${draft.birthTime ?? "—"} (${draft.timePrecision})`;

  return (
    <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onBack} testId="birth-sky-setup-review">
      <h2 className="font-quicksand text-2xl font-bold">Reveal their sky</h2>
      <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
        Review birth details before the sky is formed. Create is free.
      </p>

      <div className="mt-6 space-y-3">
        <Chip
          label="Date"
          value={draft.birthDate ?? "—"}
          onEdit={() => {
            trackBirthSkyEvent("birth_sky.review_edit_tapped", { setup_step: "date" });
            onEdit("date");
          }}
          testId="birth-sky-review-edit-date"
        />
        <Chip
          label="Time"
          value={timeValue}
          onEdit={() => {
            trackBirthSkyEvent("birth_sky.review_edit_tapped", { setup_step: "time" });
            onEdit("time");
          }}
          testId="birth-sky-review-edit-time"
        />
        <Chip
          label="Place"
          value={
            draft.placeSkipped
              ? "Skipped"
              : draft.birthPlace?.label ?? "—"
          }
          onEdit={() => {
            trackBirthSkyEvent("birth_sky.review_edit_tapped", { setup_step: "place" });
            onEdit("place");
          }}
          testId="birth-sky-review-edit-place"
        />
        <Chip
          label="Consent"
          value={draft.consent.disclaimerAccepted ? "Accepted" : "Required"}
          onEdit={() => {
            trackBirthSkyEvent("birth_sky.review_edit_tapped", { setup_step: "consent" });
            onEdit("consent");
          }}
          testId="birth-sky-review-edit-consent"
        />
      </div>

      {offline ? (
        <p className="mt-4 text-sm text-amber-200" role="alert" data-testid="birth-sky-review-offline">
          Creating Amy Astro Intelligence needs a connection. Your draft is saved.
        </p>
      ) : null}
      {!gate.ok ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {gate.message}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-8 min-h-12 w-full rounded-xl"
        disabled={!gate.ok || offline || creating}
        onClick={onCreate}
        data-testid="birth-sky-create"
      >
        {creating ? "Creating…" : `Create ${childName}’s Amy Astro Intelligence`}
      </Button>
    </BirthSkyModuleShell>
  );
}
