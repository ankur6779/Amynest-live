# KIE Generated Reference Provenance Audit

**Mode:** ZERO API / ZERO KIE CREDITS / OFFLINE ONLY  
**Date:** 2026-08-31  
**Targets:** `9a043e…` (Golden 010) · `4241de…` (Golden 011)  
**Status:** Diagnosis only — no generation — no code/prompt changes

---

## Executive finding

The two “generated intermediate references” implicated in failing KIE requests are **different kinds of artifacts**:

| Hash | Role on failing shot | How it was produced | Provider API used to make the PNG? |
|------|----------------------|---------------------|--------------------------------------|
| **`9a043e55794c…`** | Memory last-frame fed into **010 `shot-amy-girl-learn`** | **ffmpeg freeze** from successful **`shot-amy-host-raw.mp4`** (KIE Veo video) | **No** (local extract). Upstream video **was** KIE-generated. |
| **`4241de9b84cf…`** | Identity keyframe fed into **011 `shot-amy-host`** | **Local PIL composite** (`writeIdentityKeyframe`) from official **`amy-ai-base.png` + environment RGB wash** | **No** — never sent to an image model. Deterministic bytes for `(character=amy-ai, environment)`. |

**Earliest divergence vs successful controls**

1. **011:** Content-diversity assigns host environment **`apartment-hallway`** → identity wash differs from 009/010 (`car-ride` → `71881865…`) and 012 (`living-room` → `acc493d9…`). Same `(amy-ai, apartment-hallway)` recipe also appears in older runs (golden-007, v5-inspect-010) with **byte-identical** `4241de…`.
2. **010:** Host Veo clip succeeds, then freeze yields unique memory `9a043e…`. Successful 009/012 learn shots use **different** host-last hashes (`09a6bdac…` / `7ae34c50…`) from **different** host videos.

**Does either frame alone prove the KIE “restricted third-party content” trigger?**  
**UNKNOWN** — both contain first-party AmyAi branding; successful controls also send AmyAi-branded continuity frames. Correlation ≠ proven causation.

---

## 1. Exact files

### 010 — `9a043e…`

| Field | Value |
|-------|--------|
| Absolute path | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-regression-golden-010/work/cinematic/character-memory/shot-amy-host-last.png` |
| Filename | `shot-amy-host-last.png` |
| SHA-256 | `9a043e55794c931842ea4f89a5e96f75570233aa6594983a8931140b5c7f164f` |
| Dimensions | 720×1280 |
| Format | PNG, 8-bit RGB |
| Bytes | 812849 |
| File mtime | 2026-08-20T00:14:10 |
| Production / out dir | `p0-regression-golden-010` (`AMYNEST_OUT_DIR_NAME`) |
| Golden ID | `golden-010` |
| Source scene / shot (freeze source) | `shot-amy-host` |
| Consumer shot (KIE fail) | `shot-amy-girl-learn` |
| Occurrences in asset store | **1** (this path only) |

**Freeze verification (offline ffmpeg, same recipe as `freezeLastFrame`):**  
Extracting `-sseof -0.12` from `…/veo/shot-amy-host-raw.mp4` reproduces **exact** SHA `9a043e55794c…` — **PROVEN**.

### 011 — `4241de…`

| Field | Value |
|-------|--------|
| Absolute path (failing run) | `/Users/macbook/AmyNestProject/AmyNest-AI/.amynest-assets/p0-regression-golden-011/work/cinematic/keyframes/shot-amy-host-identity.png` |
| Filename | `shot-amy-host-identity.png` |
| SHA-256 | `4241de9b84cf83a32ef29be93874b2a5a99d36c68d2111a8287175bcee990274` |
| Dimensions | 1080×1920 |
| Format | PNG, 8-bit RGB |
| Bytes | 937735 |
| File mtime (regression) | 2026-08-20T00:16:43 |
| Production / out dir | `p0-regression-golden-011` |
| Golden ID | `golden-011` |
| Shot ID | `shot-amy-host` |
| Character | `amy-ai` |

**All byte-identical occurrences (complete store search):**

| Path | mtime |
|------|-------|
| `…/p0-regression-golden-011/work/cinematic/keyframes/shot-amy-host-identity.png` | 2026-08-20 |
| `…/p0-fix-golden-011/work/cinematic/keyframes/shot-amy-host-identity.png` | 2026-08-19 |
| `…/v5-inspect-golden-010/work/cinematic/keyframes/shot-amy-host-identity.png` | 2026-08-08 |
| `…/kie-veo-720p-golden-007/work/cinematic/keyframes/shot-amy-host-identity.png` | 2026-08-07 |

---

## 2. Origin chain

### 010 — `9a043e…` (memory)

```
Canonical amy-ai-base + ENV wash (host identity keyframe)
  + amy-ai-bible + amy-girl-bible
  + performancePrompt(shot-amy-host)
        ↓
KIE Veo generate → shot-amy-host-raw.mp4  (PROVEN on disk; 720×1280; 8.0s; succeeded)
        ↓
attachLastFrameMemory / freezeLastFrame (ffmpeg -sseof -0.12)
        ↓
STORED: character-memory/shot-amy-host-last.png  (= 9a043e…)
        ↓
seedForShot(learn): sameLeadContinues because host memory.characters includes amy-girl
        ↓
NEXT SHOT shot-amy-girl-learn [memory→video]
  imageUrls ≈ [girl-bible, 9a043e… memory, amy-bible]   (PROVEN in console logs)
        ↓
KIE safety reject on learn
```

Code path (read-only):

- `creative-composition/compose.ts` — after host clip: `attachLastFrameMemory(sceneMemory, rawVeo, memoryDir)`
- `character-memory-engine/runtime.ts` — writes `${sceneId}-last.png`
- `character-memory-engine/freeze.ts` — local ffmpeg only
- `character-memory-engine/seed.ts` — if previous memory cast includes lead character → `usedPreviousFrame: true`, primary seed = last frame

### 011 — `4241de…` (identity)

```
Official brand asset amy-ai-base.png
  SHA 4739c817741dbe6a…  (1024×571 RGB)
        ↓
writeIdentityKeyframe({ character: amy-ai, environment: <diversity host loc> })
  → solid ENV_RGB wash 1080×1920 + paste/resized base + contact shadow
        ↓
STORED: keyframes/shot-amy-host-identity.png  (= 4241de… when env resolves to apartment-hallway wash family)
        ↓
seedForShot(host): usedPreviousFrame=false (character change from hook girl → amy-ai)
        ↓
KIE imageUrls ≈ [amy-bible, 4241de… identity, girl-bible]  (PROVEN in console logs)
        ↓
KIE safety reject on host
```

Code path:

- `creative-composition/keyframes.ts` — `writeIdentityKeyframe` (PIL only; **no prompt**; inputs = character base path + `ENV_RGB[environment]`)
- `compose.ts` always calls `writeIdentityKeyframe` before each shot
- Diversity (`content-diversity/diversify-plan.ts`) sets `shot.environment` from location pool

**Host environment for 011 (from diversity report locations order):**  
`['mirror-practice-nook', 'apartment-hallway', 'garden', 'car-ride', 'cta-stage']`  
→ living shot index 1 = **`apartment-hallway`**.  
Plans that used `apartment-hallway` for host (golden-007, v5-inspect-010) share **identical** identity SHA — **STRONGLY INDICATED** that `4241de…` = deterministic `(amy-ai, apartment-hallway)` composite, not a cross-run file copy.

---

## 3. Canonical vs generated comparison

### Canonical assets (source of truth)

| Asset | SHA-256 | Role |
|-------|---------|------|
| `amy-ai-bible.jpeg` | `6f65f19d2ac5…` | Multi-panel Character Bible sheet (text headers, AmyAi on cap) — sent as KIE bible ref |
| `amy-ai-base.png` | `4739c817741d…` | Single character cutout used for **identity keyframe** compositing (not the bible sheet) |
| `amy-girl-bible.jpeg` | `dc09bf858293…` | Multi-panel girl sheet |
| `amy-girl-base.png` | `ee5a70e45017…` | Girl base for girl identity keyframes |

### `9a043e…` vs canonical

| Check | Observation | Label |
|-------|-------------|-------|
| Different character? | No — Amy AI + Amy Girl recognizable | **PROVEN** (visual) |
| Different face/body vs bible? | Host last-frame is **Veo-interpreted** performance, not a crop of the bible sheet | **PROVEN** different encoding; identity intent preserved |
| Clothing | Girl: purple hoodie + yellow bow (matches girl bible intent). Amy: purple AmyAi cap | **PROVEN** |
| Logo | **AmyAI** text clearly readable on cap | **PROVEN** |
| Extra characters | Amy + girl together | **PROVEN** |
| UI / watermark / franchise logo | No Play Store badge, no Disney mark; notebook/calendar prop with illegible marks | **PROVEN** no third-party logo observed |
| Physical contact | Amy arm around girl + pointing at book | **PROVEN** |
| Third-party visual style | Soft 3D family-animation look | Observable; **not** proven as policy trigger |

### `4241de…` vs canonical Amy

| Check | Observation | Label |
|-------|-------------|-------|
| Source | Composited from **`amy-ai-base`**, not from bible sheet | **PROVEN** (code) |
| Face/body/hat/headphones | Matches Amy mascot design | **PROVEN** |
| Logo | **AmyAi** on cap | **PROVEN** |
| Extra characters | None | **PROVEN** |
| UI / watermark | None beyond AmyAi branding | **PROVEN** |
| Background | Soft grayish env wash (not bible’s dark UI sheet) | **PROVEN** |
| vs 009 identity `71881865…` | Same character recipe; different wash tint (car-ride vs apartment-hallway family) | **PROVEN** different SHA; **STRONGLY INDICATED** env-driven |

### Amy Boy

Not present in either target frame. N/A for these two hashes.

---

## 4. Prompt provenance

### Identity frame `4241de…`

| Stage | Prompt? |
|-------|---------|
| `writeIdentityKeyframe` | **None** — pure image composite |
| Character Bible / Director / Studio | Not invoked for this PNG |
| Veo `performancePrompt(shot-amy-host)` | Applies to the **video** request that **uses** this PNG as a reference — does **not** create the PNG |

Instructions that make identity differ from the **bible sheet** (not from base):

- Uses **`amyAiBase`**, not `amyAiBible`
- Scales character to ~72% of frame height on a solid `ENV_RGB` wash
- Adds soft contact shadow
- No text from Character Memory / Performance Director baked into the PNG

### Memory frame `9a043e…`

| Stage | Prompt? |
|-------|---------|
| ffmpeg freeze | **None** — samples pixels from host video |
| Upstream host video | Full `performancePrompt(shot-amy-host)` + identity/bible refs (Disney+/Pixar/Paddington/… template language lives here) |

Anything that made the **host video** (hence the freeze) diverge from a still canonical portrait:

- Veo performance direction (kneel, interact, book/prop, photoreal room, AmyAi actor language)
- Multi-ref stack including girl bible
- Diversity location/prop notes on the host shot

Those instructions affect **`shot-amy-host-raw.mp4`**, then only indirectly `9a043e…`.

---

## 5. Memory / identity selection provenance

### Why `9a043e…` became the 010 memory image

| Question | Answer | Confidence |
|----------|--------|------------|
| Generated from canonical reference directly? | **No** — freeze of Veo video | **PROVEN** |
| From previous scene video? | **Yes** — `shot-amy-host-raw.mp4` | **PROVEN** |
| From previous production’s asset? | **No** — unique hash; single store occurrence | **PROVEN** |
| Stale cache? | **No** — recomputed when host clip exists; mtime after host raw | **PROVEN** |
| Selected by scene index / character ID? | Path = `{memoryDir}/{sceneId}-last.png` with `sceneId=shot-amy-host`; chosen for learn because `resolveGenerationSeed` sees `amy-girl ∈ previousMemory.characters` | **PROVEN** |
| Fallback? | Only if freeze throws (would skip lastFramePath) — freeze succeeded | **PROVEN** |

### Why `4241de…` became the 011 identity image

| Question | Answer | Confidence |
|----------|--------|------------|
| Generated from canonical **base**? | **Yes** — `amy-ai-base.png` | **PROVEN** |
| From previous video? | **No** | **PROVEN** |
| Stale cache hit from another Golden? | **Not a cache** — function always rewrites path; identical SHA means **identical inputs** `(amy-ai, same ENV_RGB)` | **STRONGLY INDICATED** |
| Selected by character ID? | Yes — `shot.character === amy-ai` | **PROVEN** |
| Selected by environment / diversity? | Yes — host env from diversity locations | **STRONGLY INDICATED** |
| Selected by production ID? | Path is under production out-dir; **pixel content ignores production ID** | **PROVEN** |

---

## 6. Cache collision audit

### Hash reuse

| Hash | Unique? | Interpretation |
|------|---------|----------------|
| `9a043e…` | **Unique** (1 file) | Per-run Veo→freeze output |
| `4241de…` | **4 paths**, 4 productions, same bytes | Deterministic identity recipe collision **across** Goldens/dates |

### Cache keys

`writeIdentityKeyframe` has **no cache layer and no cache key**.

Effective content inputs:

| Component | In path? | In pixel content? |
|-----------|----------|-------------------|
| Production / out-dir name | **Yes** (`…/p0-regression-golden-011/…`) | **No** |
| Golden ID | Indirect via out-dir | **No** |
| Scene / shot ID | **Yes** (`shot-amy-host-identity.png`) | **No** |
| Character ID | Via which base file is opened | **Yes** (which base) |
| Environment ID | Via `ENV_RGB` only | **Yes** (wash color) |

**Missing from content uniqueness (report only — no fix):** production ID, Golden ID, shot index, timestamp, prompt hash — so different Goldens with the same `(character, environment)` **must** produce identical identity PNGs. That is **PROVEN** by `4241de…` appearing in golden-007 and golden-011.

This is **content-key collision**, not a proven “wrong file copied from another Golden’s workdir.”

---

## 7. Successful control comparison

| Artifact | 009 (OK) | 010 (fail learn) | 011 (fail host) | 012 (OK) |
|----------|----------|------------------|-----------------|----------|
| Host identity SHA | `71881865…` | `71881865…` (host OK) | **`4241de…` FAIL** | `acc493d9…` |
| Diversity host-ish loc | car-ride (plan) | car-ride (locs[1]) | **apartment-hallway (locs[1])** | living-room (plan) |
| Host memory SHA | `09a6bdac…` | **`9a043e…`** → learn FAIL | (host never completed) | `7ae34c50…` |
| Learn uses memory→video | Yes | Yes | n/a | Yes |

**Why successful productions use their intermediate refs**

- Same architecture: identity→video for host; freeze host → memory→video for learn when cast continues.
- 009/012 prove that pattern can pass KIE with girl+amy bibles + continuity frames.

**Why failing productions use these hashes**

- **011:** diversity environment for host yields the `4241de…` identity composite (shared with any other run using amy-ai + that env wash).
- **010:** whatever Veo returned for host (successful) froze to `9a043e…`; learn then attached that unique memory.

**Earliest divergence**

1. **Diversity location assignment** for host (011 vs 009/010/012) → different identity bytes before any host Veo call.  
2. **Host Veo output** (010 vs 009/012) → different memory bytes before learn Veo call.

---

## 8. Safety-relevant observations (observable only)

| Observation | On `9a043e…` | On `4241de…` | On successful 009 memory/identity | Confidence as KIE trigger |
|-------------|--------------|--------------|-----------------------------------|---------------------------|
| AmyAi / AmyAI logo text | Yes | Yes | Yes | **UNKNOWN** (present in PASS and FAIL) |
| Child + robot interaction | Yes | No | Yes (009 memory) | **UNKNOWN** |
| Multi-character frame | Yes | No | Yes | **UNKNOWN** |
| Notebook/calendar prop | Yes | No | Yes (book) | **UNKNOWN** |
| Disney/Pixar marks in pixels | Not observed | Not observed | Not observed | — |
| Watermark / store UI | Not observed | Not observed | Not observed | — |
| Franchise character likeness | Not asserted | Not asserted | Not asserted | — |

**Do not claim** either frame “definitely triggered” KIE. Prior offline safety audit already showed girl-bible sensitivity is intermittent; these frames are **correlated** with fail shots as the **wire-hash delta** vs controls.

---

## 9. Confidence summary

| Claim | Label |
|-------|-------|
| `9a043e…` path/SHA/dims and freeze provenance from 010 host raw | **PROVEN** |
| `4241de…` is local identity keyframe from `amy-ai-base` + env wash | **PROVEN** |
| `4241de…` byte-identical across multiple Goldens/dates | **PROVEN** |
| Identity content key ≈ `(character, environment)` only | **PROVEN** |
| Diversity env assignment is earliest structural divergence for 011 identity | **STRONGLY INDICATED** |
| Host Veo output divergence is earliest divergence for 010 memory | **PROVEN** |
| Either intermediate **is** the sole KIE third-party trigger | **UNKNOWN** |

---

## Absolute rule compliance

- No KIE / external API calls in this audit  
- No new image/video/audio generation for diagnosis (only local hash / ffprobe / freeze-verify / visual inspect of existing files)  
- No code or prompt modifications  

KIE REMAINS LOCKED — NO CREDITS SPENT.
