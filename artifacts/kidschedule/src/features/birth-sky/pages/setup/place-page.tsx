import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BirthSkyModuleShell } from "../../components/birth-sky-module-shell";
import { trackBirthSkyEvent } from "../../lib/analytics";
import { getPlaceLookupPort } from "../../infrastructure/geocoding/resolve-place-lookup";
import {
  loadRecentPlaces,
  pushRecentPlace,
} from "../../infrastructure/geocoding/recent-places";
import type { PlaceLookupResult } from "../../domain/ports/place-lookup-port";
import type { SetupDraft } from "../../domain/models/setup-draft";

type Props = {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function BirthSkyPlacePage({ draft, onChange, onBack, onContinue }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceLookupResult[]>([]);
  const [recent, setRecent] = useState<PlaceLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchDisabled, setSearchDisabled] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine === false,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.setup_step_viewed", { setup_step: "place" });
    setRecent(loadRecentPlaces());
    const sync = () => setSearchDisabled(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      if (!searchDisabled) setError(null);
      return;
    }
    if (searchDisabled) {
      setResults([]);
      setError("Search needs a connection");
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const tid = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      const res = await getPlaceLookupPort().search(query, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      setLoading(false);
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
  }, [query, searchDisabled]);

  const canContinue = Boolean(draft.birthPlace) || draft.placeSkipped;

  return (
    <BirthSkyModuleShell title="Birth Sky" onBack={onBack} testId="birth-sky-setup-place">
      <h2 className="font-quicksand text-2xl font-bold">Where were they born?</h2>
      <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]">
        Location is used only to place the sky — never for ads.
      </p>

      <label className="mt-6 block text-sm font-semibold" htmlFor="birth-sky-place-search">
        Search
      </label>
      <input
        id="birth-sky-place-search"
        type="search"
        autoComplete="off"
        className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base disabled:opacity-50"
        placeholder="City or town"
        value={query}
        disabled={searchDisabled}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="birth-sky-place-search"
      />

      {searchDisabled ? (
        <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]" role="status">
          Search needs a connection. You can skip or pick a recent place.
        </p>
      ) : null}
      {loading ? <p className="mt-2 text-xs text-[hsl(40_20%_96%/0.55)]">Searching…</p> : null}
      {error && !searchDisabled ? (
        <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]" role="status">
          {error}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Place results">
          {results.map((r) => (
            <li key={`${r.label}-${r.lat}`}>
              <button
                type="button"
                className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm"
                onClick={() => {
                  pushRecentPlace(r);
                  onChange({
                    ...draft,
                    birthPlace: {
                      label: r.label,
                      lat: r.lat,
                      lon: r.lon,
                      timezoneIana: r.timezoneIana,
                      country: r.country,
                      adminRegion: r.adminRegion,
                    },
                    placeSkipped: false,
                    dirty: true,
                  });
                }}
                data-testid="birth-sky-place-result"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {recent.length > 0 && !query ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]">
            Recent
          </p>
          <ul className="mt-2 space-y-2">
            {recent.map((r) => (
              <li key={`recent-${r.label}`}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-xl border border-white/10 px-4 text-left text-sm"
                  onClick={() =>
                    onChange({
                      ...draft,
                      birthPlace: {
                        label: r.label,
                        lat: r.lat,
                        lon: r.lon,
                        timezoneIana: r.timezoneIana,
                        country: r.country,
                        adminRegion: r.adminRegion,
                      },
                      placeSkipped: false,
                      dirty: true,
                    })
                  }
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.birthPlace ? (
        <p
          className="mt-4 text-sm font-semibold text-[hsl(40_30%_80%)]"
          data-testid="birth-sky-place-selected"
        >
          Selected: {draft.birthPlace.label}
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="mt-6 min-h-12 w-full rounded-xl"
        onClick={() => {
          onChange({
            ...draft,
            birthPlace: null,
            placeSkipped: true,
            dirty: true,
          });
        }}
        data-testid="birth-sky-place-skip"
      >
        I don’t know / Skip for now
      </Button>

      <Button
        type="button"
        className="mt-3 min-h-12 w-full rounded-xl"
        disabled={!canContinue}
        onClick={() => {
          trackBirthSkyEvent("birth_sky.place_completed", {
            place_provided: Boolean(draft.birthPlace),
            skipped: draft.placeSkipped,
          });
          onContinue();
        }}
        data-testid="birth-sky-place-continue"
      >
        Continue
      </Button>
    </BirthSkyModuleShell>
  );
}
