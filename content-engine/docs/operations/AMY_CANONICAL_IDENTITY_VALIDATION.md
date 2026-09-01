# Canonical Identity — Single 8s Validation

**Date:** 2026-08-31  
**Shot:** Golden 010 · `shot-amy-girl-learn`  
**Harness:** `operations/kie-canonical-identity-validate-010-learn-once.ts`  
**Generate calls:** **1** (no retry)

---

## Expected refs

| Character | Expected | Forbidden |
|-----------|----------|-----------|
| Girl | Canonical Girl bible ONLY | Girl identity keyframe, memory freeze |
| Amy | Canonical Amy bible ONLY | Girl identity as Amy, memory freeze |
| Memory | Local only | Any `character-memory/*-last.png` on wire |
| Cross-identity | 0 | — |

## Actual refs (pre-flight + wire)

| Slot | Role | Character | SHA-256 |
|------|------|-----------|---------|
| 0 | PRIMARY | amy-girl bible | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` |
| 1 | SECONDARY | amy-ai bible | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` |

| Check | Result |
|-------|--------|
| Amy → Amy canonical bible | **YES** |
| Girl → Girl canonical bible | **YES** |
| Generated memory refs | **0** |
| Girl identity `e083…` on wire | **0** |
| Cross-identity refs | **0** |
| Ref count | **2** |

Payload: `.amynest-assets/kie-canonical-identity-validate-010-learn/validate-payload-redacted.json`

---

## Generation record

| Field | Value |
|-------|--------|
| Task ID | `cf059be3deba9c6ad576cef240ac666f` |
| Create HTTP | **200** |
| Provider | successFlag=1 · `veo3_fast` · REFERENCE_2_VIDEO · 720p · 9:16 · 8s |
| Credits before | 5092.88 |
| Credits after | 5032.88 |
| Credits consumed | **60** |
| Duration (wall) | ~99s |
| Output | `.amynest-assets/kie-canonical-identity-validate-010-learn/validate-out.mp4` |

---

## Amy identity assessment

Inspected frames at ~0.5s, 2s, 4s, 6s (and 7.5s extracted).

| Trait | Observed | Match |
|-------|----------|-------|
| Purple cap | Present across frames | **YES** |
| Integrated headphones | Present (earcups / glow rings) | **YES** |
| AmyAI branding | Visible on cap (`AmyAI` + star) | **YES** |
| Canonical purple eyes | Present | **YES** |
| Canonical face | Cap-framed white head, blush, simple smile | **YES** |
| Rounded white body | Present | **YES** |
| Proportions / silhouette | Large head, pear body, stub limbs | **YES** |
| Floating / minimalist design | Halo + compact body | **YES** |
| Generic bareheaded robot | **Not present** | — |
| Inherits Girl appearance | **No** | — |

**Not scored as PASS merely for “white + purple eyes.”** Cap + headphones + AmyAI branding were required and **observed**.

**Amy identity: PASS**

---

## Girl identity assessment

| Trait | Observed | Match |
|-------|----------|-------|
| Face | Consistent child face, freckles | **YES** |
| Hair + yellow bow | Side/high ponytail + bright yellow bow | **YES** |
| Clothing | Purple hoodie + purple bottoms + purple sneakers | **YES** |
| Proportions | Child proportions | **YES** |
| Inherits Amy appearance | **No** | — |

**Girl identity: PASS**

---

## Memory / cross-identity

| Item | Result |
|------|--------|
| Local memory freeze present | YES (`9a043e…`) |
| Memory sent to KIE | **NO** |
| Cross-identity refs | **0** |
| Character Memory enabled | YES (prompt continuity retained) |

---

## Verdict

| Gate | Result |
|------|--------|
| Request accepted / no safety 400 | **PASS** |
| Refs correct (Girl+Amy bibles only) | **PASS** |
| Amy canonical traits | **PASS** |
| Girl canonical traits | **PASS** |

### CANONICAL IDENTITY = PASS

No second shot. No full Short. No code changes after this test. No publish.

---

ONE 8s CANONICAL IDENTITY TEST COMPLETE — NO RETRY.
