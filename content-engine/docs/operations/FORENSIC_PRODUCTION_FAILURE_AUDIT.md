# FORENSIC PRODUCTION FAILURE AUDIT

**Status:** AUDIT ONLY — NO IMPLEMENTATION  
**Date:** 2026-08-18  
**Composition version in code:** `CREATIVE_COMPOSITION_VERSION = "2.5.0"` (`content-engine/creative-composition/types.ts`)  
**Videos audited:** golden-009, golden-010, golden-011, golden-012 (latest = golden-012)  
**Primary trace target:** golden-012 — *Balance Games That Build Stillness Superpowers* (Health)

**Absolute rule observed:** no code changes, no prompt changes, no provider/pipeline/validator changes in this audit.

---

## 1. Executive Summary

The production chain is **not failing randomly**. Multiple independent, deterministic defects stack:

| Rank | Failure | Exact locus | Severity |
|--:|---|---|---|
| 1 | Golden Script narration is **replaced** by a hardcoded Speech Practice VO for every golden except #7/#8 | `voiceAndCaptionsForGolden()` in `operations/google-production-run.ts` | **P0** |
| 2 | KIE image-to-video receives **one** `imageUrls[]` only; `referenceImagePaths` never leave TypeScript | `kie-video/client.ts` `kieGenerateVideo` + `provider.ts` | **P0** |
| 3 | Identity seed is bible PNG on a **solid-color wash**, not a scene; Veo invents body/world → robot drift | `creative-composition/keyframes.ts` `writeIdentityKeyframe` | **P0** |
| 4 | Mid-film “silence”: narration ends early; remaining timeline is music@0.22 + frozen video | TTS truncation + `assembleMaster` mix | **P0** |
| 5 | KIE TTS intermittently emits **truncated** narration for the same default script (30s vs ~11.5s) | KIE Gemini TTS output files | **P0** |
| 6 | Scene captions are the Speech Practice caption set, not Golden story beats | same `voiceAndCaptionsForGolden` default branch | **P1** |
| 7 | CTA identity keyframe SHA is **identical** across 009–012 | `writeIdentityKeyframe` + env `cta-stage` | **P1** |
| 8 | Character Memory last-frame reuse feeds **already-drifted** Veo frames forward | `seed.ts` when `usedPreviousFrame=true` | **P1** |
| 9 | Environments diversify, but story/VO do not → “different rooms, same speech ad” | diversify-plan vs voice default | **P1** |
| 10 | Clip burn uses `-an` (native Veo audio discarded by design) | `compose.ts` `burnCaptionOntoClip` | **P2** (by design; amplifies TTS failures) |

**Verdict:** Audience symptoms (wrong words, silent middle, wrong Amy/robot, repetitive composition) map to **specific file/function/data-field failures**, not vague “AI inconsistency.”

**DO NOT IMPLEMENT UNTIL AUDIT IS REVIEWED**

---

## 2. Production Chain (as executed)

```
Golden MD / seed
  → buildGoldenScript()
  → goldenToContentPackage() + voiceAndCaptionsForGolden()   ← SCRIPT MUTATION
  → KIE TTS + KIE Suno                                         ← AUDIO GEN / TRUNCATION
  → planCinematicShort() + diversifyCompositionPlan()          ← ENV/CAMERA VARIETY
  → writeIdentityKeyframe()                                    ← IDENTITY SEED
  → performancePrompt() + Character Memory (TS state)
  → seedForShot() → imagePath (+ unused referenceImagePaths)
  → KieVideoProvider.generateVideo()
  → kieGenerateVideo() API: imageUrls:[1], prompt, FIRST_AND_LAST…  ← REFS DROPPED
  → burnCaptionOntoClip (-an) / burnCtaPerformance
  → assembleMaster (concat + narr@1.15 + music@0.22)
  → launch validator / optional YouTube upload
```

---

## 3. Golden Script Integrity

### 3.1 Exact Golden used (latest)

| Field | Value |
|---|---|
| File | `content-engine/golden-scripts/012-health.md` |
| ID | `golden-012` |
| Title | Balance Games That Build Stillness Superpowers |
| Feature | Health Lab — flamingo balance / freeze-statue |
| Selected hook | “It’s 8:47 PM. Pride — waiting sits with you at the table.” |
| Hope close | “A held balance can feel like a superpower they chose.” |

### 3.2 Mutation point (exact)

**File:** `content-engine/operations/google-production-run.ts`  
**Function:** `voiceAndCaptionsForGolden(script)`  
**Lines:** ~242–301  

**Logic:**
- If `GOLDEN_NUM === 7` → speech-games VO  
- If `GOLDEN_NUM === 8` → speech-worry VO  
- **Else → hardcoded Speech Practice VO** (comment: “Default (golden-006 Speech Practice path)”)

**For golden-012 (`GOLDEN_NUM=12`), the else branch runs.**

| Field | GOLDEN SCRIPT | INTERNAL PRODUCTION SCRIPT |
|---|---|---|
| Topic | Balance / Health Lab | Speech Practice mic feedback |
| Hook in VO | Pride — waiting… | **Dropped** from VO |
| Product | Flamingo / Freeze Statue | “hear the prompt, speak into the mic” |
| Captions (plan) | Should follow Health story | `"Parents feel the speech struggle today"` etc. |

**Evidence — composition plan captions (golden-012):**  
`.amynest-assets/v5-inspect-golden-012/work/cinematic/composition-plan.json`

```
shot-hook caption: Parents feel the speech struggle today
shot-amy-host: A sound tumbles — and shame flickers
shot-amy-girl-learn: Speech Practice — hear, say, feedback
shot-amy-boy-celebrate: Hope rises — braver, not smaller
shot-cta: Download AmyNest AI
```

**Word overlap (computed):**

| Comparison | Word overlap % |
|---|--:|
| Golden-012 story gist vs internal VO | **19.3%** |
| Golden-012 gist vs Whisper of final narration | **7.0%** |
| Internal VO vs Whisper 009 (full TTS) | **91.8%** |
| Internal VO vs Whisper 012 (truncated TTS) | **38.8%** |

### 3.3 Additional mutations in same function family

| File | Field | Actual value | Issue |
|---|---|---|---|
| `goldenToContentPackage` | `openingQuestion` | `"What if speech practice felt safe tonight?"` | Hardcoded speech; ignores Health golden |
| `goldenToContentPackage` | `topic` base | prefers `getTopicById("speech-001")` | Speech topic bias |
| `upload-local-master.ts` | local `goldenToContentPackage` | also hardcodes Speech Practice VO | Metadata upload path repeats mutation |

### 3.4 Sentence-level Original → Actual (golden-012)

| Original (Golden) | Actual (spoken / planned) |
|---|---|
| “It’s 8:47 PM. Pride — waiting sits with you at the table.” | “Parents feel the speech struggle today.” |
| Restlessness / body practice / balance | “the child tries a sound, then shame flickers” |
| Health Lab flamingo / freeze-statue | “AmyNest Speech Practice — hear… mic…” |
| “A held balance can feel like a superpower they chose.” | “Hope rises when safe practice leaves a child braver…” (planned; **often not spoken** due to TTS truncate) |

**Immutable Golden rule is violated at `voiceAndCaptionsForGolden` before any model creative rewrite.**

---

## 4. Audio Forensics

### 4.1 Stream inventory (ffprobe)

| Video | Duration | Video codec | Audio streams | Audio codec | SR | Ch |
|---|--:|---|--:|---|--:|--:|
| 009 | 33.00s | h264 | 1 | aac | 48000 | 1 |
| 010 | 35.00s | h264 | 1 | aac | 48000 | 1 |
| 011 | 26.00s | h264 | 1 | aac | 48000 | 1 |
| 012 | 28.00s | h264 | 1 | aac | 48000 | 1 |

No missing audio stream on masters. “Silence” is **content silence / near-silence**, not absent tracks.

### 4.2 Asset durations

| Video | Narration.wav | Music.wav | Master | Shot concat |
|---|--:|--:|--:|--:|
| 009 | **30.32s** | 163.1s | 33s | ~28s + pad |
| 010 | **32.08s** | 240.0s | 35s | — |
| 011 | **11.40s** | 103.3s | 26s | — |
| 012 | **11.52s** | 109.4s | 28s | 6+4+6+6+6=28s |

`narration.raw-download` duration equals `narration.wav` for 011/012 → truncation is **upstream of ffmpeg ensureWav**, at KIE TTS download.

### 4.3 Volume windows (mean dB / 2s) — mid-video “silence”

**golden-011:**

| Window | mean dB | Interpretation |
|---|--:|---|
| 0–12s | −25 to −29 | Speech + music |
| **12–26s** | **−39 to −43** | **Narration gone; music@0.22 only** |

**golden-012:**

| Window | mean dB | Interpretation |
|---|--:|---|
| 0–12s | −22 to −28 | Speech + music |
| **12–28s** | **−34 to −37** | **Narration gone; music bed only** |

**golden-009:** speech fills until ~30s; quiet only in final fade (~30–33s, −35/−36 dB).

### 4.4 Silent section forensics (golden-012)

| Field | Value |
|---|---|
| START | **~11.52s** (end of TTS) |
| END | **28.00s** (master end) |
| EXPECTED AUDIO | Health/balance narration through hope + CTA line |
| ACTUAL AUDIO | Quiet Suno bed only (`volume=0.22` in mix) |
| RESPONSIBLE | (1) truncated `narration.wav` from KIE TTS; (2) `assembleMaster` continues video via `tpad` / longer clip sum without extending speech |

### 4.5 Where silence is introduced (classification)

| Stage | Introduces mid-film speech silence? | Evidence |
|---|---|---|
| A. TTS generation | **YES (011/012)** | raw-download already 11.4–11.5s; Whisper stops after 3 sentences |
| B. Scene generation | No (Veo audio discarded) | — |
| C. Scene extraction | No | — |
| D. Concat | No | concat.txt orders clips only |
| E. Mixing | **YES (amplifies)** | music volume 0.22 after narr ends |
| F. Mux | Pads video to target; does not invent speech | `assembleMaster` |
| G. Export | No | — |
| H. YouTube | Not required to explain local master silence | Local MP4 already quiet after 11.5s |

### 4.6 Assemble filter (exact)

**File:** `operations/google-production-run.ts`  
**Function:** `assembleMaster`  

```
[1:a]...volume=1.15[narr];
[2:a]...volume=0.22[music];
[narr][music]amix=inputs=2:duration=first...
```

Plus optional `[0:v]tpad=stop_mode=clone` when `targetSeconds > videoLen`.

Native clip audio is never mapped (`-map [vout] -map [aout]` only).

### 4.7 Clip audio strip (exact)

**File:** `creative-composition/compose.ts`  
**Function:** caption burn  
**Flag:** `-an`  

Veo native audio is intentionally discarded every shot.

---

## 5. Script / Transcript Comparison

### Whisper (local `whisper --model tiny`)

**009 narration (full):** matches Speech Practice internal VO end-to-end (~30s).  
**011 / 012 narration (truncated):** only:

> Parents feel the speech struggle today.  
> The child tries to sound, then shame flickers.  
> Correcting every word can shut a child down.

**Missing from spoken vs intended internal VO (012):** 30 tokens including  
`silence, help, amynest, speech, practice, hear, prompt, speak, mic, feedback, hope, braver, download, google, play, store…`

**No LLM rewrite step found after package build** — mutation is the **hardcoded default VO**, then **TTS truncation**. Captions still show the full Speech Practice set on-screen while audio stops early → user perceives “words change” / mismatch mid-video.

---

## 6. Amy Identity Forensics

### 6.1 Canonical assets

| Asset key | Path under `content-engine/brand/assets/` | SHA256-16 (file) | Golden Master lock |
|---|---|---|---|
| amyAiBase | `amy-ai-base.png` | `4739c817741dbe6a` | matches `BRAND_LOCK_FINGERPRINTS.json` |
| amyAiBible | `amy-ai-bible.jpeg` / sheet | present | — |

Resolver: `brand/assets-resolver.ts` → `amyAiBase: "amy-ai-base.png"`.

### 6.2 What KIE actually receives

**Compose builds:**

```ts
referenceImagePaths: seed.referenceImagePaths  // may include bible + previous frame
imagePath: seed.imagePath                      // keyframe OR previous last frame
```

**KieVideoProvider.generateVideo** calls:

```ts
kieGenerateVideo({ prompt, imagePath, ... })  // referenceImagePaths NOT passed into HTTP body
```

**kieGenerateVideo HTTP body:**

```json
{
  "prompt": "<performance prompt>",
  "imageUrls": ["<single uploaded url>"],
  "model": "veo3_fast",
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "aspect_ratio": "9:16",
  "resolution": "720p|1080p",
  "duration": 4|6,
  "enableTranslation": false
}
```

**Evidence:** `referenceImagePaths` only appears in **returned metadata** (`provider.ts` line ~156), not in `client.ts` request body.

**Conclusion:** Prompt text saying “PERMANENT AMY / exact same Amy” is **not backed by multi-reference delivery**. Only one image URL is uploaded.

### 6.3 Keyframe construction (identity dilution)

**File:** `creative-composition/keyframes.ts`  
**Function:** `writeIdentityKeyframe`  

- Loads official base PNG  
- Pastes onto **flat RGB environment wash** (`ENV_RGB`)  
- Output 1080×1920 RGB  

This is **not** a locked cinematic plate of Amy in-scene. Veo must invent pose, limbs, room, companions → explains **visor robots / alternate Amy bodies** seen in published frames.

### 6.4 CTA keyframe collision

`shot-cta-identity.png` SHA16 = **`44457152a8775c29`** for golden-**009, 010, 011, and 012**.

Same Amy base + same `cta-stage` wash → identical first frame across Health and Speech productions.

### 6.5 How “different robot” happens (mechanism)

1. Seed = stylized `amy-ai-base.png` on purple wash  
2. Performance prompt demands Pixar/Disney+/photoreal mix + “soft robot” language  
3. KIE Veo invents geometry without bible multi-view refs  
4. Optional next shot uses **last frame of that invent** (`usedPreviousFrame=true`) → drift compounds  

Continuity for golden-012: `shot-amy-girl-learn` has `"usedPreviousFrame": true` (from prior girl shot memory).

---

## 7. Amy Girl Forensics

| Check | Result |
|---|---|
| Canonical | `amy-girl-base.png` SHA16 `ee5a70e450171323` (matches brand lock) |
| Seed path | `writeIdentityKeyframe(character:"amy-girl")` |
| Multi-ref to KIE | **No** — same single `imageUrls` path |
| Text-only regen risk | **Yes** — Veo free to alter hair/bow/age from one pasted base |
| Cross-video keyframe | Hook identity **009==010** SHA `9c47507fd4e8e26a` (same env+char recipe) |

Plan captions force Speech Practice story while visual may show arbitrary rooms → Girl identity + story both wrong relative to Health golden.

---

## 8. Amy Boy Forensics

| Check | Result |
|---|---|
| Canonical | `amy-boy-base.png` SHA16 `cc4006c82dbd8e72` |
| Seed | wash + base paste |
| KIE refs | single image only |
| Role in 012 | celebrate shot; still captioned “Hope rises — braver, not smaller” (speech template) |

---

## 9. Character Reference Contract

| Stage | Input | Output | Refs preserved to next stage? | Evidence |
|---|---|---|---|---|
| Character Bible | PNG/JPEG files | paths via resolver | Yes on disk | `assets-resolver.ts` |
| `writeIdentityKeyframe` | bible base + env RGB | single PNG wash+paste | Partial (base only) | `keyframes.ts` |
| Character Memory / `seedForShot` | keyframe + optional lastFrame + bible paths array | `GenerationSeed` | In TS only | `seed.ts` |
| `performancePrompt` | shot + memory | long text prompt | Text claims identity | `performances.ts` |
| `KieVideoProvider` | seed.imagePath + referenceImagePaths | calls client with **imagePath only** | **referenceImagePaths dropped** | `provider.ts` |
| `kieGenerateVideo` | one local image | `imageUrls:[url]` | **Single ref only** | `client.ts` |
| KIE API | one image + prompt | MP4 | N/A | HTTP body |

**Critical:** TypeScript `referenceImagePaths` ≠ KIE request field.

---

## 10. KIE Request Audit

### Video (representative)

| Field | Actual |
|---|---|
| Endpoint | `POST https://api.kie.ai/api/v1/veo/generate` |
| model | `veo3_fast` (from env / provider) |
| resolution | `720p` (011/012 runs) / `1080p` (some earlier) |
| duration | shot `durationSeconds` (4 or 6) |
| aspect_ratio | `9:16` |
| imageUrls | **length 1** |
| generationType | `FIRST_AND_LAST_FRAMES_2_VIDEO` with **only first image supplied** |
| referenceImages | **absent** |
| negativePrompt | not sent by client (prompt-only) |
| seed | not sent |
| audio config | none (native audio later stripped) |

### Audio TTS

| Field | Actual |
|---|---|
| Endpoint | `POST https://api.kie.ai/api/v1/jobs/createTask` |
| model | `google/gemini-3-1-flash-tts` |
| input.dialogue_turns[0].text | **mutated Speech Practice VO** (not Golden Health text) |
| Observed output length | 30.32s (009) vs **11.4–11.5s** (011/012) for same template family |

### Music

| Field | Actual |
|---|---|
| Endpoint | `POST https://api.kie.ai/api/v1/generate` (Suno) |
| instrumental | true |
| Used in mix | volume 0.22 |

---

## 11. Scene Continuity

### Continuity JSON (golden-012)

Path: `.amynest-assets/v5-inspect-golden-012/work/cinematic/continuity.json`

| Shot | usedPreviousFrame | memoryFramePath present |
|---|---|---|
| hook | false | yes (written after) |
| host | false | yes |
| girl-learn | **true** | yes |
| boy-celebrate | false (character change) | yes |
| cta | true/false per file | yes |

**Functional?** Last-frame files exist and can become `imagePath`.  
**Effective for identity lock?** Weak — previous frame is already a Veo hallucination; bible multi-refs never reach KIE.

**Pose/wardrobe/lighting continuity** is asserted in prompt text (`continuityBridge`, `CONTINUOUS FILM BRIDGE` in diversify) but **not enforced as pixels** beyond optional last-frame seed.

---

## 12. Scene Diversity

### What diversifies

`diversifyCompositionPlan` varies `environment`, `camera`, poses, props (golden-012 living shots: `apartment-hallway`, `car-ride`, `balcony`, `garden`).

### What overwrites story variety

| Layer | Behavior |
|---|---|
| `voiceAndCaptionsForGolden` default | **Same Speech Practice captions/VO for 009–012** |
| `openingQuestion` | Always speech |
| CTA keyframe | Identical hash across productions |
| Prompt stack | Same V5 cinematic lock language every shot |

**Result:** Locations change; **narrative + on-screen caption story stay a speech ad** → “different scripts look similar.”

No evidence of a single shared storyboard ID across goldens for video files (separate out dirs). Similarity is **template VO + identical CTA identity seed + shared prompt doctrine**, not a mistaken MP4 reuse of another golden’s master.

---

## 13. Cache / Asset Reuse

| Asset | Collision? | Detail |
|---|---|---|
| Masters | No | Separate dirs `v5-inspect-golden-00N` |
| CTA identity PNG | **Yes** | Same SHA across 009–012 |
| Hook identity 009 vs 010 | **Yes** | Identical SHA |
| Veo raw clips | No cross-golden reuse observed when `AMYNEST_REUSE_VEO=0` |
| Audio | Per-outDir; `AMYNEST_REUSE_AUDIO=1` can reuse within same outDir only |

`compose.ts` reuses `rawVeo` if file exists and `AMYNEST_REUSE_VEO !== "0"` — risk if outDir reused with flag left on.

---

## 14. Race Conditions

| Area | Finding |
|---|---|
| Scene loop | **Sequential** `for (const shot of plan.shots)` in `composeCinematicVisuals` — not parallel Veo |
| Filenames | Shot-scoped (`${shot.id}-raw.mp4`) — low collision risk in one run |
| TTS | Single narration file per outDir — no parallel TTS jobs in production run |
| Intermittent TTS truncate | **Not explained by local race**; raw download already short — provider-side / payload behavior |

No evidence that TTS job A is overwritten by job B in this orchestrator path.

---

## 15. Assembly

### golden-012 concat order (`concat.txt`)

```
shot-hook.mp4
shot-amy-host.mp4
shot-amy-girl-learn.mp4
shot-amy-boy-celebrate.mp4
shot-cta.mp4
```

### Video timeline (012)

| Range | Content |
|---|---|
| 0–6s | hook |
| 6–10s | host |
| 10–16s | girl-learn |
| 16–22s | boy-celebrate |
| 22–28s | CTA |

### Audio timeline (012)

| Range | Content |
|---|---|
| 0–11.52s | Speech-template narration (truncated) + music |
| 11.52–28s | **Music bed only** (perceived silence / unfinished) |

**Mismatch:** Visual story continues ~16s after speech dies.

---

## 16. CTA Forensics

| Check | Evidence |
|---|---|
| CTA clip present | Yes — last concat entry / 6s |
| Burn path | `burnCtaPerformance` (wave hold + plate + fade) |
| Narration vs CTA | On 011/012, narration already ended before CTA; CTA is music-only |
| Logo / stores / site | Burned into plate path when compose succeeds; launch scores vary (012 launch 89 historically) |
| Speak after fade | Intended silent endcard; mid-film speech death is separate bug |

---

## 17. Duration Forensics

| Metric | golden-012 |
|---|---|
| Golden suggested duration | 15s (script meta) |
| Pipeline TARGET_DURATION | **21** (`google-production-run.ts`) |
| Planned shot sum | 28s (6+4+6+6+6) |
| TTS | **11.52s** |
| Master | **28s** |
| Narration + breath target logic | `max(planned, narr+2.5, video)` → driven by **video** when narr short |

**Narration ≪ video** on 011/012 → unfinished speech + long quiet tail.

---

## 18. Prompt Overwrites

Execution order (per shot):

1. Plan fields (objective, interaction, bridge)  
2. `diversify-plan` rewritePerformance / continuity stitch  
3. `performancePrompt` (V5 locks, Amy presence, film rule, quality lock)  
4. Character memory enrichment text  
5. KIE single-image I2V  

**Contradictions present in shipped prompt stack:**

| A | B |
|---|---|
| Photoreal / Netflix humans | Pixar / Disney+ / 3D animated language |
| “Official / permanent Amy” | Only wash+base seed; no multi-ref API |
| Continuous film / no teleport | New wash keyframe per character change; env jumps via diversify |
| Story-first / unique short | Hardcoded Speech Practice captions for Health goldens |

Later layers do not restore Golden Health language once VO/captions are replaced upstream.

---

## 19. Model Configuration

| Belief in ops | Actual request |
|---|---|
| KIE Veo Fast | `veo3_fast` ✓ |
| 720p (012) | `resolution: "720p"` ✓ |
| Image-to-video | ✓ single image |
| Multi identity references | **✗ not sent** |
| FIRST_AND_LAST dual frames | Type set, **second frame not provided** |
| Native usable audio | Generated maybe; **stripped with `-an`** |
| Gemini Studio TTS | **Bypassed**; KIE Gemini TTS used when `AMYNEST_AUDIO_PROVIDER=kie` |

---

## 20. Recent Video Evidence

| Golden | YT ID | URL | Model | Master | Narr | Audio symptom | Script fidelity | Char refs to KIE |
|---|---|---|---|--:|--:|---|---|---|
| 009 | QZtIc0vZoNo | https://youtube.com/shorts/QZtIc0vZoNo | kie/veo3_fast | 33s | 30.3s | Quiet only at end fade | Speech template ≠ Parent View golden | single image |
| 010 | Gt0TDMNmmAE | https://youtube.com/shorts/Gt0TDMNmmAE | kie/veo3_fast@720p | 35s | 32.1s | End quiet | Speech template ≠ Coach V2 golden | single image |
| 011 | gw8TCWdL4IE | https://youtube.com/shorts/gw8TCWdL4IE | kie/veo3_fast@720p | 26s | **11.4s** | **Mid-film quiet 12–26s** | Speech template ≠ Health Lab golden + TTS truncate | single image |
| 012 | pK_RwGa322o | https://youtube.com/shorts/pK_RwGa322o | kie/veo3_fast@720p | 28s | **11.5s** | **Mid-film quiet 12–28s** | Speech template ≠ Balance golden + TTS truncate | single image |

Common pattern: **template VO + single-image I2V + optional TTS truncate + music bed tail.**

---

## 21. Root Cause Ranking (Top 20)

| # | Root cause | Evidence | Affected | Fix location (do not implement now) | Impact if fixed |
|--:|---|---|---|---|---|
| 1 | Hardcoded Speech VO for goldens ≠7,8 | `voiceAndCaptionsForGolden` else branch; plan captions; Whisper | 009–012 (100% of audited) | `google-production-run.ts` | Restores Golden text |
| 2 | KIE client drops `referenceImagePaths` | `client.ts` body vs `provider.ts` metadata | All KIE shots | `kie-video/client.ts` + provider | Enables real identity refs |
| 3 | Identity keyframe = base on wash | `writeIdentityKeyframe` | All shots | `keyframes.ts` / seeding strategy | Reduces robot invention |
| 4 | KIE TTS truncated outputs | 011/012 raw-download 11.5s vs 009 30s | ≥2/4 audited | TTS request/validation gate | Ends mid-film speech death |
| 5 | Mix continues video after narr ends | `assembleMaster` + short narr | 011/012 | timing / fail-closed if narr≪plan | No quiet middle |
| 6 | Captions follow mutated VO | same default captions array | 009–012 | same VO function | On-screen matches Golden |
| 7 | Hardcoded `openingQuestion` speech | `goldenToContentPackage` | all nums | same file | Metadata honesty |
| 8 | Previous-frame memory compounds drift | `seed.ts` + continuity usedPreviousFrame | multi-shot same character | seeding policy | Less identity morph |
| 9 | FIRST_AND_LAST with one image | `generationType` + one URL | all KIE | client payload | Predictable I2V mode |
| 10 | Identical CTA identity PNG | SHA collision | 009–012 | keyframe inputs | Less endcard sameness |
| 11 | Prompt photoreal↔Pixar contradiction | `performances.ts` stack | all | prompt policy (later) | Cleaner model behavior |
| 12 | Diversity varies rooms not story | diversify vs VO | all | VO must lead story | Perceived variety |
| 13 | `-an` strips Veo audio | `compose.ts` | all | by design; needs strong TTS | — |
| 14 | Music@0.22 after speech | assemble filter | 011/012 tails | mix / ducking | Less “silent” feel |
| 15 | `toRenderPackage` still g006 IDs | cosmetics/telemetry | all | packaging | Traceability |
| 16 | upload-local-master repeats Speech VO | upload script | uploads | upload-local-master.ts | YT metadata accuracy |
| 17 | FORCE_DIVERSITY / LAUNCH_VALIDATOR=0 used operationally | run logs | 011/012 | process | Quality gates bypassed |
| 18 | Target duration 21 vs golden meta 15 | TARGET_DURATION const | all | planning | Length honesty |
| 19 | Hook keyframe 009=010 collision | SHA | 2 videos | env diversify timing | — |
| 20 | No fail-closed when Whisper/TTS shorter than VO text | absent check | 011/012 | validation | Would have blocked publish |

---

## 22. P0 / P1 / P2 / P3

### P0 — production-breaking
1. Golden Script VO replacement (`voiceAndCaptionsForGolden` default)  
2. KIE single-image; multi-refs never sent  
3. Mid-film speech silence (TTS truncate + long visual tail)  
4. Identity seed insufficient (wash+base → alien robots)

### P1 — severe quality
5. Caption/story mismatch vs Golden  
6. Memory last-frame drift compounding  
7. CTA identity collision across goldens  
8. Diversity defeated by template VO  
9. Prompt contradictions (photoreal vs Pixar)

### P2 — important
10. Native audio strip (design debt)  
11. Quiet music bed misread as silence  
12. Packaging IDs still golden-006  
13. Duration policy vs golden meta

### P3 — cosmetic
14. Telemetry/render package naming  
15. Minor env wash differences

---

## 23. Exact Fix Plan (PLAN ONLY — DO NOT IMPLEMENT)

Ordered for maximum impact; **no code in this audit**:

1. **Make Golden narration source-of-truth** — map each `GOLDEN_NUM` (or script fields) to VO/captions from Golden beats; delete silent default-to-006 path.  
2. **Fail-closed TTS** — if `narration.duration < expected_floor` or word coverage < threshold, stop before Veo.  
3. **Wire KIE refs** — send bible (+ optional last frame) in actual API fields KIE supports; do not claim refs in metadata only.  
4. **Revisit `generationType`** — do not advertise first+last without two frames.  
5. **Strengthen identity seed** — stop relying on wash+single paste as sole I2V lock.  
6. **Align master length to narration** when narr short (or reject), instead of padding quiet video.  
7. **Only then** revisit prompt contradictions / diversity scoring.

---

## Appendix A — Evidence paths

| Item | Path |
|---|---|
| Latest master | `.amynest-assets/v5-inspect-golden-012/amynest-veo-720p-golden-012.mp4` |
| Narration | `.amynest-assets/v5-inspect-golden-012/audio/narration.wav` |
| Plan | `.amynest-assets/v5-inspect-golden-012/work/cinematic/composition-plan.json` |
| Continuity | `.amynest-assets/v5-inspect-golden-012/work/cinematic/continuity.json` |
| Concat | `.amynest-assets/v5-inspect-golden-012/concat.txt` |
| VO mutation | `content-engine/operations/google-production-run.ts` → `voiceAndCaptionsForGolden` |
| KIE video client | `content-engine/asset-engine/providers/kie-video/client.ts` |
| Keyframes | `content-engine/creative-composition/keyframes.ts` |
| Assemble | `assembleMaster` in `google-production-run.ts` |

## Appendix B — Statement

Findings are tied to files, functions, fields, measured durations, hashes, Whisper transcripts, and HTTP payload shape.

Not accepted as root causes: “prompt needs improvement,” “KIE sometimes does this,” “AI is inconsistent,” “references should help.”

---

# DO NOT IMPLEMENT UNTIL AUDIT IS REVIEWED
