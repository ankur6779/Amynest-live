/**
 * CI / release gate: every Amy Audio lesson paragraph must:
 *   1) normalize → static-audio-map entry
 *   2) resolve a /api/static-audio/{md5}.mp3 URL
 *   3) download HTTP 200 audio/mpeg with a real MP3 body (not placeholder)
 *
 *   pnpm --filter @workspace/scripts run validate-lesson-static-audio-live
 *   STATIC_AUDIO_LIVE_BASE=https://www.amynest.in pnpm --filter @workspace/scripts run validate-lesson-static-audio-live
 */
import { LESSONS } from "@workspace/audio-lessons";
import { getStaticAudioHash, normalizeStaticAudioKey } from "@workspace/static-audio";
import { loadStaticAudioMap } from "./static-audio-paths.js";

const BASE = (
  process.env.STATIC_AUDIO_LIVE_BASE ??
  process.env.VITE_APP_API_ORIGIN ??
  "https://www.amynest.in"
).replace(/\/$/, "");

function isMp3(buf: Buffer): boolean {
  if (buf.length < 3) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  if (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0) return true;
  return false;
}

type Row = {
  lessonId: string;
  paragraphIdx: number;
  original: string;
  normalized: string;
  generatedHash: string;
  mapUrl: string | null;
  mapHash: string | null;
  requestUrl: string | null;
  status: number | null;
  contentType: string | null;
  contentLength: number | null;
  staticSource: string | null;
  exists: boolean;
  why?: string;
};

const map = loadStaticAudioMap();
const rows: Row[] = [];
const failures: Row[] = [];

for (const lesson of LESSONS) {
  lesson.paragraphs.en.forEach((para, paragraphIdx) => {
    const original = para.trim();
    if (!original) return;

    const normalized = normalizeStaticAudioKey(original);
    const generatedHash = getStaticAudioHash(original, "default");
    const mapUrl = map.default[normalized] ?? null;
    const mapHash = mapUrl?.match(/([a-f0-9]{32})/i)?.[1]?.toLowerCase() ?? null;

    const row: Row = {
      lessonId: lesson.id,
      paragraphIdx,
      original,
      normalized,
      generatedHash,
      mapUrl,
      mapHash,
      requestUrl: null,
      status: null,
      contentType: null,
      contentLength: null,
      staticSource: null,
      exists: false,
    };

    if (!mapUrl || !mapHash) {
      row.why = `map miss — normalized key not in static-audio-map.json (key=${normalized.slice(0, 80)})`;
      rows.push(row);
      failures.push(row);
      return;
    }

    if (mapHash !== generatedHash) {
      row.why = `hash mismatch — map has ${mapHash}, getStaticAudioHash(original)=${generatedHash}`;
      rows.push(row);
      failures.push(row);
      return;
    }

    row.requestUrl = `${BASE}/api/static-audio/${mapHash}.mp3`;
    rows.push(row);
  });
}

const concurrency = 8;
let cursor = 0;

async function worker(): Promise<void> {
  while (cursor < rows.length) {
    const idx = cursor++;
    const row = rows[idx]!;
    if (!row.requestUrl) continue;

    try {
      const res = await fetch(row.requestUrl, {
        headers: {
          "User-Agent": "AmyNest-LessonStaticValidate/1.0",
          "Cache-Control": "no-cache",
        },
      });
      const buf = Buffer.from(await res.arrayBuffer());
      row.status = res.status;
      row.contentType = res.headers.get("content-type");
      row.contentLength = buf.byteLength;
      row.staticSource = res.headers.get("x-amynest-static-source");

      const ok =
        res.status === 200 &&
        buf.byteLength > 2000 &&
        row.staticSource === "asset" &&
        /audio\/mpeg/i.test(row.contentType ?? "") &&
        isMp3(buf);

      row.exists = ok;
      if (!ok) {
        row.why = [
          `HTTP ${res.status}`,
          `content-type=${row.contentType ?? "?"}`,
          `bytes=${buf.byteLength}`,
          `x-amynest-static-source=${row.staticSource ?? "?"}`,
          isMp3(buf) ? "mp3-magic=ok" : "mp3-magic=FAIL",
        ].join("; ");
        failures.push(row);
      }
    } catch (err) {
      row.why = `fetch error: ${err instanceof Error ? err.message : String(err)}`;
      failures.push(row);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(
  `[validate-lesson-static-audio-live] base=${BASE} paragraphs=${rows.length} failures=${failures.length}`,
);

if (failures.length > 0) {
  console.error("\nLesson static audio live validation FAILED:\n");
  for (const f of failures.slice(0, 40)) {
    console.error(
      `  - ${f.lessonId}[${f.paragraphIdx}] ${f.why ?? "unknown"}\n` +
        `    original: ${f.original.slice(0, 100)}\n` +
        `    normalized: ${f.normalized.slice(0, 100)}\n` +
        `    hash: ${f.generatedHash}\n` +
        `    url: ${f.requestUrl ?? f.mapUrl ?? "(none)"}`,
    );
  }
  if (failures.length > 40) {
    console.error(`  … and ${failures.length - 40} more`);
  }
  process.exit(1);
}

console.log("Lesson static audio live validation: all paragraphs mapped + HTTP 200 MP3 asset.");
