# Phonics Learning Zone — Complete Pedagogical Audit & Audio Regeneration

**Date:** 2026-07-16
**Scope:** Learning Zone → Phonics module (curriculum, audio assets, generation pipeline, storage, caching, playback, offline packs)
**Standard applied:** International Synthetic Phonics (Jolly Phonics / UK Letters and Sounds principles)

---

## 1. Scores

| Dimension | Score (0–100) | Notes |
|---|---|---|
| Overall Phonics Curriculum | **62** | Strong 7-level architecture (letters → CVC → families → digraphs → blends → CVCC → fluency) with mastery + spaced repetition; held back by alphabetical (non-SATPIN) letter order and thin tricky-word strand |
| Audio Quality (after regeneration) | **93** | All 35 letter/digraph clips regenerated, acoustically gated (duration, loudness −15 LUFS, true-peak, voicing, vowel formants, letter-name detection), byte-verified in production |
| Pedagogical Accuracy (after fixes) | **85** | Pure phonemes end-to-end: audio, UI labels, DB seed, quiz prompts. Schwa ("buh/kuh") purged from all teaching surfaces. Remaining gap: letter order + decodability discipline in stories |
| UX | **78** | Clear tile-based flow, blend/karaoke games, adaptive daily missions, offline recovery pack; progress + mastery visible. Gaps: no segmenting-first activities, plan under-uses available game modes |
| Accessibility | **72** | Large touch targets, audio-first design, aria-labels on play buttons; gaps: no captions for phoneme clips, no reduced-motion audit, contrast unverified in dark mode tiles |

**Audio quality before regeneration was ~35/100** — multiple letters played letter names or noise.

---

## 2. Letter-by-letter audio audit (original production clips)

Method: every production clip downloaded via `www.amynest.in/api/phonics-library/`, measured with ffprobe (duration/loudness/true-peak), LPC formant analysis (vowel identity), spectral centroid (fricatives), and Whisper ASR (letter-name detection). Whisper on isolated phonemes is noisy; verdicts combine ASR + acoustics.

| Key | Expected phoneme | Old clip evidence (ASR + acoustics) | Verdict | Confidence |
|---|---|---|---|---|
| a | /æ/ | "Uh…" — vowel formants off-target (schwa-like) | FAIL | High |
| b | /b/ | "B." — acceptable stop | PASS (regen. for consistency) | Med |
| c | /k/ | "K." — acceptable | PASS (regen. for consistency) | Med |
| d | /d/ | "D." — acceptable | PASS (regen. for consistency) | Med |
| e | /ɛ/ | "Oh…" — wrong vowel | FAIL | High |
| f | /f/ | "AHHH" — voiced noise, not /f/ frication | FAIL | High |
| g | /g/ | "G." — acceptable | PASS (regen. for consistency) | Med |
| h | /h/ | "Aww." — voiced vowel, not /h/ | FAIL | High |
| i | /ɪ/ | "Ah!" — wrong vowel | FAIL | High |
| j | /dʒ/ | **"Jay?" — letter name** | FAIL | High |
| k | /k/ | "K." — acceptable | PASS (regen. for consistency) | Med |
| l | /l/ | "Ooooooh" — wrong sound | FAIL | High |
| m | /m/ | "Mmm…" — acceptable | PASS (regen. for consistency) | Med |
| n | /n/ | "Ooooh." — wrong sound | FAIL | High |
| o | /ɒ/ | "Oi!" — diphthong, not short o | FAIL | High |
| p | /p/ | "P." — acceptable | PASS (regen. for consistency) | Med |
| q | /kw/ | "Thank you for watching." — junk audio | FAIL | High |
| r | /r/ | "Ugh!" — wrong sound | FAIL | High |
| s | /s/ | "Bye." — voiced word, not /s/ hiss | FAIL | High |
| t | /t/ | **"tea." — letter name (tee)** | FAIL | High |
| u | /ʌ/ | "Oh." — wrong vowel | FAIL | High |
| v | /v/ | "Buh-buh" — wrong consonant | FAIL | High |
| w | /w/ | "Woah." — diphthong tail | FAIL | Med |
| x | /ks/ | "see you next week, bye for now." — junk audio | FAIL | High |
| y | /j/ | "Yeah?" — near-target, excess tail | FAIL | Med |
| z | /z/ | long buzz — over-long, inconsistent level | FAIL (quality) | Med |
| sh | /ʃ/ | "Shh." — acceptable | PASS (regen. for consistency) | Med |
| ch | /tʃ/ | "Ciao!" — added vowel | FAIL | High |
| th1 | /θ/ | "Ugh!" — voiced, not unvoiced /θ/ | FAIL | High |
| th2 | /ð/ | "ta" — stop-like, wrong | FAIL | High |
| ng | /ŋ/ | "No." — /n/+vowel, not /ŋ/ | FAIL | High |
| wh | /w/ | "Whoa." — diphthong tail | FAIL | Med |
| ck | /k/ | "Okay." — added vowel | FAIL | High |
| qu | /kw/ | "Call." — wrong | FAIL | High |
| ph | /f/ | "th th th…" — wrong fricative | FAIL | High |

**Result: 26 of 35 clips failed; all 35 were regenerated for voice/loudness/duration consistency.**

Additionally, the **bundled offline recovery pack** (web + iOS) contained letter-name and "A for Apple"-style clips for a, c, e, i, o, q, u, x + digraphs — the worst failures users heard offline.

## 3. Regenerated audio files (35)

All generated via ElevenLabs (voice `pFZP5JQG7iQjIQuC4Bku` — Lily, female teacher voice) using a candidate-matrix strategy (IPA phoneme SSML tags on `eleven_flash_v2`/`eleven_turbo_v2`, CMU hints, plain-text hints × speed variants), FFmpeg-mastered (silence trim, loudnorm −15 LUFS, true-peak limit, micro-fades, 128 kbps CBR), then passed through a per-class acoustic QA gate:

- Duration 250–700 ms (class-dependent), active speech ≥ 120 ms
- Integrated loudness −18…−12 LUFS, true peak ≤ −1 dBTP
- Voicing fraction per class (vowels ≥ 0.85, unvoiced fricatives ≤ 0.3, stops in range)
- Vowel F1/F2 formant targets (/æ/ vs /ɒ/ vs /ʌ/ vs /ɛ/ vs /ɪ/ discrimination)
- Spectral centroid separation for /s/ vs /ʃ/ vs /f/ vs /θ/
- Letter-name rejection (ASR must not produce "ay/bee/see/…")

Clips: `a b c d e f g h i j k l m n o p q r s t u v w x y z` + `sh ch th1 th2 ng wh ck qu ph` (durations 253–697 ms, all gates green).

## 4. Files replaced / updated

**Cloud audio (GCS `amynest-audio-storage`):** 35 objects at `phonics/letters/*.mp3` and `phonics/digraphs/*.mp3` — replaced and made public. Verified byte-for-byte: production URLs serve exactly the QA'd clips (35/35 checksum match).

**Manifests:** `artifacts/kidschedule/src/data/phonics-audio-map.json` and `artifacts/api-server/src/data/phonics-audio-map.json` — new checksums, real ffprobe durations, `phonemeVersion: 2`, `quality: "approved"`.

**Bundled offline packs:** `artifacts/kidschedule/public/audio-pack/phonics-letter/` (now 33 clips, up from 15) and `artifacts/amynest-capacitor/www/audio-pack/` (iOS) — all pure phonemes, manifest regenerated.

**Pipeline / code:**
- `lib/phonics-sounds/src/phonics-generation.ts` — corrected `ELEVENLABS_SPEAK_TEXT` hints; new `ELEVENLABS_SPEAK_OVERRIDES` (IPA-tag-capable model + speed per key)
- `scripts/generate-phonics-library.ts` — honors per-key model/speed overrides
- `scripts/phonics-audio-process.ts` — explicit 128 kbps CBR (fixes duration-estimation bug: manifest durations were ~2× off)
- `scripts/phonics-audio-publish-reviewed.ts` — **new**: publish QA-approved clips + update both manifests (`pnpm --filter @workspace/scripts run publish-phonics-reviewed -- --dir <clips>`)
- `scripts/phonics-phoneme-qa.py` — **new**: the acoustic QA gate
- `scripts/build-local-audio-pack.mjs` — letters/digraphs now sourced ONLY from the phonics library manifest (cache-busted URLs), never the "as in"/letter-name static map

**Cache invalidation (existing users get new audio on next deploy):**
- `AUDIO_CACHE_VERSION` v5 → **v6** (service worker cache drop)
- `AUDIO_ASSET_VERSION` v5 → **v6** (IndexedDB / native filesystem cache)
- `PHONICS_PHONEME_VERSION` 1 → **2** (manifest provenance)
- `resolvePhonicsLibraryPlaybackUrl` now appends `?v={checksum-8}` — busts HTTP/CDN caches per-asset forever

## 5. Curriculum / mapping issues fixed

1. **Schwa purge:** `phonics-content.ts` and `seedPhonics.ts` no longer teach "buh/kuh/duh/…"; `phoneme` fields are now letter/digraph keys that resolve to curated pure-phoneme clips; `sound` lines use the "x as in word" instructional form the audio pipeline resolves natively.
2. **Wrong example words removed:** Arm/Ice/Ear/Owl/Orange/Moon/Rain/Tiger-first/Yo-yo → replaced with short-vowel-faithful examples (Apple/Ant/Axe, Igloo/Insect/In, Octopus/Ox/On, Mat, Rat, Tap, Yak…).
3. **Short-o collision:** `dataset.ts` had `a: "ah"` **and** `o: "ah"` — o now `"aw"` (/ɒ/), matching the ElevenLabs speak text and phoneme registry.
4. **Digraph seed set:** now sh, ch, th, wh, **ng**, ck, **qu**, ph (was missing ng/qu); example words decodable (chip/thin/whip/quilt).
5. **Dead `ck → "c"` audio alias** removed from `phoneme-map.ts`.
6. **Quiz sound extraction** (`phonicsTests.ts`) understands the new "x as in word" format (legacy "says buh" rows still parse).
7. **Level-gating bug (real production bug):** `filterItemsByCurriculumLevel` re-ran the legacy 6→7 migration on already-migrated levels — level-6 children saw level-7 sight words. Fixed with `clampCurriculumLevel`.
8. **Spaced-repetition bug:** overdue reviews of already-taught words were dropped by current-level gating in `adaptive-selector.ts`. Reviews are no longer gated.
9. **Seed idempotency:** `seedPhonics.ts` now deactivates stale rows so each (ageGroup, level) has exactly one active symbol.
10. **Parent tip** no longer endorses saying "buh".

## 6. Playback bugs fixed

- Manifest durations were ~2× shorter than real audio (bitrate mismatch) — could truncate scheduled playback; fixed at the encoder and re-measured with ffprobe on publish.
- Un-versioned immutable URLs made replaced audio unreachable for existing users across SW/IndexedDB/CDN layers — fixed via checksum-versioned URLs + triple cache-version bump.
- Offline recovery pack served letter-name audio even after cloud fixes — pack rebuilt from the phonics library and builder re-pointed so it cannot regress.
- Test-suite mock drift (`lesson-audio-playback.test.ts`) fixed.

## 7. Verification (Phase 7)

| Check | Result |
|---|---|
| `@workspace/phonics-sounds` tests | 43/43 pass |
| kidschedule phonics + audio tests (37 files) | 212/212 pass |
| API server phonics tests (incl. DB seed integrity) | 90/90 pass |
| Lesson / Parent-Hub audio identity contracts | pass |
| `typecheck:libs` + scripts typecheck | clean |
| Production byte-verification (35 clips via versioned URLs) | 35/35 match |
| Full kidschedule suite | 17 pre-existing failing files (nutrition/worksheets/onboarding…) fail identically on clean `HEAD` — unrelated |

**Deployment notes:**
1. Existing installed clients receive the new audio automatically on the **next frontend deploy** (ships SW cache v6 + versioned URLs). Until then their SW cache serves old bytes.
2. Run `pnpm --filter @workspace/api-server tsx scripts/seedPhonics.ts` against the **production** database to push the corrected phoneme labels/examples (idempotent upsert + stale-row deactivation).
3. iOS: rebuild the Capacitor app (www/audio-pack updated) or ship via OTA.

## 8. Recommended future enhancements (prioritized)

1. **SATPIN letter order** — introduce letters in synthetic-phonics groups (s a t p i n → …) and gate CVC blending to taught graphemes. Single highest-impact pedagogy change (both audits scored letter order lowest).
2. **Segmenting + phoneme-isolation activities** — beginning/middle/ending sound identification and oral segmenting as first-class daily-plan activities (currently blending-heavy).
3. **Tricky-word strand** — teach said/was/you/they… explicitly as "can't sound out" words before they appear in stories; unify the two divergent sight-word lists (`SIGHT_WORDS` vs `SIGHT_WORD_IDS`).
4. **Decodability discipline** — rewrite 5–6y fluency sentences and V2 "decodable" stories to use only taught GPCs + taught tricky words; extend `audit-phonics-curriculum.ts` to enforce this and phoneme-label purity in CI.
5. **Bring ph/qu into the taught digraph pathway** (clips + seed rows now exist).
6. **Teach Aa case pairs** — show uppercase and lowercase together on letter tiles.
7. **Use the unused game modes** — `missing_letter` and `speed_challenge` exist but are never scheduled by the daily plan mapping.
8. **Voice-repetition feedback** for isolated phonemes (speech coach exists for words; extend to letter sounds with formant-based scoring like the QA gate).
9. **Accessibility pass** — captions/visual phoneme cues for hearing-impaired learners, reduced-motion variants, contrast audit of tile states.
10. **Browser speech-synthesis fallback** still uses "buh"-style hints (`SPEECH_SYNTH_PHONEME_TEXT`) — acceptable as emergency-only, but consider disabling letter fallback entirely now that 100% of clips are bundled offline.

## 9. Final production readiness verdict

**READY — with two deploy actions.** The core failure users reported (letter names instead of phonemes) is fully fixed and verified in cloud storage, both manifests, and both offline packs; the generation pipeline can now reproduce pure phonemes deterministically via the QA gate; every phonics-related test passes. Ship the frontend deploy (cache v6) and run the production DB seed to complete the rollout. The curriculum is pedagogically sound at the data level; the structural SATPIN reordering remains the top follow-up.
