# QUALITY_AUDIT

**Subject:** First production Short `BEf2RPMVNYM` (`golden-001`)  
**Engineering status:** Pipeline completed · Launch score **100** · Upload **UNLISTED** succeeded  
**Quality status:** **CRITICAL FAILURE** — not a finished marketing Short  
**Audit date:** 2026-07-29  
**Scope:** Audit only. No architecture redesign. No fixes implemented in this document.

---

## Executive verdict

The Launch Validator scored the package **100 / auto_approve** while the delivered MP4 had:

- near-silent audio (`mean_volume: -91.0 dB` — synthetic `anullsrc`, not narration/music)
- no burned-in subtitles
- no CTA / store-badge end card composition (icon-on-purple pad only)
- no enforcement that pixels match official Amy character bible
- no muted-playback story gate on the **final video**

**Root pattern:** validators largely inspect the **ContentPackage text** and **caller-supplied `mediaSignals`**, not the **actual rendered media**. Callers then either (a) hardcode all signals `true`, or (b) omit signals so checks default to pass.

---

## Evidence from the delivered file

| Probe | Result |
|---|---|
| File | `.amynest-assets/first-production/amynest-first-production-golden-001.mp4` |
| Video | H.264 · 1080×1920 · ~20s |
| Audio stream | AAC present · **~2 kb/s** · `mean_volume -91.0 dB` / `max_volume -91.0 dB` |
| Subtitle sidecars next to final | **None** (no `.srt` / `.ass` for assembled master) |
| Launch report | `LAUNCH_VALIDATION_REPORT.md` → overall **100**, all checks PASS |
| Stitch path | `assembleVerticalShort()` maps **silent** `anullsrc` + app-icon still as “end card” |
| Declared `subtitleMode` | Hardcoded `"burned-in"` in synthetic `RenderPackage` without burn-in filters |

---

## Observed failures → why they passed

### 1. No scroll-stopping hook

| | |
|---|---|
| **What failed** | Opening visuals do not present a sharp parenting cold-open that stops the scroll. |
| **Validator that should catch it** | `story.hook-3s` (`launch-validator/checks/story.ts`) |
| **Why it passed** | Hook gate only checks **text**: `content.hook.length >= 12` and/or first caption `start <= 3` / regex on hook copy. It never inspects frame 0–3 of the MP4. Golden-001 hook text is strong → PASS. |
| **Root cause** | Story validation is package-text validation, not on-video hook validation. |

### 2. Story not understandable without audio (Muted Video Test)

| | |
|---|---|
| **What failed** | Without audio, the stitched Veo clips do not read as a clear situation → emotion → product → hope → CTA story. |
| **Validator that should catch it** | Golden Script has `evaluateMutedVideoTest()` (`golden-scripts/muted-visual.ts`), but **Launch Validator has no muted-video / final-pixel story gate**. |
| **Why it passed** | Muted test runs only when **building/scoring Golden Scripts**, not against the rendered Short before upload. |
| **Root cause** | Missing launch-time muted-playback gate on the final master. |

### 3. AmyNest not naturally introduced

| | |
|---|---|
| **What failed** | Product/brand does not appear as a natural mid-story beat on screen. |
| **Validator that should catch it** | `story.natural-product` |
| **Why it passed** | Checks `voiceScript` / story **strings** for “AmyNest” after an index threshold. Voice text exists on the package even when **no VO was mixed into the MP4**. |
| **Root cause** | Natural-intro check is text-only; no requirement that AmyNest appears visually or in audible narration. |

### 4. Official Amy character bible not respected

| | |
|---|---|
| **What failed** | Generated people do not match locked Amy AI / Amy Girl / Amy Boy identity sheets. |
| **Validator that should catch it** | `brand.characters-official`, `visual.character-consistency`, Brand Quality Gate character casting |
| **Why it passed** | `brand.characters-official` only rejects corpus text matching `new mascot|unofficial|redesigned amy`. `visual.character-consistency` only scans `render.validation.errors` for the words “identity drift”. No vision / similarity compare to brand bible images. |
| **Root cause** | No pixel-level character similarity gate; text heuristics always pass for clean packages. |

### 5. Character consistency fails

| | |
|---|---|
| **What failed** | Identity drifts across stitched Veo clips. |
| **Validator that should catch it** | `visual.character-consistency` |
| **Why it passed** | Synthetic `RenderPackage.validation = { ok: true, errors: [], warnings: [] }` → no error strings → check passes. |
| **Root cause** | Consistency inferred from empty error list, not cross-scene visual analysis. |

### 6. No narration

| | |
|---|---|
| **What failed** | No spoken VO on the delivered Short. |
| **Validator that should catch it** | `audio.narration-sync` |
| **Why it passed** | Condition is `signals.narrationSyncOk !== false && voiceScript.length >= 40`. First-production-run **hardcoded** `narrationSyncOk: true`. Publishing path (if used alone) omits signals → `undefined !== false` → still PASS. Never probes MP4 for speech energy / TTS asset presence. |
| **Root cause** | Trust-me signals + text voiceScript; no “narration audio exists” probe. |

### 7. No background music

| | |
|---|---|
| **What failed** | No music bed. |
| **Validator that should catch it** | `audio.music-balanced`, `audio.ducking` |
| **Why it passed** | Both default to PASS when signals are missing or set true (`!== false`). They assume music exists and only ask if balance/ducking is “ok”. |
| **Root cause** | Missing gate: “music track present and non-silent.” Balance checks without existence checks. |

### 8. No subtitles

| | |
|---|---|
| **What failed** | No burned-in captions; no sidecar for final master. |
| **Validators that should catch it** | `visual.readable-subtitles`, `audio.subtitle-timing`, `a11y.subtitle-readability` |
| **Why they passed** | All three validate `content.captions[]` **arrays** and/or `renderMetadata.subtitleMode !== undefined`. First-production-run set `subtitleMode: "burned-in"` without applying burn-in filters. Caption cue objects exist on the package → PASS. |
| **Root cause** | Subtitle validation is metadata validation, not “pixels contain text” / “sidecar exists beside master.” |

### 9. No CTA

| | |
|---|---|
| **What failed** | No spoken/on-screen CTA invite in the finished Short. |
| **Validators that should catch it** | `story.hope-before-cta`, `story.strong-ending`, `brand.website-cta` |
| **Why they passed** | CTA checked in `content.cta` / description / voiceScript strings and last caption style — not in rendered frames or audio. |
| **Root cause** | Publish-package CTA ≠ on-video CTA. |

### 10. No Google Play badge / 11. No App Store badge

| | |
|---|---|
| **What failed** | Store badges absent from end card. |
| **Validator that should catch it** | `brand.store-badges` (+ Brand Quality Gate badge flags) |
| **Why it passed** | `ok: signals.storeBadgesPresent !== false`. Hardcoded `true` in first-production-run. If signals omitted (PublishingOrchestrator), Brand Quality Gate receives `storeBadgesPresent ?? true`. |
| **Root cause** | Badge presence is a boolean trust signal, not an image/OCR check against official badge assets. |

### 12. End card incomplete

| | |
|---|---|
| **What failed** | Final beat is app-icon still on purple pad — not full end card (CTA lines + badges + website). |
| **Validator that should catch it** | `brand.end-card`, `brand.app-icon` |
| **Why it passed** | Same pattern: `endCardPresent` / `appIconPresent` hardcoded or defaulted true. Stitch literally used `app-icon.png` as the “end card” input, which satisfied the icon path while skipping badge/CTA layout. |
| **Root cause** | End-card completeness never verified against brand end-card composition rules on the final frames. |

### 13–16. Hook quality / muted story / natural AmyNest / continuity / scene quality / “finished Short”

Collectively failed because Launch Validator has **no finished-product aesthetic gate**. Technical checks only prove: file exists, 1080×1920, ~target duration, H.264/MP4, checksum/package shape.

---

## Required Launch Validator gates (mapped)

User-required gate → current status

| # | Required gate | Current behavior | Missing? |
|---|---|---|---|
| 1 | Audio track exists | Only checks codec name loosely / silence signal optional | **Missing real energy probe** (silent AAC still “exists”) |
| 2 | Narration exists | Text voiceScript + `narrationSyncOk` signal | **Missing** speech/TTS asset probe |
| 3 | Music exists | Assumes music; checks balance signal | **Missing** music-presence probe |
| 4 | Subtitle file exists | Not checked for final master | **Missing** |
| 5 | Subtitle burn-in exists | Trusts `subtitleMode` string | **Missing** OCR / burn-in verification |
| 6 | Official Amy character similarity | Text corpus + empty error list | **Missing** vision/similarity vs bible |
| 7 | CTA exists | Text CTA fields | **Missing** on-video/on-audio CTA |
| 8 | End card exists | Trusts `endCardPresent` signal | **Missing** frame composition check |
| 9 | Google Play badge | Trusts `storeBadgesPresent` | **Missing** |
| 10 | App Store badge | Trusts `storeBadgesPresent` | **Missing** |
| 11 | Hook quality | Text hook string | **Missing** on-video first-3s check |
| 12 | Muted-understandable story | Golden Script only | **Missing** at launch |
| 13 | AmyNest appears naturally | Text voice/story strings | **Missing** visual/spoken product beat |
| 14 | Character continuity | Text render.validation.errors text | **Missing** cross-clip identity check |
| 15 | Scene quality | AI artifacts only if signal set | **Missing** active scene QA |
| 16 | Feels like finished marketing Short | **No such gate** | **Missing** |

---

## Which components missed what

### A. Launch Validator design gaps (primary)

1. **`mediaSignals` are optional and fail-open**  
   Almost every media-quality check uses `signal !== false` or `signal ?? true`. Absence ⇒ PASS.

2. **Text package ≠ pixels/audio**  
   Story, CTA, product intro, caption timing validate `ContentPackage` fields that can be perfect while the MP4 is silent and uncaptioned.

3. **No muted final-master test**  
   `evaluateMutedVideoTest` is Golden Script–scoped only.

4. **No character similarity**  
   Brand bible sheets exist on disk; Launch Validator never compares frames to them.

5. **No “non-silent audio” threshold**  
   Technical playable-MP4 check accepts a silent AAC track (this Short: **-91 dB**).

6. **Accessibility contrast hardcoded `ok: true`**  
   `a11y.color-contrast` always passes.

### B. First production execution path (amplifier)

File: `operations/first-production-run.ts`

1. **Hardcoded trust signals before upload**

```ts
mediaSignals: {
  endCardPresent: true,
  storeBadgesPresent: true,
  appIconPresent: true,
  narrationSyncOk: true,
  musicBalanced: true,
  duckingOk: true,
}
```

This forced Audio + Brand media checks to PASS even when the stitch produced silence and an incomplete end card.

2. **`assembleVerticalShort()` quality shortcuts**
   - Audio: `anullsrc` (silence) instead of Gemini TTS + music mix  
   - End card: looped `app-icon.png` on purple — not badge/CTA end-card composition  
   - Subtitles: none burned in; no sidecar written for final  
   - Clips: chronological filesystem sort of Veo MP4s — not director continuity / muted story order  

3. **Synthetic `RenderPackage` lies**
   - `subtitleMode: "burned-in"` without burn-in  
   - `watermarkApplied: true` without verification  
   - `validation.ok: true` with empty errors → character-consistency auto-pass  

4. **`--reuse-assets` path skipped full media stack**  
   Reused Veo/Imagen clips but did not require TTS/music/subtitle artifacts before stitch.

### C. PublishingOrchestrator path (latent same bug)

`publishing/orchestrator.ts` calls `validateLaunch({ content, render, metadata, thumbnail, schedule })` **without `mediaSignals`**.  
Because brand defaults are `?? true` and audio uses `!== false`, a silent incomplete master can also score high on the normal publish path — not only the first-production stitch path.

### D. Upstream layers that did not fail-closed

| Layer | What it did | Why it didn’t stop upload |
|---|---|---|
| Golden Script muted test | Passed on **script plan** | Never re-run on final MP4 |
| AI Director / Scene Composer | Planned muted-readable intents | No launch re-check of delivered frames |
| Brand Quality Gate | Can require end card/badges | Fed optimistic `finalVideoHasEndCard` / badge flags from signals |
| Asset Engine | Generated some Veo/Imagen assets | TTS/music not required for launch; stitch discarded real audio path |
| Technical validator | Confirmed vertical H.264 ~20s | Correctly passed engineering constraints; wrong proxy for creative quality |

---

## Systemic root cause (one paragraph)

AmyNest treated “launch ready” as **structured package completeness** (titles, captions array, CTA strings, resolution, duration) plus **honor-system mediaSignals**, instead of **evidence from the final media file**. The first production stitch then manufactured a technically valid vertical MP4 while advertising burned-in subtitles and perfect audio/brand signals. The validator had no choice but to award **100**, because the failing qualities were never measured.

---

## Required validator improvements (recommendations only — do not implement yet)

### Fail-closed media probes (must block upload)

1. **Audio presence & loudness** — reject if no audio stream OR mean/max volume below threshold (e.g. mean > −50 dB fails).  
2. **Narration presence** — require detectable speech band / TTS artifact linked into mix; reject silence-as-AAC.  
3. **Music presence** — require non-speech bed energy or explicit music asset in mix graph.  
4. **Subtitle sidecar** — require `.srt`/`.ass` beside master OR proven burn-in.  
5. **Burn-in verification** — sample frames for caption glyphs / contrast; do not trust `subtitleMode` string.  
6. **End-card composition** — last N seconds must contain app icon **and** Play badge **and** App Store badge **and** CTA line (template match or OCR).  
7. **Muted story gate** — run Golden-style muted readability against sampled final frames (first 10s + last 5s).  
8. **Character similarity** — compare face/character embeddings or reference-sheet match for Amy AI/Girl/Boy; reject drift.  
9. **Continuity** — cross-scene identity score threshold.  
10. **Hook-on-video** — first 3s must contain readable situation text or clear visual cold-open, not only package hook string.  
11. **Finished Short rubric** — composite gate: narration + music + subs + end card + muted story + character lock all green.

### Process / API fixes (validator contract)

12. **Ban fail-open defaults** — `mediaSignals` missing ⇒ treat unset media claims as **fail**, or require a MediaProbeReport object.  
13. **Forbid caller hardcoding** — Launch Validator should ignore optimistic booleans unless accompanied by probe hashes/paths.  
14. **PublishingOrchestrator must run the same probe suite** before upload (not a weaker signal-less call).  
15. **Separate scores** — “Engineering score” (tech) vs “Creative Launch score” (audio/visual/brand/muted); upload requires both ≥95.  
16. **Tests** — add fixture: silent AAC + captions-in-JSON + fake signals ⇒ **must reject**.

### Production-run specific (for later fix work)

17. Stitch path must mix real TTS + music; never `anullsrc` for production.  
18. End card must composite official badge assets + CTA lines, not icon-only.  
19. Burn captions from `content.captions` into the master.  
20. Do not set `subtitleMode: "burned-in"` unless burn-in actually ran.

---

## What was *not* the failure

- YouTube upload / OAuth  
- Vertical resolution / duration window  
- Golden Script library text quality (script-side muted scores can still be high)  
- “FFmpeg cannot encode” — encode succeeded; **quality validation** failed to reject the encode  

---

## Final audit statement

**Engineering pipeline: PASS.**  
**Quality validation: FAIL (systemic).**  

The Short was approved because Launch Validator measured the wrong artifacts (text + trust signals) and the production stitch advertised success. Until the gates above are enforced on the **final media**, Launch Score ≥95 is not a reliable production-quality certificate.

**No fixes were implemented in this audit.**
