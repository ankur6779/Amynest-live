/**
 * TEMPORARY low-precision calculator used only by astro-lite-adapter.
 * Do not call from routes — use getEphemerisPort().
 * @temporary
 */

export type TimePrecision = "exact" | "approximate" | "unknown";
export type BirthSkyMode = "full" | "day_sky";
export type AstronomyData = {
  bodies: Array<{ id: "sun" | "moon"; eclipticLongitudeDeg: number; sign: string }>;
  sunSign: string;
  moonSign: string;
  moonPhase: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  houses: null;
  precision: { timePrecision: TimePrecision; placeProvided: boolean };
};

export const ENGINE_VERSION = "amynest-astro-lite/1.0.0";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const PHASES = [
  { id: "new", label: "New Moon", max: 22.5 },
  { id: "waxing_crescent", label: "Waxing Crescent", max: 67.5 },
  { id: "first_quarter", label: "First Quarter", max: 112.5 },
  { id: "waxing_gibbous", label: "Waxing Gibbous", max: 157.5 },
  { id: "full", label: "Full Moon", max: 202.5 },
  { id: "waning_gibbous", label: "Waning Gibbous", max: 247.5 },
  { id: "last_quarter", label: "Last Quarter", max: 292.5 },
  { id: "waning_crescent", label: "Waning Crescent", max: 337.5 },
  { id: "new", label: "New Moon", max: 360 },
] as const;

function norm360(x: number): number {
  const v = x % 360;
  return v < 0 ? v + 360 : v;
}

function julianDay(utc: Date): number {
  const y = utc.getUTCFullYear();
  const m = utc.getUTCMonth() + 1;
  const D =
    utc.getUTCDate() +
    utc.getUTCHours() / 24 +
    utc.getUTCMinutes() / 1440 +
    utc.getUTCSeconds() / 86400;
  let Y = y;
  let M = m;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

/** Mean tropical solar longitude (deg). */
function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  return norm360(L0 + C);
}

/** Approximate apparent lunar ecliptic longitude (deg). */
function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm360(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      (T * T * T) / 538841 -
      (T * T * T * T) / 65194000,
  );
  const D = norm360(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868,
  );
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);
  const Mp = norm360(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699,
  );
  const F = norm360(
    93.272095 + 483202.0175233 * T - 0.0036539 * T * T - (T * T * T) / 3526000,
  );
  const toR = Math.PI / 180;
  const lon =
    Lp +
    6.289 * Math.sin(Mp * toR) +
    1.274 * Math.sin((2 * D - Mp) * toR) +
    0.658 * Math.sin(2 * D * toR) +
    0.214 * Math.sin(2 * Mp * toR) -
    0.186 * Math.sin(M * toR) -
    0.114 * Math.sin(2 * F * toR);
  return norm360(lon);
}

function signFromLongitude(lon: number): string {
  return SIGNS[Math.floor(norm360(lon) / 30) % 12]!;
}

function phaseFromElongation(elong: number): { id: string; label: string } {
  const e = norm360(elong);
  for (const p of PHASES) {
    if (e < p.max) return { id: p.id, label: p.label };
  }
  return { id: "new", label: "New Moon" };
}

/**
 * Approximate Ascendant sign when time + place available (full sky only).
 * Uses local sidereal time + latitude obliquity formula (lite).
 */
function risingSign(
  jd: number,
  lat: number,
  lon: number,
): string | null {
  const T = (jd - 2451545.0) / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  const lst = norm360(gmst + lon);
  const eps = 23.439291 - 0.0130042 * T;
  const toR = Math.PI / 180;
  const latR = lat * toR;
  const epsR = eps * toR;
  const lstR = lst * toR;
  const y = -Math.cos(lstR);
  const x = Math.sin(lstR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR);
  const asc = norm360((Math.atan2(y, x) * 180) / Math.PI);
  return signFromLongitude(asc);
}

export type ComputeAstronomyInput = {
  birthDate: string;
  birthTime: string | null;
  timePrecision: TimePrecision;
  lat: number | null;
  lon: number | null;
  timezoneOffsetMinutes?: number | null;
};

function toUtcDate(input: ComputeAstronomyInput): Date {
  const [y, m, d] = input.birthDate.split("-").map(Number);
  if (input.timePrecision === "unknown" || !input.birthTime) {
    // Day Sky: use local noon as representative day-sky epoch (no rising claim).
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const [hh, mm] = input.birthTime.split(":").map(Number);
  const offset = input.timezoneOffsetMinutes ?? 0;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - offset * 60_000;
  return new Date(utcMs);
}

export function computeAstronomyData(input: ComputeAstronomyInput): {
  mode: BirthSkyMode;
  astronomy: AstronomyData;
} {
  const mode: BirthSkyMode = input.timePrecision === "unknown" ? "day_sky" : "full";
  const utc = toUtcDate(input);
  const jd = julianDay(utc);
  const sunLon = sunLongitude(jd);
  const moonLon = moonLongitude(jd);
  const sunSign = signFromLongitude(sunLon);
  const moonSign = signFromLongitude(moonLon);
  const elong = norm360(moonLon - sunLon);
  const phase = phaseFromElongation(elong);

  const placeProvided = input.lat != null && input.lon != null;
  let rising: string | null = null;
  if (mode === "full" && placeProvided && input.birthTime) {
    rising = risingSign(jd, input.lat!, input.lon!);
  }

  return {
    mode,
    astronomy: {
      bodies: [
        { id: "sun", eclipticLongitudeDeg: sunLon, sign: sunSign },
        { id: "moon", eclipticLongitudeDeg: moonLon, sign: moonSign },
      ],
      sunSign,
      moonSign,
      moonPhase: phase.id,
      moonPhaseLabel: phase.label,
      risingSign: rising,
      houses: null,
      precision: {
        timePrecision: input.timePrecision,
        placeProvided,
      },
    },
  };
}

export function buildCacheKey(parts: {
  birthDate: string;
  birthTime: string | null;
  timePrecision: TimePrecision;
  lat: number | null;
  lon: number | null;
  engineVersion: string;
}): string {
  return [
    parts.birthDate,
    parts.birthTime ?? "none",
    parts.timePrecision,
    parts.lat?.toFixed(4) ?? "n",
    parts.lon?.toFixed(4) ?? "n",
    "tropical",
    "no_houses",
    parts.engineVersion,
  ].join("|");
}
