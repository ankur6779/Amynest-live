# VIDEO_MODEL_RECOMMENDATION

**Date:** 2026-07-29  
**Scope:** Google AI Studio / Gemini API models available to this project  
**Constraint:** No architecture change · no blind provider switch · recommendation only  

---

## Executive verdict

**Do not switch video models yet.**

The montage failure is primarily a **scene-generation design failure** (still plates + camera crop), not proof that Veo is the wrong engine.

| Decision | Choice |
|---|---|
| Keep as current video engine | **Veo 3.1 Fast** (`veo-3.1-fast-generate-preview`) for daily shots |
| Escalate hero / identity-critical shots | **Veo 3.1 Standard** (`veo-3.1-generate-preview`) |
| Reject for mascot identity shots | **Veo 3.1 Lite** (no `referenceImages`) |
| Candidate to evaluate next (not switch yet) | **Gemini Omni Flash** (`gemini-omni-flash-preview`) |
| Not video generators | Gemini 2.5/3.x Flash/Pro text models, Gemini Live |
| Still plates only (never hero scenes) | Imagen 4 / Gemini Flash Image (“Nano Banana”) |

**Required before any default switch:** an AmyNest-character bake-off (see §7).  
Google’s docs now position Omni as the default for character consistency — that is **vendor guidance**, not AmyNest proof. We will not switch on assumptions.

---

## 1. Root cause of the “AI slideshow”

Current creative composition often:

1. Generates **Imagen stills** of characters/environments  
2. Applies **ffmpeg crop / Ken Burns motion**  
3. Stitches plates into a Short  

That produces a PowerPoint / Canva montage even when engineering certification PASSes.

**Brand goal requires continuous performance shots:**

- camera motion *inside* the generated video  
- character motion (eyes, hands, walk, point, smile, talk)  
- same three mascots every episode  
- app UI as a prop for ≤2s  

That means **video models must generate the performances**. Image models may only create locked keyframes / reference plates.

---

## 2. Live inventory (this API key, 2026-07-29)

Queried: `GET https://generativelanguage.googleapis.com/v1beta/models`

### Video-capable generators (output video)

| Model ID | Display | Method | Role |
|---|---|---|---|
| `veo-3.1-generate-preview` | Veo 3.1 | `predictLongRunning` | Premium Veo |
| `veo-3.1-fast-generate-preview` | Veo 3.1 fast | `predictLongRunning` | Daily Veo (current AmyNest default) |
| `veo-3.1-lite-generate-preview` | Veo 3.1 lite | `predictLongRunning` | Budget Veo |
| `gemini-omni-flash-preview` | Gemini Omni Flash Preview | `generateContent` / Interactions API | Newer multimodal video gen + conversational edit |

### Not marketing-video generators

| Model family | Why excluded from hero video |
|---|---|
| `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3.x-flash/pro` | Text/reasoning; can **understand** video and write prompts/scripts — do **not** emit cinematic MP4s |
| `gemini-*-flash-live*`, `gemini-2.5-flash-native-audio*` | **Realtime conversation** (WebSocket audio/vision) — not offline Short rendering |
| `gemini-*-flash-image*`, `gemini-3-pro-image*`, Imagen 4 | **Image** generation/editing — keyframes/references only |
| `lyria-3-*` | Music only |

---

## 3. Model-by-model comparison (marketing Short criteria)

Criteria weighted for AmyNest:

1. Consistent animated mascot characters  
2. Cinematic camera movement  
3. Storytelling / continuous performance  
4. Fit for ~20s Shorts (multi-shot stitch)  
5. Prompt adherence + controllable identity  
6. Production readiness in *this* repo  

### 3.1 Veo 3.1 Standard — `veo-3.1-generate-preview`

| Dimension | Assessment |
|---|---|
| Pros | Highest Veo fidelity; native audio; image-to-video; up to 3 reference images; first/last frame; **scene extension** (+7s chains); 720p/1080p/4k; already in AmyNest media stack |
| Cons | Slowest / most expensive Veo tier; reference-image path has API constraints (often 8s; reference workflow historically stricter on 16:9 — verify before relying on 9:16 + refs) |
| Character consistency | **Best inside Veo family** when using reference images + short motion-only prompts |
| Animation quality | Strong cinematic motion; Pixar-like stylization possible via prompt |
| Camera movement | Excellent (dolly, pan, push documented in Veo prompt guide) |
| Prompt adherence | Strong on clear subject/action/camera prompts |
| AmyNest fit | **Hero / identity-critical beats** |

### 3.2 Veo 3.1 Fast — `veo-3.1-fast-generate-preview`

| Dimension | Assessment |
|---|---|
| Pros | Same feature class as Standard for refs / image-to-video / extension; faster; cheaper; **current config dailyModel** |
| Cons | Slightly below Standard polish on hard identity shots |
| Character consistency | Good with image-to-video from bible keyframes; weaker than Standard on text-only |
| Animation quality | Production-usable for Shorts |
| Camera movement | Strong |
| Prompt adherence | Strong when prompts are motion-first |
| AmyNest fit | **Keep as default daily engine** until bake-off says otherwise |

### 3.3 Veo 3.1 Lite — `veo-3.1-lite-generate-preview`

| Dimension | Assessment |
|---|---|
| Pros | Cheapest / fastest iteration; text + image-to-video; 9:16; native audio |
| Cons | Official docs: **`referenceImages` = n/a**; **no video extension**; lower ceiling for mascot lock |
| Character consistency | **Insufficient for permanent brand mascots** |
| Animation quality | Acceptable for B-roll / environment-only |
| Camera movement | Adequate |
| Prompt adherence | OK for simple scenes |
| AmyNest fit | Background / non-character only — **never Amy AI / Girl / Boy identity shots** |

### 3.4 Gemini Omni Flash — `gemini-omni-flash-preview`

| Dimension | Assessment |
|---|---|
| Pros | Official Google video overview (2026) recommends Omni as **default** for coherence + **character consistency** + multi-turn edit; subject/reference images; 9:16 supported; conversational refinement without full regen; available on this API key |
| Cons | Preview; Interactions API (not current AmyNest Veo `predictLongRunning` path); output currently **720p / 3–10s**; less proven in this repo; no Veo-style scene-extension parity documented the same way |
| Character consistency | **Vendor-claimed best** for multi-shot identity — **unproven on AmyNest bibles** |
| Animation quality | Strong for continuous motion; polish vs Veo Standard needs bake-off |
| Camera movement | Good; cinematic control via prompt + iterative edit |
| Prompt adherence | High when used with reference images + “keep everything else the same” edits |
| AmyNest fit | **Primary bake-off challenger** — do not adopt as default until AmyNest evidence |

### 3.5 Gemini 2.5 Flash / Gemini 2.5 Pro

| Dimension | Assessment |
|---|---|
| Pros | Excellent directors: shot lists, performance scripts, continuity checks, OCR/QA on frames |
| Cons | **Do not generate marketing video** |
| Character consistency | N/A as renderer |
| AmyNest fit | Keep for **script / AI Director / validation text** — not for MP4 performance |

### 3.6 Gemini Live (`gemini-3.1-flash-live-preview`, native-audio Live models)

| Dimension | Assessment |
|---|---|
| Pros | Realtime voice + vision agents |
| Cons | Wrong product surface for offline YouTube Shorts pipeline |
| AmyNest fit | **Out of scope** for marketing render |

### 3.7 Image models (Imagen 4 / Nano Banana family)

| Dimension | Assessment |
|---|---|
| Pros | Fast keyframes; Nano Banana strong at character-locked stills + multi-image compose |
| Cons | Still images → montage if used as scenes |
| AmyNest fit | **Reference plates + first frames only**, then animate via Veo/Omni |

---

## 4. Scorecard (relative, for ~20s mascot Short)

Scale: 1–5 (5 = best for AmyNest brand goal)

| Model | Mascot consistency | Animation life | Camera | Storytelling | 20s Short fit | Prompt control | Production readiness |
|---|---:|---:|---:|---:|---:|---:|---:|
| Veo 3.1 Standard | 4 | 5 | 5 | 4 | 4 | 4 | 5 |
| Veo 3.1 Fast | 4 | 4 | 5 | 4 | 5 | 4 | **5** |
| Veo 3.1 Lite | 2 | 3 | 3 | 2 | 3 | 3 | 4 |
| Gemini Omni Flash | **4–5*** | 4 | 4 | **5*** | 4 | 4 | 2 |
| Gemini 2.5 Flash/Pro | 0 | 0 | 0 | 0† | 0 | 5† | 5† |
| Gemini Live | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Imagen / Flash Image | 3‡ | 1 | 1 | 1 | 1 | 4 | 5 |

\* Vendor claim / design intent — pending AmyNest bake-off  
† Useful as director/script, not renderer  
‡ Consistency only as still references, not performances  

---

## 5. Recommendation

### Keep Veo (with redesigned scene generation)

**Why Veo remains the correct engine to keep now**

1. Already integrated and proven end-to-end in AmyNest (Veo clips exist; certification path works).  
2. Official capabilities match mascot ads: **image-to-video**, **reference images** (Standard/Fast), **extension** for longer continuous performances, native audio, 9:16.  
3. Omni is promising but **preview + different API surface**; switching without bake-off would be assumption-driven.  
4. The brand failure is that scenes were built as **still montages**, not that Veo cannot animate.

### Redesign scene generation (creative rules — implement later)

1. Every shot is a **continuous video generation** (Veo image-to-video or text-to-video), never an Imagen plate as the hero.  
2. Lock identity with **official bible / base assets** as first-frame or reference images.  
3. Prompts describe **performance + camera**, not wardrobe redesign.  
4. Cast only Amy AI + Amy Girl + Amy Boy — never random children/parents as replacements for mascots.  
5. App UI ≤2s inside tablet/phone/desk interaction.  
6. Stitch 4–8s continuous clips into ~20s episode (Veo extend where continuity needs it).  
7. Imagen/Nano Banana allowed only to mint **locked keyframes**, then immediately animate.

### When to switch to Omni

Switch default **only if** the §7 bake-off shows Omni wins on AmyNest identity + motion without unacceptable quality/API risk.

Until then: **Veo Fast daily · Veo Standard hero · Omni challenger**.

### Explicit non-switches

| Temptation | Decision |
|---|---|
| Use Gemini Live for Shorts | No |
| Use Gemini 2.5 Pro as video model | No |
| Use Veo Lite for Amy characters | No |
| Use Imagen plates as scenes | No |
| Blind-switch to Omni because Google blog says “default” | No — bake-off first |

---

## 6. Recommended production topology (future implementation — not now)

```
Gemini Flash/Pro  →  episode script + shot list + performance beats
Nano Banana / locked bible  →  character keyframes (identity locks)
Veo 3.1 Fast/Standard  →  continuous performance clips (image-to-video)
Optional Omni Flash  →  iterative identity repairs (after bake-off)
Lyria  →  music bed
Gemini TTS  →  parent-facing narration (if not using Veo dialogue)
Stitch  →  20s Short + premium CTA
```

---

## 7. Mandatory AmyNest bake-off (before any model switch)

Run the **same** three prompts for each model:

1. Amy AI floats into living room, waves, points to tablet  
2. Amy Girl opens tablet, smiles, taps Study Zone  
3. Amy Boy celebrates lesson complete  

Inputs:

- Official bible/base plates as references / first frames  
- 9:16, ~8s, Pixar-family lighting  
- Identical performance language  

Score blindly:

- Identity lock (hair/clothes/body/face)  
- Motion life (eyes/hands/walk)  
- Camera cinematography  
- No random humans  
- Prompt adherence  

**Pass rule to switch:** Omni must beat Veo Fast on identity + motion for ≥2/3 shots with no critical brand break, and must be automatable in the existing render path without architecture rewrite.

---

## 8. Sources

- Live model list via Gemini API (`v1beta/models`) on this project key — 2026-07-29  
- [Generate videos with Veo 3.1](https://ai.google.dev/gemini-api/docs/veo) — parameters, reference images, extension, Lite limits  
- [Video generation overview](https://ai.google.dev/gemini-api/docs/video) — Omni vs Veo positioning  
- [Gemini Omni Flash](https://ai.google.dev/gemini-api/docs/omni) — reference/subject video, 9:16, conversational edit  
- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live-api) — realtime, not Short render  
- AmyNest config: `content-engine/config/default.json` (`veo-3.1-fast` daily / `veo-3.1` premium / `veo-3.1-lite` budget)

---

## 9. Bottom line

**Keep Veo. Redesign how scenes are generated.**  
Treat Imagen montages as banned for hero storytelling.  
Evaluate Omni Flash with evidence before any default change.
