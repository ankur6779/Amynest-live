# Final Canonical Character Validation

**Date:** 2026-08-31  
**Shot:** Golden 010 · `shot-amy-girl-learn`  
**Generate calls:** **1** (no retry)  
**Output:** `.amynest-assets/kie-final-character-identity-validate-010-learn/validate-out.mp4`

---

## Expected identity

| Character | Authority |
|-----------|-----------|
| Amy Girl | Official Amy Girl Character Bible only |
| Amy AI | Official Amy AI Character Bible only |
| Memory / last-frame | Local only — not on KIE wire |
| Cross-character refs | 0 |
| Identity keyframe substitution | false |

Prompt must lock: Girl face/eyes/hair/ponytail/bow/hoodie/pants/shoes + Amy cap/headphones/AmyAI branding/purple eyes/white body — stylized characters in lived-in cinematic environment (not photoreal Girl, not generic robot).

---

## Reference manifest (pre-flight)

```
AMY_GIRL:
canonical bible = dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f

AMY_AI:
canonical bible = 6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb

GENERATED_MEMORY:
0

CROSS_CHARACTER_REFERENCES:
0

IDENTITY_KEYFRAME_SUBSTITUTION:
false
```

**Actual wire refs (2):**

| Slot | Character | SHA-256 |
|------|-----------|---------|
| 0 | amy-girl bible | `dc09bf…` |
| 1 | amy-ai bible | `6f65f19d…` |

Prompt checks: Girl hard lock + visual token present; Amy hard lock present; no “PHOTOREALISTIC human child for Netflix” redesign line.

---

## Provider result

| Field | Value |
|-------|--------|
| Task ID | `5edcf24f22ae0094e650d586d91b56f3` |
| HTTP | **200** |
| Provider | successFlag=1 · veo3_fast · REFERENCE_2_VIDEO · 720p · 9:16 · 8s |
| Credits before | 5032.88 |
| Credits after | 4972.88 |
| Credits consumed | **60** |
| Wall duration | ~90s |
| Output path | `.amynest-assets/kie-final-character-identity-validate-010-learn/validate-out.mp4` |

---

## Amy Girl assessment

Frames reviewed: ~0.5s, 2s, 4s, 6s, 7.5s (vs Girl bible traits).

| Trait | Finding | Match |
|-------|---------|-------|
| Face | Stylized child face consistent with Girl bible family (not photoreal human redesign) | **YES** |
| Eyes | Large warm/dark brown eyes throughout | **YES** |
| Hair | Dark brown; ponytail retained across frames | **YES** |
| Ponytail | Present throughout (expression/pose change only) | **YES** |
| Yellow bow | Present and readable on all sampled frames | **YES** |
| Outfit | Purple hoodie + darker purple pants + purple sneakers w/ white soles | **YES** |
| Body proportions | Stylized child proportions stable across shot | **YES** |
| Overall silhouette | Recognizable as Amy Girl; not Amy AI; not a new redesign | **YES** |
| Frame-to-frame | Same wardrobe/bow/hair family; no bareheaded redesign; no age/beauty swap | **YES** |

**Amy Girl: PASS** (canonical wardrobe + bow + stylized face stable; not scored on mere “purple clothes / cute”)

---

## Amy AI assessment

| Trait | Finding | Match |
|-------|---------|-------|
| Purple cap | Present on all sampled frames | **YES** |
| Headphones | Integrated / earcups (+ mic boom visible in several frames) | **YES** |
| AmyAI branding | Visible on cap (`AmyAI` / `AmyAi` + star) | **YES** |
| Eyes | Canonical purple glossy eyes | **YES** |
| Face | Cap-framed white head, blush, simple smile | **YES** |
| White body | Rounded soft-polymer body | **YES** |
| Proportions / silhouette | Large head, pear body, stub limbs + halo | **YES** |
| Generic bareheaded robot | **Absent** | — |

**Amy AI: PASS** (cap + headphones + branding required and observed — not “white + purple eyes” alone)

---

## Relationship / drift

| Check | Result |
|-------|--------|
| Both coexist | **YES** — shared book / learn interaction |
| No identity inheritance | **YES** — Girl ≠ robot traits; Amy ≠ human child traits |
| Recognizable throughout 8s | **YES** |
| Obvious identity drift | **No** major redesign across sampled frames |

---

## Secondary quality (not primary gate)

| Item | Note |
|------|------|
| Interaction | Natural learn/mentor blocking around the book |
| Acting | Listening/reading + Amy lean-in; smiles later in shot |
| Environment | Lived-in library / study with warm window light |
| Camera | Stable coverage; mild framing change toward CU late |
| Artifacts | Minor light wisps / bloom; not identity-breaking |
| Lip-sync | Listening-forward shot; no hard dialogue lip-sync required |

---

## Verdict

Primary gate (both canonical identities stable):

### CANONICAL CHARACTER VALIDATION = PASS

No second shot. No full Golden. No publish. No production code modified for this run. No additional credits after this one request.

---

ONE 8s CHARACTER VALIDATION COMPLETE — NO RETRY.
