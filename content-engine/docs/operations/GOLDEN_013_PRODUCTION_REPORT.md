# GOLDEN 013 PRODUCTION REPORT

**Date:** 2026-08-31  
**Status:** **PARTIAL**  
**Publish:** **not attempted** (`AMYNEST_SKIP_UPLOAD=1`; launch gate also FAIL)  
**Output:** `.amynest-assets/kie-veo-720p-golden-013/amynest-veo-720p-golden-013.mp4`

---

## Verdict (12-point checklist)

| # | Check | Result |
|---|--------|--------|
| 1 | Golden 013 topic correct | **PASS** — Breath Play / Health Lab Breath & Calm |
| 2 | Golden 013 narration correct | **PASS** (source) / **PARTIAL** (TTS garble: “847 B.M.”, “a motion spike”) |
| 3 | Characters canonical (wire) | **PASS** — cast bibles only; fail-fast identity system retained |
| 4 | Amy consistent | **PASS** early/mid (cap / headphones / AmyAI); CTA Girl outfit drift noted separately |
| 5 | Amy Girl consistent | **PASS** early/mid (purple, yellow bow, brown hair); CTA frame drift |
| 6 | No generated memory on KIE wire | **PASS** — `GENERATED_MEMORY: 0` every shot |
| 7 | No mid-video silence | **PASS** — `silenceRatio=0` on master audio gate |
| 8 | No truncated narration | **PASS** — TTS 45.84s, coverage 90.4%, master follows VO |
| 9 | Lip-sync strategy respected | **PARTIAL** — speechMode set per beat; shot-hook used silence-lock retry after KIE audio-branch fail |
| 10 | Scenes reflect Golden 013 | **PARTIAL** — after-school calm captions OK; visuals still book/hallway/garden-heavy; weak breath-meter proof; Speech-bucket leftovers in plan props |
| 11 | Ending complete | **PARTIAL** — CTA plate appears (~26s) then **~21s black** while VO continues |
| 12 | CTA not abruptly clipped | **PASS** for plate visibility; **FAIL** for epilogue hold (black pad after fade) |

**Overall: PARTIAL** — identity + audio integrity held; launch/visual story/ending pad did not.

---

## Golden 013 source

| Field | Value |
|-------|--------|
| Script | `content-engine/golden-scripts/013-health.md` |
| ID | `golden-013` |
| Title | Breath Play That Helps Kids Find Calm |
| Topic | Breath-control and calmness-meter games |
| Feature | Health Lab Breath & Calm (`health-lab`) |
| Suggested characters | Amy AI, Amy Girl |
| Suggested duration | 20s (production target ~25–30s; master followed TTS → **49s**) |
| SCRIPT SOURCE | Golden 013 (not 010 learn / Speech Practice template as VO source) |

---

## Pre-flight (from production logs)

```
GOLDEN SCRIPT:
013

CHARACTERS:
amy-girl, amy-ai, amy-boy (celebrate beat)

AMY REF:
6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb

GIRL REF:
dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f

BOY REF:
1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee

GENERATED MEMORY REFS:
0

CROSS CHARACTER REFS:
0  (after single-cast manifest false-positive fix)

SCRIPT SOURCE:
Golden 013
```

### Unblock note (identity authority unchanged)

First attempt failed at compose with `CROSS_CHARACTER_REFERENCES ≠ 0` because single-cast Girl hook correctly attached **same-character** env keyframe after Girl bible, and the manifest counted all `keyframes/` paths as cross.

**Minimal fix only:** in `buildKieReferenceManifest`, count keyframe/base as CROSS only when `cast.length > 1`.  
Did **not** change: `resolveGenerationSeed()`, bible authority, Amy/Girl locks, memory exclusion, or bibles.

---

## Scene list + clip durations

Planned total picture: **28s**. Concatenated Veo performances:

| Shot | Role | Cast (primary) | Env (plan) | Dur | KIE wire hashes (prefix) | Memory on wire |
|------|------|----------------|------------|-----|--------------------------|----------------|
| `shot-hook` | hook | amy-girl | apartment-hallway | **6.0s** | `dc09bf…` + env `9fa583…` | 0 |
| `shot-amy-host` | amy-host | amy-ai (+girl) | garden | **4.0s** | `6f65f1…`, `dc09bf…` | 0 |
| `shot-amy-girl-learn` | discovery | amy-girl (+amy) | car-ride (plan) | **6.0s** | `dc09bf…`, `6f65f1…` | 0 |
| `shot-amy-boy-celebrate` | celebrate | amy-boy (+amy+girl) | living-room | **6.0s** | `1cc38c…`, `6f65f1…`, `dc09bf…` | 0 |
| `shot-cta` | CTA | amy-ai | cta-stage | **6.0s** | `6f65f1…` + env `444571…` | 0 |

Also generated (not in master concat): `cta-wave.mp4` (2.2s), `cta-card.mp4` (3.8s).

**Picture sum in master concat:** 28.0s  
**Master after tpad:** 49.0s  
**Blackdetect:** `black_start:27.93` → `black_end:48.97` (**21.03s**)

Root cause: `tpad=stop_mode=clone` freezes **last frame of `shot-cta`**, which is already ~black fade (~93% near-black). Narration still runs ~18s past picture content.

---

## Character references (canonical)

| Asset | Path | SHA-256 |
|-------|------|---------|
| Amy bible | `brand/assets/amy-ai-bible.jpeg` | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |
| Girl bible | `brand/assets/amy-girl-bible.jpeg` | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| Boy bible | `brand/assets/amy-boy-bible.jpeg` | `1cc38ca7b1f5acc171a4a75d1d667e938c97216d9fad1529d11739d59abbb8ee` |

Single-cast env keyframes (not bibles; not memory):

| Shot | Path hash |
|------|-----------|
| hook identity | `9fa583799c6b9425389b5439c9652f1ef91ddebff2869b56b918173fd45c795f` |
| cta identity | `44457152a8775c298306e5b153b225c8513a199ee137b87b345e22eecce113fc` |

**Generated-memory refs on KIE:** **0** (local freezes present after shot 1; never in `imageUrls`).

---

## Narration / audio / master

| Metric | Value |
|--------|------:|
| Narration duration | **45.84s** |
| TTS coverage | **90.4%** (85 words) |
| TTS provider | google/gemini-3-1-flash-tts |
| Music | kie-suno/V4 (~138s source, mixed down) |
| Planned video | 28s |
| Master | **49s** (= ceil(45.84 + 2.5 breath)) |
| Audio coverage | Narration spans master; music under; **silenceRatio=0** |
| Mid-video VO gaps | None detected by launch audio gate |

### Narration text used (TTS integrity file)

Golden 013 beats present (hook → after-school feelings → calm-down problem → Amy/Health Lab breath + calmness meter → shared breath → download).  
TTS artifacts: “It’s 847 B.M.”; “When a motion spike…”.

---

## Lip-sync assessment

| Shot | speechMode | Notes |
|------|------------|--------|
| hook | reacting | KIE audio-branch fail → silence-lock retry; external VO owns story |
| amy-host | speaking | Amy primary; Girl secondary bible on wire |
| girl-learn | listening | Girl lead; Amy companion — avoids dual talking mouths by mode |
| boy-celebrate | reacting | Prefer reaction over fake lip sync |
| cta | speaking | Amy invite before fade |

Overall: **PARTIAL** — mode policy followed; hook silence-lock is acceptable for external narration; not a full manual lip audit.

---

## Scene diversity vs Golden 013 story

| Aspect | Finding |
|--------|---------|
| Locations (diversity report) | apartment-hallway / garden / car-ride / living-room / cta-stage — **not** study-desk clone of 010 |
| Captions / VO | Match Golden 013 calm / breath / Health Lab copy |
| Visual proof of breath/calm meter | **Weak** — sampled frames show book / hallway / garden sitting / family look; not clear meter rise / breath cues |
| Plan prop leftovers | `mic`, `mouth practice card`, playlist bucket **Speech** — template residue despite Health golden |
| Cast vs script | Boy celebrate included (permanent three-character engine); Golden suggests Amy + Girl |
| CTA Girl (late) | Outfit/hair drift vs purple hoodie + yellow bow |

Diversity gate score: **100** (vs recent) — locations differ; story-feature fidelity still PARTIAL.

---

## Ending verification

Required sequence:

final beat → resolution → celebration → family/Amy hold → Amy CTA → logo → Download → badges → amynest.in → hold → fade black

| Beat | Observed |
|------|----------|
| Celebration / family | Present (~16–22s region; Boy+Amy+Girl) |
| Amy CTA / Download / badges / amynest.in | Present ~26s (end-card evidence PASS) |
| Hold then fade | Fade occurs; then **cloned black for ~21s** while narration finishes |
| Abrupt CTA clip | No — plate readable; problem is post-fade black pad, not early cut |

---

## KIE / cost / launch

| Field | Value |
|-------|--------|
| Provider | kie / veo3_fast @ 720p |
| Credits before compose | ~4954.33 |
| Credits after | ~4635.74 |
| Approx used | ~318.6 (~$1.59 logged) |
| Launch score | **89** (min 95) |
| Certification | **FAIL** |
| Blockers | black frames 21.03s; story beginning/conflict false on OCR heuristic; duration 49s vs ~21s target |
| Upload | **forbidden / skipped** |

---

## Frame spot-check (identity)

| Time | Read |
|------|------|
| 1s / 5s | Girl: yellow bow, purple hoodie, brown hair — hallway / book — caption Golden 013 hook |
| 8s | Amy: purple cap + AmyAI + headphones; Girl: ponytail + yellow bow — garden — after-school caption |
| 12s | Amy + Girl with book — “emotions spike / calm down” caption |
| 16s | Boy + Amy + Girl family beat — product-entry caption |
| 22s | Amy canonical; Girl outfit drift (non-purple top) |
| 26s | CTA Download + badges + amynest.in + Amy wave |
| 28s+ | Near-black / black pad |

---

## Final

**PASS/PARTIAL/FAIL: PARTIAL**

What held (do not regress):

- Proven character bibles on wire  
- Generated Character Memory local-only  
- Multi-cast bible-only identity  
- Golden 013 as narration/script source  
- Full VO retained (no truncate-to-fit)  
- No auto-publish  

What blocks a production PASS next:

1. Align picture duration to VO **without** cloning a black CTA fade (include non-black endcard hold / freeze last lit frame / more story clips).  
2. Strengthen Golden 013 visual proof (breath cues + calmness meter), remove Speech prop/playlist residue.  
3. Prefer Amy + Girl cast for this golden unless Boy is story-required.  
4. Faster/cleaner TTS or intentional longer film plan if VO stays ~45s.

---

## Artifacts

| Artifact | Path |
|----------|------|
| Master MP4 | `.amynest-assets/kie-veo-720p-golden-013/amynest-veo-720p-golden-013.mp4` |
| Run log | `.amynest-assets/kie-veo-720p-golden-013-run.log` |
| Composition plan | `.amynest-assets/kie-veo-720p-golden-013/work/cinematic/composition-plan.json` |
| QUALITY_REPORT | `.amynest-assets/kie-veo-720p-golden-013/QUALITY_REPORT.json` |
| Launch report | `.amynest-assets/kie-veo-720p-golden-013/LAUNCH_VALIDATION_REPORT.md` |
| Ops run report | `content-engine/docs/operations/GOOGLE_PRODUCTION_RUN_REPORT.md` |
| This report | `content-engine/docs/operations/GOLDEN_013_PRODUCTION_REPORT.md` |
