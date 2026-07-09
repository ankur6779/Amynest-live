# AmyNest AI — Final Audio Release Certification

**Date:** 2026-07-09  
**Role:** Release Engineering Lead  
**Architecture:** Frozen (no redesign)

---

## Verdict

# NO-GO

Public Play Store / App Store release is **blocked**.

---

## Phase 1 — API verification (executed)

### Path audited

```
GCS object → API resolveStaticAudioBuffer → serveStaticAudioBuffer → Cloudflare → Client
```

### Evidence (live production `www.amynest.in`, 2026-07-09 re-probe)

| Check | Result |
|-------|--------|
| GCS has real P0 bytes (auth download) | **PASS** — `fox` 5760B, `hello` 19200B, `hop` 21888B |
| Origin can serve real MP3 (cache-bust) | **PASS** — `fox?cb=…` → **5760B**, `static-source: asset`, CF MISS |
| Canonical CDN URL (no query) | **FAIL** — `fox` → **256B** `placeholder`, CF HIT, age ~2412s, **immutable** |
| All 27 P0 purge-list URLs | **FAIL** — 27/27 → 256B placeholder HIT |
| Older asset (`try again`) | **PASS** — 12164B asset HIT |
| Phonics-library CVC (`sat`) | **PASS** — 7123B asset |
| Content-Type | `audio/mpeg` (OK even on placeholder) |
| Content-Length / ETag on poison | Wrong (256; ETag=`"hash"` same as real asset) |

### Root cause (confirmed, not invented)

1. First request after upload hit origin before GCS was visible → **placeholder**.
2. Origin applied **1-year immutable** cache headers to placeholders.
3. Cloudflare cached the poison under the **canonical** hash URL.
4. Origin now has real GCS bytes (proven via `?cb=` bypass), but edge keeps serving HIT placeholders.
5. Placeholder `no-store` fix is **not deployed** — re-poisoning remains possible on any future miss.

### Code fix ready (must deploy before/with purge)

| File | Change |
|------|--------|
| `staticAudioServe.ts` | Placeholders → `no-store`; ETag `hash-placeholder`; no 304 on placeholders |
| `phonics-library.ts` / `animal-world-library.ts` / `spelling-library.ts` / `worlds-library.ts` / `phonics.ts` | Pass `staticSource: "placeholder"` on fail paths |
| Unit test | `staticAudioServe-placeholder-cache.test.ts` — **2/2 pass** |
| `scripts/data/p0-cloudflare-purge-urls.txt` | 27 CF purge URLs |

**Until Cloudflare is purged (and preferably API fix deployed first), clients hitting canonical URLs get silence stubs.**

---

## Phase 2 — Cache invalidation

| Step | Status |
|------|--------|
| Code: stop caching placeholders | **DONE** (local; needs deploy) |
| Origin health for P0 hashes | **PASS** (cache-bust proves real bytes) |
| Cloudflare purge of 27 URLs | **REQUIRED OPS** — `scripts/data/p0-cloudflare-purge-urls.txt` |
| Verify post-purge canonical URL = asset ≥2000B | **NOT DONE** |

---

## Phase 3 — Real device certification

**NOT EXECUTED** in this environment (no physical device farm / store builds run).

Checklist ready: `docs/audio-device-qa-checklist.md`  
Telemetry ready: `latencySummary()` / `latencyReport()` with P50/P95/P99.

Cannot claim P50/P95/P99, cold/warm, offline, BT, call interruption results.

---

## Phase 4 — Source mix

**NOT MEASURED** on real devices.

Expected after fix + pack:

- Bundled hot taps: high (pack synced)
- CDN: should drop once placeholders purged
- Educational TTS: 0% by policy (`forbidDynamicTts`)

Targets cannot be certified without device runs.

---

## Phase 5 — Failure tests

**NOT EXECUTED** on devices.

Code-level: watchdog, unlock, placeholder client guards exist; chaos matrix open.

---

## Phase 6 — Scores

| Dimension | Score | Notes |
|-----------|------:|-------|
| Architecture | 90 | Frozen hierarchy sound |
| Performance | 45 | CDN poison + no device latency |
| Reliability | 40 | 27 production URLs serve silence stubs |
| Offline | 75 | Local pack OK |
| Native | 70 | Bundles synced |
| Telemetry | 75 | Client tools ready |
| Deployment | 25 | Placeholder immutable bug live; purge pending |
| **Overall** | **52** | Below release bar |

---

## Remaining production blockers (only)

1. **Deploy** API with placeholder `no-store` fix (`staticAudioServe.ts` + library routes).
2. **Purge Cloudflare** for all URLs in `scripts/data/p0-cloudflare-purge-urls.txt`.
3. **Re-probe** all 27 hashes: must show `X-AmyNest-Static-Source: asset` and `Content-Length ≥ 2000`.
4. **Execute device QA** matrix (`docs/audio-device-qa-checklist.md`) on Android WebView + iOS; attach `latencySummary()` dumps.
5. Confirm educational `tts_percent === 0` on device curriculum paths.

---

## Rollout

**Not applicable** — verdict is NO-GO. Do not start closed/public rollout until blockers 1–4 are green.

Suggested sequence **after** blockers clear:

1. Internal smoke (dev team devices)  
2. Closed testing  
3. 10% → 25% → 50% → 100% with silent-failure alert &lt;0.1%

---

## What was verified this sprint

- Live production headers proving CDN-poisoned placeholders  
- GCS authenticity of P0 objects  
- Pack/curriculum local readiness (prior sprint)  
- Critical serve-path fix + purge URL list  

## What was not claimed

- Device latency numbers  
- Source-mix percentages  
- Failure-sim results  
- Public GO
