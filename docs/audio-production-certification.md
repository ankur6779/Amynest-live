# AmyNest AI — Audio Production Certification (Final Release Gate)

**Date:** 2026-07-09  
**Role:** Principal Staff Engineer / Production QA Lead  
**Scope:** Audio Instant Playback sprint — release candidate gate  
**Architecture:** Unchanged (`Bundled → Memory → Filesystem/IDB → CDN → TTS → Fallback`)

---

## Executive verdict

| Decision | **NO-GO** (conditional) |
|----------|-------------------------|
| Risk level | **HIGH** until device matrix + missing curriculum assets close |
| Release confidence | **58%** |
| Store upload today? | **No** |
| Soft launch / internal TestFlight+Play internal? | **Yes**, with telemetry + device matrix as hard gate before public |

This is **not** an architecture failure. The sprint delivered the right hierarchy and many production controls. It is **not** yet proven on real devices, and several reliability gaps remain that will produce silent or delayed audio for parents at scale.

---

## 1. What was verified (this certification)

| Area | Method | Result |
|------|--------|--------|
| Core pack validate | `pnpm run validate:audio-pack` | **PASS** — tier=core, 569 mp3, 591 keys, 495 unique |
| Pack integrity | Hash / size / orphan scan | **PASS** — 0 tiny files, 0 orphans, maxDup=2, 15.9MB |
| Native sync | Source vs Android assets vs Capacitor www | **PASS** — identical tier/keys/`generatedAt` |
| Unit tests (audio) | 7 vitest files / 42 tests | **PASS** |
| Curriculum TTS gate | Code audit `forbidDynamicTts` | **PASS** (code) — device mix unproven |
| Watchdog 2s | Code audit `audio-manager` / FSM | **PASS** (code) |
| Unlock path | `guaranteeAudioUnlockedFromGesture` + silent buffer | **PASS** (code) |
| Prefetch / pre-decode | LZ + lessons + hub pointerdown | **PASS** (code) |
| Telemetry surface | `__amynestAudioReliability` | **PARTIAL** |
| Background learning pack | Code audit | **PARTIAL / WEAK** |
| Real device matrix | Manual / lab | **NOT RUN** |
| Source-mix production % | Live telemetry | **NOT MEASURED** |
| Failure simulation (call, BT, silent mode) | Lab | **NOT RUN** |
| 1000+ cache stress | Lab | **NOT RUN** |
| CPU/battery profiling | Lab | **NOT RUN** |

---

## 2. What passed

1. **Core hot pack** present and non-stub; synced to Android WebView assets + Capacitor `www`.
2. **Hierarchy preserved** — no AudioManager rewrite, no Howler, APIs backward compatible.
3. **Static-first curriculum policy** wired for phonics / spelling / lessons / catalog.
4. **2s audible-start watchdog** + FSM loading watchdog.
5. **Predictive memory window** + `ensureAudioPredecoded` on Learning Zone warm.
6. **Hub phonics intent warm** on `pointerdown`.
7. **CDN immutable headers** already on static audio serve (prior work).
8. **Automated unit coverage** for speech policy, local playback, recovery, telemetry, prefetch, boot orchestrator.

---

## 3. What failed / blocked

| ID | Finding | Severity |
|----|---------|----------|
| D1 | **Zero real-device latency evidence** (Android 10–15, iOS, browsers) | **BLOCKER** |
| D2 | **Source mix not measured** — cannot claim Bundled>70% / TTS&lt;1% | **BLOCKER** |
| M1 | **32 unique curriculum/common words missing** from static map (build reported 88 skips with category duplicates) | **P0** |
| B1 | Background pack: **no checksum, no corrupt recovery, no storage-full, no battery gate**; version stamped if `ok > 0` even when partial | **P0** |
| T1 | Telemetry schema **incomplete vs certification checklist** (see §4) | **P1** |
| N1 | “Filesystem” is **IndexedDB shim**, not Capacitor Filesystem; persistence under WebView memory pressure unproven | **P1** |
| N2 | Gradle `syncAudioPackAssets` not runnable here (no JDK); rsync used — **CI must enforce Gradle sync** | **P1** |
| F1 | Failure sims (phone call, BT disconnect, silent mode, process kill) **not executed** | **P0 for public** |
| P1 | Performance/battery profiling **not executed** | **P1** |

---

## 4. Telemetry audit (Phase 4)

### Present today

`audio_requested`, `audio_cache_hit/miss`, `audio_download_started/complete`, `audio_play_started/failed`, `audio_timeout`, `audio_cancelled`, `audio_recovered`, `audio_completed`, failure taxonomy, decode/play/network latency averages, `source_mix` + `tts_percent` in `latencyReport()`, visibility lifecycle counters.

### Missing / weak vs required checklist

| Required | Status |
|----------|--------|
| `audio_loaded` | Missing as named event (implied by download/cache) |
| `audio_decoded` | Trace steps only (`DECODE_START/END`), not first-class event |
| `audio_source` | Via `sourceLayer` — OK |
| `audio_latency_ms` | Via `latencyToFirstSoundMs` — OK |
| `watchdog_triggered` | Via `audio_timeout` / `PLAYBACK_WATCHDOG` — OK |
| `retry_count` | **Not first-class per request** |
| `playback_duration` | Partial / not consistently exported |
| `interrupted` | Lifecycle interrupts exist; not unified per play |
| `background_resume` / `foreground_resume` | Visibility events only — **not proven end-to-end** |
| Server/prod dashboard (country/version) | **Not built** — client console only |

**Dashboard accuracy:** Client `__amynestAudioReliability` is useful for QA; **not** a production analytics dashboard for hundreds of thousands of parents.

---

## 5. Missing assets (Phase 3) — 32 unique keys

Build “88 failed” = duplicate category attempts (spelling + phonics-word). **Unique missing from static map:**

### Must generate (curriculum / high-frequency) — **do not ship silent**

```
sat, pat, fox, mop, top, hop, pop, jet, fin, win, lip, zip, kid, lid,
mom, yes, car, love, home, hello, goodbye, please, thank you, sorry,
small, down, look, listen, say, read, write, draw
```

### Safe to ignore (for this gate)

- Letter keys that resolve via `LETTER_FOR` / alias (`a for apple`, etc.) — **already in pack**.
- Digraphs already downloaded where map hits exist.
- Auto-fill catalog keys that succeeded (majority of 569 clips).

### Must delete

- None required from pack (0 orphans).

### Action

Generate these 32 into `static-audio-map` + rebuild core pack **before public release**. Until then, those taps fall through to CDN miss / visual fallback / silence risk on native offline.

---

## 6. Background download validation (Phase 5)

| Scenario | Status |
|----------|--------|
| Wi‑Fi preferred | Implemented |
| Skip if version current | Implemented |
| Dedupe in-flight | Implemented |
| Skip unchanged URL (exists in IDB) | Implemented via `ensureFilesystemCachedFromUrl` |
| Interrupted resume | **Weak** — restarts list; no byte-range resume |
| Checksum / corrupt pack | **Missing** |
| Storage full | **Missing** |
| Low battery | **Missing** |
| Partial success stamps version | **BUG** — `if (ok > 0) setStoredLearningPackVersion` can mark complete with many fails |
| Rollback / cleanup old packs | **Missing** |

---

## 7. Cache / failure / native (Phases 6–9) — critical gaps

- **1000+ random stress:** not run → memory leak / LRU under pressure unknown.
- **Corrupt MP3 / 404 / 500:** unit paths exist; **device chaos not run**.
- **Phone call / BT / headphone / silent / screen lock:** not run — historically the #1 Android WebView silence class.
- **Android WebView pack:** synced (16MB). **Capacitor Android tree is not the Play Store app** — certify **`android/` WebView** only for Play.
- **iOS:** `www/audio-pack` synced; full `cap sync` + Xcode archive not run in this cert.
- **App update migration:** `AUDIO_ASSET_VERSION` / learning pack version exist; **update-from-previous-store-build not tested**.

---

## 8. Source mix targets (Phase 2) — expected vs reality

| Source | Target | Cert status |
|--------|--------|-------------|
| Bundled | >70% | **Unproven** — plausible for phonics letters/feedback after warm; **not** for full lessons |
| Memory | 15–25% | Unproven |
| Filesystem/IDB | 5–15% | Unproven |
| CDN | &lt;5% | Unproven — first open / cold lesson likely higher |
| Runtime TTS (educational) | &lt;1% | Code forbids; **must confirm with `latencyReport().source_mix` on devices** |

**Highlight:** Claiming Bundled>70% globally is **unsafe**. Lessons and long narration will remain CDN/static-proxy heavy. Rephrase production SLO:

- **Hot educational taps** (letters, feedback, spelling starters): Bundled+Memory ≥95%
- **All educational playback:** Dynamic TTS &lt;1%
- **CDN:** allowed for cold lesson paragraphs with prefetch SLA &lt;600ms

---

## 9. Production scores (Phase 12)

| Dimension | Score | Notes |
|-----------|------:|-------|
| Architecture | **88** | Hierarchy correct; no rewrite debt |
| Performance | **55** | Code paths good; **no device P50/P95/P99** |
| Reliability | **52** | Watchdog/unlock present; silence sims missing |
| Offline | **60** | Pack synced; missing 32 keys + weak BG pack |
| Native | **58** | Assets synced; IDB≠Filesystem; no JDK CI proof |
| Maintainability | **80** | Clear owners; frozen engines respected |
| Telemetry | **62** | Client strong; prod dashboard / schema gaps |
| **Overall** | **62** | Below release bar (need ≥85 with device evidence) |

---

## 10. Hidden risks (assume 100k+ parents)

1. **Android WebView autoplay / focus loss** after ads, calls, or multitasking → silent play despite unlock.
2. **Partial learning-pack version stamp** → app thinks offline-ready when not.
3. **Lesson paragraphs** with `forbidDynamicTts` + missing static → speechSynthesis / visual only → “Amy is silent” reports.
4. **16MB pack** under 20–40MB budget — OK for size; coverage still incomplete for CVC set.
5. **Duplicate content hashes (maxDup=2)** — low risk; monitor for stub regressions.
6. **Capacitor `www` full rebuild** can wipe rsync’d pack if `copy-www` runs from dist without pack — **release checklist must re-sync pack after web copy**.
7. **No production ingest** of `__amynestAudioReliability` → flying blind after launch.

---

## 11. Device certification matrix (Phase 1) — required before GO

Copy into QA tracker. Every cell needs P50 / P95 / P99 for cold / warm / replay + silence count.

### Android WebView (`android/` — Play Store)

| Device class | OS | Cold | Warm | Replay | BG→FG | Rapid tap | Offline | 3G | Pass? |
|--------------|----|------|------|--------|-------|-----------|---------|----|-------|
| Low-end | 10 | | | | | | | | |
| Low-end | 12 | | | | | | | | |
| Mid | 13 | | | | | | | | |
| Mid | 14 | | | | | | | | |
| Flagship | 15 | | | | | | | | |

### iOS Capacitor

| Device | iOS | Cold | Warm | Replay | BG→FG | Offline | Pass? |
|--------|-----|------|------|--------|-------|---------|-------|
| iPhone (prior) | n-1 | | | | | | |
| iPhone | latest | | | | | | |
| iPad | latest | | | | | | |

### Browsers

Chrome / Safari / Edge / Firefox — desktop + mobile where applicable.

**Pass criteria (per cell):**

- Bundled hot tap P95 &lt; 50ms  
- Cached P95 &lt; 100ms  
- First CDN P95 &lt; 600ms  
- Silent failure rate &lt; 0.1% over ≥200 taps  
- Educational TTS share &lt; 1% (`latencyReport().source_mix`)

---

## 12. Production analytics dashboard (Phase 10) — design only

Ship as **server-side** (or BigQuery/PostHog) ingest of existing client events — do not invent a second playback stack.

**Widgets:** success %, silent %, avg/P95/P99 latency, source mix, retry %, watchdog %, top missing/slow/failed assets, platform × app version × country.

**Minimum for public launch:** daily silent-failure alert if &gt;0.1% on Android WebView.

---

## 13. Files that still need modification (prioritized)

### P0 — before public release

1. Generate static audio for **32 missing keys** → update `static-audio-map.json` → `pnpm run build:audio-pack` → re-sync Android + iOS www  
2. `artifacts/kidschedule/src/lib/background-learning-pack.ts` — only stamp version when `fail === 0` (or fail ratio &lt; threshold); persist progress cursor  
3. Device matrix execution + attach `__amynestAudioReliability.latencyReport()` dumps  
4. Release checklist: **re-sync `audio-pack` after every Capacitor `copy-www` / kidschedule dist build**

### P1 — first week post soft launch

5. `native-audio-filesystem-cache.ts` — add checksum field; reject corrupt blobs  
6. Telemetry: first-class `retry_count`, `playback_duration`, unified interrupt/resume events  
7. CI job: `validate:audio-pack` + assert Android assets hash == source pack  
8. Production event sink for reliability dashboard  

### P2 — harden

9. Optional Capacitor Filesystem migration (same public API)  
10. Expand core pack toward 20–40MB after size QA  
11. Chaos suite (404/500/corrupt/call/BT) in Playwright where possible  

**Do not modify:** `audio-manager` ownership model, Howler introduction, pipeline rewrite.

---

## 14. Prioritized action list

1. **Generate 32 missing static clips** and rebuild/sync pack.  
2. **Fix learning-pack version stamp** on partial download.  
3. **Run Android WebView + iOS device matrix**; collect latency + source_mix.  
4. **Chaos:** airplane mode, kill network mid-play, background 30s, incoming call sim.  
5. **Wire CI pack sync hash check.**  
6. Soft launch → watch silent % 48h → public only if &lt;0.1%.  

---

## 15. Final GO / NO-GO

### NO-GO for public App Store / Play Store

**Reasons:** no device evidence, incomplete curriculum static coverage (32 keys), background pack correctness bug, telemetry/prod dashboard incomplete, failure simulations not run.

### Conditional GO for internal / closed testing

Allowed **only if**:

- Pack remains synced (already true as of 2026-07-09T15:42:30Z)  
- Testers capture `latencyReport()` on each device class  
- P0 #1–#2 fixed within the closed test window before widening  

### Risk level

**HIGH** for public · **MEDIUM** for closed testing after P0 asset generation.

### Release confidence

**58%** public · **72%** after P0 assets + pack rebuild · **85%+** only after device matrix green.

---

## Appendix A — Evidence snapshot

```
validate:audio-pack → OK tier=core mp3=569 entries=591 unique=495
source / android / ios-www → 16MB, keys=591, generatedAt=2026-07-09T15:42:30.814Z
vitest audio suite → 7 files, 42 passed
```

## Appendix B — Rollback

1. Revert client audio commits if regression.  
2. `pnpm run build:audio-pack:minimal` + re-sync if size/crash on low-end.  
3. `VITE_LOCAL_AUDIO_RECOVERY=0` debug only (disables bundled recovery — not for production).
