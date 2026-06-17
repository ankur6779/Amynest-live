# Phonics Audio Unification, Regeneration & Certification Audit

Scope: AmyNest phonics audio ecosystem (web + Capacitor iOS + Android WebView).
Goal: ONE unified ElevenLabs phonics voice; remove OpenAI from production phonics audio.

---

## 0. Executive summary & final verdict

**Verdict: PASS WITH FIXES.**

The runtime *playback* architecture is already sound: the phonics learning UI
(`AudioPlayButton mode="phonics"`) is **static-only** and never calls OpenAI or
live TTS on success or miss. The problem is **at-rest voice inconsistency**, not
runtime routing:

1. Two parallel asset systems coexist and BOTH serve phonics audio:
   - `phonics-audio-map.json` — **ElevenLabs** library (1,393 assets, voice `QbQKfe9vgx5OsbZUvlFv`).
   - `static-audio-map.json` — **OpenAI** static catalog (4,434 entries; 222 in the `phonics` bucket + ~118 phonics words in the `default` bucket), generated with OpenAI `coral`/`gpt-4o-mini-tts`.
   - The OpenAI catalog is used as a **fallback layer** behind the ElevenLabs library, so a child can hear two different voices for the same content.
2. The unified-TTS helper is misnamed: `generateOpenAiTts()` runs **ElevenLabs → OpenAI**, and `TTS_ELEVENLABS_FALLBACK_ENABLED` makes ElevenLabs *primary*. OpenAI is still wired as the **server fallback** on `/api/tts/stream` and worker jobs (`phonics.sound`).
3. Phoneme TTS text exists in **three** parallel tables with pedagogical conflicts (short-a and short-o both `"ah"`; voiced/unvoiced `th` identical; `w` missing from one map).
4. The curriculum stops at CVCC (Level 6). No long vowels, vowel teams, r-controlled vowels, diphthongs, schwa, silent letters, or trigraphs.
5. Caching is functional but has no TTL/size cap on the service-worker audio cache; native shells skip the SW entirely.
6. Predictive prewarm only fires *after* `/phonics` mounts — nothing warms phonics on Parent Hub or Smart Study entry.

### Production-readiness scorecard

| Dimension | Score /10 | Notes |
|---|---|---|
| Voice consistency | 4 | ElevenLabs library + OpenAI fallback served interchangeably; model mismatch (`flash` vs `turbo`). |
| Phoneme accuracy | 6 | Solid CVC/digraph base; a/o + th1/th2 collisions; `w` gap; soft-c untaught. |
| Educational quality | 6 | Good through CVCC; major scope gaps above L6. |
| Performance | 7 | Static-only playback, idle prefetch, CDN 1-yr immutable. |
| Caching | 6 | Works, but no SW TTL/cap; native shells lack SW. |
| Prewarm | 5 | Strong in-session warming; no hub→study→phonics prediction. |
| Maintainability | 5 | 3 phoneme-text systems + 2 asset maps + stale flags/comments. |
| Curriculum compliance | 5 | 7 levels; missing advanced phoneme categories. |
| **Weighted overall** | **5.5** | **PASS WITH FIXES** |

**Single highest-leverage fix:** regenerate the OpenAI phonics phrases on the
ElevenLabs voice (or remove them in favor of the ElevenLabs library), so only
one voice is ever served. This alone moves Voice Consistency 4 → 9.

---

## Phase 1 — Full audio inventory

### 1.1 Two parallel asset systems

| System | Manifest (dual-written) | Provider | Voice / model | Storage prefix | Served via |
|---|---|---|---|---|---|
| **Phonics library** | `artifacts/kidschedule/src/data/phonics-audio-map.json` + `artifacts/api-server/src/data/phonics-audio-map.json` | **ElevenLabs** | `QbQKfe9vgx5OsbZUvlFv` / shipped `eleven_turbo_v2_5` (code default `eleven_flash_v2_5`) | `phonics/{type}/{id}.mp3` | `GET /api/phonics-library/*` (`artifacts/api-server/src/routes/phonics-library.ts:41`) |
| **Static catalog** | `artifacts/kidschedule/src/data/static-audio-map.json` + `artifacts/api-server/src/data/static-audio-map.json` | **OpenAI** | `coral` / `gpt-4o-mini-tts` | `static-audio/{md5}.mp3` | `GET /api/static-audio/:hash.mp3` (`artifacts/api-server/src/routes/static-audio.ts:59`) |
| **Local pack** | `artifacts/kidschedule/public/audio-pack/` (+ Android assets) | Mirror of static catalog clips | n/a | `/audio-pack/{cat}/{slug}.mp3` | direct file (native recovery) |
| **DB** | `phonics_audio_assets` table (`lib/db/src/schema/phonics_audio_assets.ts:26`) | ElevenLabs (`source` col default `elevenlabs`) | — | mirrors library | seed/serve metadata |

### 1.2 Asset counts (current repo)

| Bucket / set | Count | Provider |
|---|---|---|
| `phonics-audio-map.json` assets (letter/digraph/blend/cvc/sight_word/sentence/quiz) | 1,393 | ElevenLabs |
| `static-audio-map.json` → `phonics` bucket | 222 | OpenAI |
| `static-audio-map.json` → `default` bucket (total) | 4,212 | OpenAI |
| ↳ of which phonics curriculum words (mode `default`) | ~99–118 | OpenAI |
| Spelling clips (`spelling/{v}/{slug}.mp3`) | manifest-sized | OpenAI |

### 1.3 Asset classification (Asset ID → provider)

There is **no per-entry provider/voice field** in `static-audio-map.json` (key→URL only). Classification must be inferred by location:

| Signal | OPENAI | ELEVENLABS | UNKNOWN |
|---|---|---|---|
| Map file | `static-audio-map.json` | `phonics-audio-map.json`, `phonics_audio_assets.source` | legacy `tts_cache` rows |
| URL pattern | `/api/static-audio/{32hex}.mp3` | `/api/phonics-library/phonics/...` | cached `/api/tts/audio/:key.mp3` |
| GCS path | `static-audio/{md5}.mp3` | `phonics/{cat}/{id}.mp3` | `tts/...` |
| Key style | lowercased speak text | `type:id` (e.g. `cvc:cat`) | hash |

> **Action:** add a `provider`/`voiceId`/`modelId` field to the static map schema
> (`lib/static-audio/src/types.ts:3`) during regeneration so future audits are deterministic.

### 1.4 Generation methods

| Asset set | Command / script | Provider |
|---|---|---|
| Phonics library | `pnpm run generate:phonics-library` → `scripts/generate-phonics-library.ts` | ElevenLabs |
| OpenAI phonics phrases | `pnpm run generate:static-audio:phonics-static` → `scripts/generate-static-audio.ts --phonics-static-only` | OpenAI |
| Full static catalog | `pnpm run generate:static-audio` → `scripts/generate-static-audio.ts` | OpenAI |
| Spelling | `pnpm run generate:spelling-audio` → `scripts/generate-spelling-audio.ts` | OpenAI |
| Legacy local phoneme clips | `scripts/generate-phonics-audio.ts` (deprecated; `public/phonics-audio/`) | ElevenLabs |
| Corpus scan | `pnpm run scan:speakable-phrases` → `scripts/scan-speakable-phrases.ts` | n/a |

---

## Phase 2 — Phoneme curriculum audit

### 2.1 Three parallel phoneme-text systems (root cause of inconsistency)

| Pipeline | Source | Vowel style | Consonant style | When used |
|---|---|---|---|---|
| **MP3 generation** | `ELEVENLABS_SPEAK_TEXT` (`lib/phonics-sounds/src/phonics-generation.ts:34`) | `ah/eh/ih/uh` | `k.`, `sss`, `mmm` | building static clips |
| **Instructional TTS** | `PHONICS_SOUNDS`/`PHONEME_AUDIO` (`lib/phonics-sounds/src/index.ts:16`, `cvc.ts:14`) | `"a as in apple"` | bare `k`, `b` | `getPhonicsAudioText()` |
| **Browser fallback** | `SPEECH_SYNTH_PHONEME_TEXT` (`phonics-generation.ts:110`) | `ah/eh` | `buh/kuh/ssss` | emergency `speechSynthesis` |

### 2.2 Confirmed pedagogy defects (remediation list)

| # | Defect | Location | Fix |
|---|---|---|---|
| P1 | short-a and short-o both generated from `"ah"` | `phonics-generation.ts:35,49` | distinguish `o → "o as in octopus"` short-o sample on regen |
| P2 | voiced/unvoiced `th` both `"thh"` (`th1`/`th2`) | `phonics-generation.ts:64-65` | split: `th` (unvoiced, thin) vs `dh` (voiced, this) |
| P3 | `w` absent from `PHONEME_AUDIO`; `win` blend uses unmapped `w` | `cvc.ts:14-34` vs `cvc.ts:79` | add `w` (and `j,v,z`) to `PHONEME_AUDIO` |
| P4 | `y` label `/dʒ/` documented but audioText is `"y"` | `index.ts:46` vs `dataset.ts:40` | reconcile to consonant `/j/` (yak) |
| P5 | `getPhonemeSequence` omits `ck`,`qu` as units | `dataset.ts:97` | add `ck`,`qu` to digraph splitter |
| P6 | bare `"w"`/`"y"` risk letter-name read in non-MP3 path | `index.ts:44-46` | guard already exists for MP3; extend to instructional path |
| P7 | dual `getPhonicsAudioText` + dual word-finale format | `index.ts:148` vs `cvc.ts:133`; `index.ts:191` vs `cvc.ts:142` | collapse to one helper |
| P8 | sight-word sets differ (5 vs 8) | `constants.ts:2` vs `audio-catalog.ts:91` | single source |

### 2.3 Curriculum coverage (7 levels — `lib/phonics-curriculum/src/levels.ts:43`)

L1 letter sounds · L2 CVC · L3 word families (at/an/og/in/ip) · L4 digraphs (sh/ch/th/wh/ck/ng) · L5 consonant blends · L6 CVCC · L7 fluency + stories (~203 decodable stories).

**Missing categories (curriculum gaps):** long vowels (CVCe / vowel teams), r-controlled vowels (ar/or/er/ir/ur), diphthongs (oi/ou/ow), schwa, silent letters (kn/wr/mb), trigraphs (igh/tch/dge), soft-c / soft-g as taught units, final stable `-le`. These require new curriculum levels **and** new catalog + audio entries.

---

## Phase 3 — ElevenLabs voice certification

**Canonical voice:** keep `QbQKfe9vgx5OsbZUvlFv` (Ananya K, English-Indian female) — already the production Amy + library voice, so reuse minimizes regeneration drift and matches the rest of the app. Lock it in `lib/static-audio/src/amy-tts-config.ts:7` and `lib/phonics-sounds/src/phonics-generation.ts:192`.

**Model:** standardize on `eleven_flash_v2_5` everywhere. The shipped `phonics-audio-map.json` says `eleven_turbo_v2_5`; the code default is `eleven_flash_v2_5` — pick one (recommend `flash_v2_5` for latency + cost) and regenerate so manifest == config.

**Recommended phonics-tuned voice settings** (per generation mode):

| Setting | Isolated phonemes | Words / blending | Sentences / stories | Why |
|---|---|---|---|---|
| stability | 0.55 | 0.50 | 0.45 | high enough for repeatable phoneme identity, low enough to avoid robotic vowels |
| similarity_boost | 0.80 | 0.80 | 0.75 | preserve one consistent Amy identity across all assets |
| style | 0.0 | 0.05 | 0.20 | phonemes need neutral articulation; stories need mild expression |
| speed | 0.85 | 0.90 | 0.95 | slow, deliberate for decoding; near-natural for fluency |
| use_speaker_boost | true | true | true | clarity/intelligibility on small device speakers |

Use **deterministic seed** per asset (hash of `mode\0text`) so re-runs are reproducible.

---

## Phase 4 — Phonics speech generation rules

Phonics is educational synthesis, not narration. Prompt templates per mode (drive `ELEVENLABS_SPEAK_TEXT` + generation flags):

- **LETTER SOUND** → emit the *phoneme*, never the letter name. `a → /a/` ("ah"), `b → /b/` (clipped "b", no schwa "buh"), `c → /k/`. Settings: stability 0.55, style 0, speed 0.85. QA: reject any clip whose duration suggests a letter-name read or a trailing schwa.
- **WORD** → natural blended pronunciation of e.g. `cat` (`/k/–/a/–/t/` blended, not over-segmented). speed 0.90.
- **BLENDING** → sequence assets: `/s/ … /a/ … /t/ … /sat/`. Generate each phoneme as its own clip; the runtime queue (`phonicsEnginePlayCvcBlend`) stitches them.
- **SEGMENTING** → `ship → /sh/ /i/ /p/`; ensure digraph `sh` is one unit (fix P5 splitter for `ck`,`qu`).
- **DECODABLE STORY** → expressive but phoneme-clear; style 0.20, speed 0.95; keep highlight-word timing alignable.

Encode these as a `mode → {stability, style, speed, similarity, instructions}` table in `scripts/phonics-audio-gcs.ts` so every generator path shares one rule set.

---

## Phase 5 — Full regeneration & migration plan

**Assets to regenerate/remove:** all 222 OpenAI `phonics`-bucket entries + ~118 phonics words in the `default` bucket; re-cut the 1,393 ElevenLabs library assets to the single locked model; defect fixes P1–P5 force-regenerate affected phonemes.

**Sequencing (safe, backward-compatible):**

1. **Add provider metadata** to `static-audio-map.json` schema (`lib/static-audio/src/types.ts:3`) — no behavior change.
2. **Regenerate the ElevenLabs library** at the locked model: `pnpm run generate:phonics-library -- --force`; verify with `pnpm run check:phonics-library`. (Hash/keys stable → URLs unchanged → zero broken links.)
3. **Move OpenAI phonics phrases to ElevenLabs.** Two options:
   - *Option A (lowest risk):* retool `scripts/generate-static-audio.ts` so the `--phonics-static-only` path calls ElevenLabs. Same `md5(mode\0text)` keys → same `/api/static-audio/{hash}.mp3` URLs → audio is overwritten in place, no reference changes.
   - *Option B (cleaner long term):* add the missing phrases to the phonics library catalog and drop the static-map fallback in `phonics-static-audio.ts:54-72`.
4. **Remove OpenAI runtime fallback for phonics:** gate `phonics.sound` worker and `/api/phonics/sound/:letter.mp3` (`artifacts/api-server/src/routes/phonics.ts:1315`) so they never resolve to OpenAI hashes; keep general-app OpenAI fallback if desired, but exclude `category: "phonics"`.
5. **Purge stale OpenAI phonics clips** from `tts_cache`/GCS only *after* the new clips are verified live.
6. **Rebuild local pack + native bundles** (`pnpm run build:audio-pack`, Capacitor `www`, Android assets).

**Risk analysis:**

| Risk | Likelihood | Mitigation |
|---|---|---|
| Broken links from regen | Low | keys are content-addressed; overwrite in place |
| Two voices during rollout | Med | regenerate library first, then static phrases same-day; keep both as same voice |
| CDN serves old OpenAI clip (1-yr immutable) | **High** | bump SW `AUDIO_CACHE_NAME` + cache-bust query/version on hash collision-free re-cut; or new hash namespace |
| Cost spike (ElevenLabs char volume) | Med | batch + cache; flash model; one-time backfill |

**Rollback:** keep the previous `static-audio-map.json` + GCS objects until certification passes; revert by restoring the manifest copies and the SW cache name. Because keys are stable, rollback is a manifest + cache-name revert, not a data migration.

---

## Phase 6 — Audio normalization

Standardize every clip (set in the generator, not post-hoc):

| Param | Value | Rationale |
|---|---|---|
| Container/codec | MP3 (CBR) | universal, WKWebView/WebView friendly |
| Sample rate | 44.1 kHz | ElevenLabs default; consistent |
| Bitrate | 128 kbps | clarity vs size for speech on mobile |
| Loudness | −16 LUFS (mono-aware) | consistent perceived volume across assets |
| Peak ceiling | −1 dBTP | avoid clipping on device speakers |
| Leading/trailing silence | trim to ≤ 80 ms | tight phoneme onset for blending |
| Channels | mono | speech; halves size |

Enforce with an ffmpeg normalization pass in `scripts/phonics-audio-gcs.ts` after synthesis and add a `check:audio-normalization` gate (duration + loudness bounds) alongside `check:phonics-library`.

---

## Phase 7 — Prewarm architecture

**Current state:** predictive prewarm only runs *after* `/phonics` mounts (`phonics.tsx:100` → `warmPhonicsRouteOnOpen`; `PhonicsV2.tsx:183` idle pack). Parent Hub and Smart Study `/study` warm everything *except* phonics. The prefetch target (`practiceWords` = first 6 display items, `PhonicsV2.tsx:145`) does **not** match the adaptive mission/curriculum target.

**Proposed Prewarm Manager (hub → study → phonics):**

1. **On Parent Hub mount** (`pages/parenting-hub.tsx:947`): compute the child's "next phonics" locally from cached mastery (same inputs as `DailyMissionPanel` → `buildAdaptiveDailyMission`), then capped-prefetch: next mission words + `unlockedStories[0]` lines + current-level phoneme pack. Reuse `prefetchOfflinePhonicsPack({ missionWords, storyIds:[nextStoryId] })`.
2. **On Phonics hub tile pointerdown** (`HubLaunchCard`): mirror the mobile-menu pattern (`layout-mobile-menu-sheet.tsx:77`) — `prefetchRouteChunk("/phonics")` + tier-1 phoneme prefetch.
3. **Route adjacency**: add `/phonics` + `/study` to `LIKELY_NEXT_ROUTES["/parenting-hub"]` (`route-chunk-preload.ts:113`).

**Rules:** predictive (mastery-derived, not blanket); honor `navigator.connection.saveData` and performance tier to skip on slow/data-saver; cap to tier-1 (≈ 40 phonemes / next mission words / 1 story) before route entry; full library warm stays deferred to route mount.

**Cache strategy:** IndexedDB blob (instant replay) + `link rel=prefetch` (browser cache) + SW precache for the boot set. **Eviction:** existing LRU (IndexedDB 80/50 MB; memory 120). **Retry:** add one bounded retry to `warmLocalCacheFromUrl` (`local-tts-cache.ts:165`, currently fire-and-forget) gated by the phonics circuit breaker.

---

## Phase 8 — Audio cache certification

| Layer | File | TTL | Limit | Eviction | Gap |
|---|---|---|---|---|---|
| SW Cache API `amynest-audio-v2` | `public/sw.js:16` | **none** | **none** (quota only) | legacy v1 delete; bad-206 purge | add max-entries + age cap |
| IndexedDB `amynest_amy_voice_cache` | `local-tts-cache.ts:13` | none | 80 / 50 MB | LRU `updatedAt` | OK; add TTL optional |
| In-memory decoded | `global-audio-warmup.ts:43` | none | 120 (+pins) | LRU unpinned | OK |
| AudioManager URL cache | `audio-manager.ts:89` | none | 20 | LRU | OK |
| CDN/API HTTP | `services/staticAudioServe.ts:4` | **1 yr** + SWR 1 day, `immutable` | — | n/a | needs cache-bust plan on regen |
| Local pack | `audio-pack/` | none | manifest-sized | rebuild | native fallback only |

**Platform matrix:** PWA = SW + IndexedDB + CDN; **Capacitor iOS & Android WebView SKIP the service worker** (`native-shell.ts:122`) → offline replay relies on IndexedDB (80/50 MB) + bundled `audio-pack/` + WebView HTTP cache.

**Recommended production policy:** SW audio cache → max ~600 entries, soft age cap 30 days, LRU trim on `activate`; bump `AUDIO_CACHE_NAME` whenever assets are regenerated (this is the cache-bust lever against the 1-yr immutable CDN entries); keep IndexedDB caps; ensure native bundles ship a current `audio-pack/` for offline.

---

## Phase 9 — Content consistency audit

| Surface | Audio source today | Single voice? |
|---|---|---|
| Letter/word/sentence tiles (`AudioPlayButton mode="phonics"`) | library → static catalog fallback | **No** (catalog is OpenAI) |
| Decodable stories | library sentence clips → static fallback | No (fallback OpenAI) |
| CVC blending | library phoneme clips | Yes (library) |
| Games (Find Family, etc.) | library/static | No (fallback OpenAI) |
| Worksheet / assessment lines | static catalog (OpenAI) | No |
| Phonics test preload | `/api/tts/generate` (OpenAI worker) | No — leak |

**OpenAI leak points to close for "no fallback to OpenAI":**

1. `artifacts/api-server/src/services/ttsGenerate.ts:105` — OpenAI after ElevenLabs (exclude `category:"phonics"`).
2. `artifacts/api-server/src/routes/tts.ts:614` — `/api/tts/stream` OpenAI fallback.
3. `artifacts/api-server/src/services/staticAudioGeneration.ts:22` — runtime miss → OpenAI.
4. `scripts/generate-static-audio.ts` / `generate-spelling-audio.ts` — OpenAI generators.
5. `artifacts/kidschedule/src/lib/phonics-static-audio.ts:59-72` — runtime fallback to OpenAI static phonics clips.
6. `artifacts/api-server/src/routes/phonics.ts:1315` — `/api/phonics/sound/:letter.mp3` redirect to OpenAI hashes.
7. `artifacts/kidschedule/src/components/phonics-test.tsx:65` — live `/api/tts/generate` preload.
8. `artifacts/api-server/src/routes/health.ts:224` — probes OpenAI TTS (reporting only).
9. Stale signal: `getTtsProvider()` returns `"openai"` with an inverted comment (`lib/.../env.ts:113`) — fix the comment/return to reflect ElevenLabs-primary.

**Minor runtime-synthesis leak (ElevenLabs, not OpenAI):** `amy-voice-pipeline.ts:1815-1836` can call `/api/tts/elevenlabs-fallback` when a static phrase exists but playback failed; affects `phonics-test.tsx` and speech-coach phonics lines, **not** the certified `AudioPlayButton` path. Add a `forcePhonicsOnly` guard there.

---

## Phase 10 — Final certification (deliverables)

1. **Audio asset inventory** → Phase 1 (1,393 ElevenLabs + 222/~118 OpenAI phonics; classification by location).
2. **Curriculum mapping** → Phase 2.3 (7 levels; gaps above L6).
3. **Phoneme accuracy** → Phase 2.2 (defects P1–P8 with file:line).
4. **Voice consistency** → Phase 9 (mixed providers served; 9 OpenAI leak points).
5. **OpenAI removal** → Phase 5 + Phase 9 (regen/retool + close 9 leaks).
6. **ElevenLabs migration** → Phase 5 (sequencing, risk, rollback).
7. **Prewarm architecture** → Phase 7 (hub-entry predictive prewarm).
8. **Cache architecture** → Phase 8 (SW TTL/cap + cache-bust on regen).
9. **Risk report** → Phase 5 risk table (CDN immutable = highest).
10. **Production readiness** → §0 scorecard, weighted 5.5/10.

**Final verdict: PASS WITH FIXES.** Blocking items before "PASS": (a) one served voice — regenerate/retool the OpenAI phonics phrases on ElevenLabs; (b) close phonics OpenAI leaks #1–#7; (c) align library model `turbo`→`flash`; (d) cache-bust plan for the 1-yr immutable CDN. Non-blocking but recommended: defects P1–P8, hub-entry prewarm, SW cache TTL/cap, and the L7+ curriculum expansion.
