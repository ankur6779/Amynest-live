/**
 * House + planet detail panels backed by snapshot chart-details (never invented).
 */

import { useState } from "react";
import type { AstronomyData } from "../domain/models/birth-profile";

type Props = {
  astronomy: AstronomyData;
};

export function BirthSkyChartDetailsPanel({ astronomy }: Props) {
  const houses = astronomy.houseDetails ?? [];
  const planets = astronomy.planetDetails ?? [];
  const [openHouse, setOpenHouse] = useState<number | null>(null);
  const [openPlanet, setOpenPlanet] = useState<string | null>(null);

  if (!houses.length && !planets.length) return null;

  return (
    <div className="space-y-4" data-testid="birth-sky-chart-details">
      {houses.length ? (
        <section aria-labelledby="birth-sky-houses-heading">
          <h3
            id="birth-sky-houses-heading"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]"
          >
            Twelve bhavas
          </h3>
          <ul className="mt-2 space-y-2">
            {houses.map((h) => {
              const open = openHouse === h.house;
              return (
                <li
                  key={h.house}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                  data-testid={`birth-sky-house-${h.house}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-2 text-left"
                    onClick={() => setOpenHouse(open ? null : h.house)}
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold text-[hsl(40_20%_96%/0.92)]">
                      H{h.house} · {h.name} · {h.sign}
                    </span>
                    <span className="text-[10px] text-[hsl(42_60%_75%/0.85)]">
                      {h.planets.length ? `${h.planets.length} graha` : "empty"}
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-2 space-y-1 text-xs leading-relaxed text-[hsl(40_20%_96%/0.78)]">
                      <p>
                        {h.sanskrit} · Lord {h.lord}
                      </p>
                      <p>{h.meaning}</p>
                      <p>{h.aiInterpretation}</p>
                      <p>Strengths: {h.strengths}</p>
                      <p>Challenges: {h.challenges}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {planets.length ? (
        <section aria-labelledby="birth-sky-planets-heading">
          <h3
            id="birth-sky-planets-heading"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[hsl(40_20%_96%/0.55)]"
          >
            Graha details
          </h3>
          <ul className="mt-2 space-y-2">
            {planets.map((p) => {
              const open = openPlanet === p.id;
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                  data-testid={`birth-sky-planet-${p.id}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-2 text-left"
                    onClick={() => setOpenPlanet(open ? null : p.id)}
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold text-[hsl(40_20%_96%/0.92)]">
                      {p.label}
                      {p.retrograde ? " (R)" : ""}
                      {p.combust ? " · combust" : ""}
                    </span>
                    <span className="text-[10px] text-[hsl(42_60%_75%/0.85)]">
                      {p.sign}
                      {p.house != null ? ` · H${p.house}` : ""}
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-2 space-y-1 text-xs leading-relaxed text-[hsl(40_20%_96%/0.78)]">
                      <p>
                        Longitude {p.eclipticLongitudeDeg.toFixed(2)}°
                        {p.degreeInSign != null
                          ? ` · ${p.degreeInSign.toFixed(1)}° in sign`
                          : ""}
                      </p>
                      {p.nakshatra ? (
                        <p>
                          Nakshatra {p.nakshatra}
                          {p.pada != null ? ` pada ${p.pada}` : ""}
                          {p.nakshatraLord ? ` · lord ${p.nakshatraLord}` : ""}
                        </p>
                      ) : null}
                      <p>{p.meaning}</p>
                      <p>{p.parentingInterpretation}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
