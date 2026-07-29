# COST_EXECUTION_POLICY

**Mode:** Offline First → Cache First → API Last  
**Scope:** Provider selection & API usage only  
**Non-goals:** No production pipeline, rendering, publishing, or validator changes  

---

## Principle

Every external API call is an expensive operation.

Approved AmyNest assets are immutable production inputs. If they already exist, **never regenerate them**.

---

## Priority stack

| Priority | Tier | When to use |
|---:|---|---|
| 1 | **FREE — existing project assets** | Golden Scripts, storyboards, Director Packages, character bible, CTA / SEO / metadata / thumbnail templates, Continuous Learning recommendations, previous approved prompts |
| 2 | **LOCAL reasoning** | Metadata, titles, descriptions, hashtags, playlist selection, keywords, camera/shot planning, script selection — Cursor / local mock templates, **not Gemini** |
| 3 | **LOW-COST APIs** | Only when required: Gemini TTS, music (Lyria) |
| 4 | **HIGH-COST APIs** | Media only: Veo, Imagen — **never for text** |

---

## Which tasks now use local reasoning (no LLM API)

| Task | Provider / source |
|---|---|
| Script selection | Golden Scripts (`golden-scripts/`) — immutable |
| Content package text when `scriptProvider=mock` | Local mock templates |
| Titles / title variants | Publishing polish (local) |
| Descriptions / SEO description variants | Publishing polish + SEO templates (local) |
| Hashtags / tags / keywords | Publishing polish + hashtag engine (local) |
| Playlist selection | Topic → playlist mapping (local) |
| Pinned comment / store links | Metadata templates (local) |
| EN + Hindi localization copy | Curated local templates |
| Thumbnail title / SEO scorecard | Local scoring |
| Best upload time | Continuous Learning history or 7:00 PM IST default |
| Camera / shot planning (director reuse) | Existing Director Package when present |
| Storyboard reuse | Existing storyboard fingerprint / cache |
| Character identity | Character bible / official bases (local assets) |
| CTA plates | CTA templates / premium CTA builder (local compose) |

---

## Which tasks still require APIs

| Task | API | Notes |
|---|---|---|
| Character / scene video | **Veo** (high cost) | Only when no reusable clip / cache hit |
| Fresh stills (if needed) | **Imagen** (high cost) | Only after local-library + cache miss |
| Narration audio | **Gemini TTS** (low cost) | Reuse `narration.wav` when present |
| Bed music | **Lyria / music API** (low cost) | Reuse `music.wav` when present |
| Optional paid script rewrite | Gemini / OpenAI | **Off by default** — requires `AMYNEST_SCRIPT_PROVIDER` |

---

## Asset policies

### Golden Scripts

- Approved Golden Scripts are **immutable**.
- Always reuse `buildGoldenScript` / seed catalog.
- Never call an LLM to regenerate an approved Golden Script.

### Director Packages

- If a Director Package already exists for the fingerprint, **reuse it**.
- Do not re-direct the same storyboard without a fingerprint change.

### Storyboards

- Reuse existing storyboard whenever the topic + brand lock fingerprint matches.
- Prefer cache / prior package over a new storyboard pass.

### Cache (mandatory before API)

Before **any** paid media/TTS/music request:

1. Check asset cache (fingerprint + TTL).
2. Check local library / prior production outputs.
3. Only then call Veo / Imagen / TTS / music.

---

## Config knobs (provider selection)

| Env / config | Cost-first behavior |
|---|---|
| `AMYNEST_COST_FIRST` | Default **on**. Set `false` to disable. |
| `scriptProvider` | Default **`mock`** (local). |
| `AMYNEST_SCRIPT_PROVIDER` | Explicit paid LLM only when set (`gemini` / `openai`). |
| `AMYNEST_GEMINI_ENABLED` | Enables **media** stack — does **not** force Gemini scripts. |
| `AMYNEST_VEO_ENABLED` | Enables Veo for video media only. |
| `preferredProviders` | `local-library` → illustration → placeholder → Imagen → Veo |
| `assetPriority` | `local-library` → `cache` → screen-recording → ai-image → fallback |
| `maximumAIAssets` | Default **2** (4 when media opt-in) |

Implementation: `content-engine/config/cost-execution.ts` applied from layered configuration.

---

## Estimated API calls saved per video

Baseline (naive, regenerate everything) vs cost-first:

| Call type | Naive | Cost-first | Saved / video |
|---|---:|---:|---:|
| Script LLM | 1 | 0 | **1** |
| Title / description / hashtag LLM | 2–4 | 0 | **2–4** |
| Director / planning LLM | 1 | 0 (reuse) | **1** |
| Storyboard LLM | 1 | 0 (reuse) | **1** |
| Imagen stills | 3–6 | 0–1 (cache/local) | **2–5** |
| Veo clips | 4–5 | 0–4 (reuse clips) | **1–5** |
| TTS | 1 | 0–1 (reuse wav) | **0–1** |
| Music | 1 | 0–1 (reuse wav) | **0–1** |

**Typical Short after first successful production:**  
**~8–15 paid calls avoided** (mostly text LLMs + regenerated stills/clips).

**Steady-state daily Short (reuse narration/music/clips when fingerprint matches):**  
**~10–18 calls avoided**; remaining paid work is usually **0–4 Veo** + **0–1 TTS** if audio missing.

---

## Estimated monthly savings

Assumptions (illustrative; list prices fluctuate):

- 30 Shorts / month  
- Naive path ≈ 14 billable calls / video (mixed text + media)  
- Cost-first path ≈ 3 billable calls / video (Veo-heavy days) or ≈ 1 (full reuse days)  
- Blended average under cost-first ≈ **2.5 billable calls / video**

| | Naive | Cost-first | Delta |
|---|---:|---:|---:|
| Billable calls / month | ~420 | ~75 | **~345 saved** |
| Text LLM share | ~150 | ~0 | **~150 saved** |
| Media (Veo/Imagen) | ~240 | ~60–75 | **~165–180 saved** |

**Rough USD band (order-of-magnitude):**  
If blended media+text ≈ $0.15–$0.80 per naive video vs $0.05–$0.35 cost-first:

- **~$3–$15 / month** at very low volume, or  
- **~$50–$200+ / month** when Veo is the dominant cost and reuse rate is high  

Exact savings track Veo minutes avoided + Imagen images avoided. Text LLM elimination alone removes an entire class of spend.

---

## Guardrails

1. Never use Veo/Imagen for titles, descriptions, tags, or scripts.  
2. Never regenerate an approved Golden Script.  
3. Never skip cache/local checks before a paid media call.  
4. Gemini opt-in enables **media**, not automatic script LLM spend.  
5. Publishing / rendering / validators remain unchanged.

---

## Related code

| File | Role |
|---|---|
| `config/cost-execution.ts` | Cost-first provider selection |
| `config/default.json` | Defaults: `scriptProvider=mock`, local-first providers |
| `config/asset-engine.ts` | Asset provider defaults |
| `operations/configuration/engine.ts` | Applies cost-first after env layer |
| `asset-engine/resolver/engine.ts` | Cache tier before AI providers |
| `golden-scripts/` | Immutable script catalog |
