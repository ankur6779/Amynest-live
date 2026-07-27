/**
 * Edit Birth Details (Pack 7 §2) — save confirms regenerate; never mutates old snapshots.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import type { BirthProfile } from "../../domain/models/birth-profile";
import {
  validateBirthDate,
  validateBirthTime,
} from "../../domain/validators/setup-validators";
import type { TimePrecision } from "../../domain/models/setup-draft";
import type { PlaceLookupResult } from "../../domain/ports/place-lookup-port";
import { getPlaceLookupPort } from "../../infrastructure/geocoding/resolve-place-lookup";
import { pushRecentPlace } from "../../infrastructure/geocoding/recent-places";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { useFocusTrap } from "../../lib/focus-trap";
import { Button } from "@/components/ui/button";

type Props = {
  profile: BirthProfile;
  focusField?: "day" | "time" | "place";
  online: boolean;
  onCancel: () => void;
  onSaveAndRegenerate: (next: {
    birthDate: string;
    birthTime: string | null;
    timePrecision: TimePrecision;
    birthPlace: BirthProfile["birthPlace"];
  }) => Promise<void>;
};

export function BirthSkyEditBirthDetailsPage({
  profile,
  focusField,
  online,
  onCancel,
  onSaveAndRegenerate,
}: Props) {
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [timePrecision, setTimePrecision] = useState<TimePrecision>(profile.timePrecision);
  const [birthTime, setBirthTime] = useState(profile.birthTime ?? "");
  const [birthPlace, setBirthPlace] = useState(profile.birthPlace);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceLookupResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, confirmOpen, () => setConfirmOpen(false));
  useFocusTrap(discardRef, discardOpen, () => setDiscardOpen(false));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.birth_details_edit_started", {});
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (!online) {
      setResults([]);
      setError("Search needs a connection");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const tid = window.setTimeout(async () => {
      setSearchLoading(true);
      const res = await getPlaceLookupPort().search(query, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setSearchLoading(false);
      if (!res.ok) {
        if (res.code === "aborted") return;
        setResults([]);
        setError(res.message);
        return;
      }
      setResults(res.results);
      setError(null);
    }, 350);
    return () => {
      window.clearTimeout(tid);
      ctrl.abort();
    };
  }, [query, online]);

  const dirty = useMemo(() => {
    const placeChanged =
      JSON.stringify(birthPlace) !== JSON.stringify(profile.birthPlace);
    return (
      birthDate !== profile.birthDate ||
      timePrecision !== profile.timePrecision ||
      (timePrecision === "unknown" ? null : birthTime) !== profile.birthTime ||
      placeChanged
    );
  }, [birthDate, birthTime, birthPlace, profile, timePrecision]);

  const fieldsChanged = (): Array<"date" | "time" | "place"> => {
    const fields: Array<"date" | "time" | "place"> = [];
    if (birthDate !== profile.birthDate) fields.push("date");
    if (
      timePrecision !== profile.timePrecision ||
      (timePrecision === "unknown" ? null : birthTime) !== profile.birthTime
    ) {
      fields.push("time");
    }
    if (JSON.stringify(birthPlace) !== JSON.stringify(profile.birthPlace)) {
      fields.push("place");
    }
    return fields;
  };

  const tryBack = () => {
    if (dirty) setDiscardOpen(true);
    else {
      trackBirthSkyEvent("birth_sky.birth_details_cancelled", {});
      onCancel();
    }
  };

  const submit = async () => {
    const dateV = validateBirthDate(birthDate);
    if (!dateV.ok) {
      setError(dateV.message);
      return;
    }
    const timeV = validateBirthTime(
      timePrecision,
      timePrecision === "unknown" ? null : birthTime || null,
    );
    if (!timeV.ok) {
      setError(timeV.message);
      return;
    }
    if (!online) {
      setError("Editing birth details requires a connection.");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSaveAndRegenerate({
        birthDate,
        birthTime: timePrecision === "unknown" ? null : birthTime,
        timePrecision,
        birthPlace,
      });
      trackBirthSkyEvent("birth_sky.birth_details_saved", {
        fields: fieldsChanged().join(","),
      });
    } catch {
      setError("Couldn’t save. Your previous sky is unchanged.");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BirthSkyModuleShell title="Birth details" onBack={tryBack} testId="birth-sky-edit-details">
      <p className="text-sm text-[hsl(40_20%_96%/0.7)]">
        Changing these details updates your profile, then creates a <em>new</em> sky snapshot.
        Past snapshots stay preserved.
      </p>

      <label className="mt-6 block text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
        Birth date
        <input
          type="date"
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          autoFocus={focusField === "day"}
          data-testid="birth-sky-edit-date"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          Birth time
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["exact", "approximate", "unknown"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`min-h-11 rounded-lg px-3 text-xs font-bold ${
                timePrecision === p ? "bg-white/15" : "bg-white/5"
              }`}
              onClick={() => setTimePrecision(p)}
              data-testid={`birth-sky-edit-precision-${p}`}
            >
              {p}
            </button>
          ))}
        </div>
        {timePrecision !== "unknown" ? (
          <input
            type="time"
            className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            autoFocus={focusField === "time"}
            data-testid="birth-sky-edit-time"
          />
        ) : null}
      </fieldset>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
          Birth place
        </p>
        {birthPlace ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
            <p className="text-sm" data-testid="birth-sky-edit-place-current">
              {birthPlace.label}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-red-200"
              onClick={() => setBirthPlace(null)}
              data-testid="birth-sky-edit-place-clear"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[hsl(40_20%_96%/0.55)]">No place set</p>
        )}
        <label className="mt-3 block text-xs font-semibold" htmlFor="birth-sky-edit-place-search">
          Search place
        </label>
        <input
          id="birth-sky-edit-place-search"
          type="search"
          className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm disabled:opacity-50"
          value={query}
          disabled={!online}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={focusField === "place"}
          placeholder="City or town"
          data-testid="birth-sky-edit-place"
        />
        {searchLoading ? (
          <p className="mt-2 text-xs text-[hsl(40_20%_96%/0.55)]">Searching…</p>
        ) : null}
        <ul className="mt-2 space-y-1">
          {results.map((r) => (
            <li key={`${r.label}-${r.lat}-${r.lon}`}>
              <button
                type="button"
                className="min-h-11 w-full rounded-lg bg-white/5 px-3 text-left text-sm"
                onClick={() => {
                  const place = {
                    label: r.label,
                    lat: r.lat,
                    lon: r.lon,
                    timezoneIana: r.timezoneIana ?? null,
                    country: r.country ?? null,
                    adminRegion: r.adminRegion ?? null,
                  };
                  setBirthPlace(place);
                  pushRecentPlace(r);
                  setQuery("");
                  setResults([]);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-2">
        <Button
          type="button"
          className="min-h-12 w-full rounded-xl"
          disabled={!dirty || saving}
          onClick={() => void submit()}
          data-testid="birth-sky-edit-save"
        >
          Save & update sky
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary min-h-12 w-full rounded-xl"
          onClick={tryBack}
          data-testid="birth-sky-edit-cancel"
        >
          Cancel
        </Button>
      </div>

      {confirmOpen ? (
        <div
          ref={confirmRef}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm sky update"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          data-testid="birth-sky-edit-confirm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-5">
            <h3 className="text-lg font-semibold">Update sky with these details?</h3>
            <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.75)]">
              A new snapshot will be created. Your previous sky, reflections, and conversations stay
              saved.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                className="min-h-11 rounded-xl"
                disabled={saving}
                onClick={() => void confirmSave()}
                data-testid="birth-sky-edit-confirm-yes"
              >
                {saving ? "Updating…" : "Update sky"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="amy-astro-btn-secondary min-h-11 rounded-xl"
                onClick={() => setConfirmOpen(false)}
              >
                Keep editing
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {discardOpen ? (
        <div
          ref={discardRef}
          role="dialog"
          aria-modal="true"
          aria-label="Discard changes"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[hsl(220_28%_12%)] p-5">
            <h3 className="text-lg font-semibold">Discard changes?</h3>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                className="min-h-11 rounded-xl"
                onClick={() => {
                  trackBirthSkyEvent("birth_sky.birth_details_cancelled", {});
                  onCancel();
                }}
                data-testid="birth-sky-edit-discard"
              >
                Discard
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="amy-astro-btn-secondary min-h-11 rounded-xl"
                onClick={() => setDiscardOpen(false)}
              >
                Keep editing
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </BirthSkyModuleShell>
  );
}
