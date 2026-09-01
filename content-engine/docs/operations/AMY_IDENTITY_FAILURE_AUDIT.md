# Amy Identity Failure Audit

**Mode:** OFFLINE DIAGNOSIS ONLY — zero API calls, zero KIE credits, no generation, no production changes  
**Date:** 2026-08-31  
**Subject:** Golden 010 · `shot-amy-girl-learn` · KIE-safe-memory single-shot validation  
**Artifact:** `.amynest-assets/kie-safe-memory-validate-010-learn/`  
**Task ID (historical):** `f5249f0baa4ef638658ad4e4352027fd`

---

## Executive finding

The prior validation incorrectly scored **character consistency = PASS**.

Visual review of `validate-out.mp4` shows a **non-canonical Amy**: white rounded robot **without** purple cap, **without** integrated headphones, **without** AmyAI cap branding, different head/silhouette (bare head + eyebrows + chunky feet). That is a **MAJOR identity mismatch** vs the Official Amy Character Bible.

**Important nuance (PROVEN):** The Official Amy Character Bible file that was uploaded to KIE (`amy-ai-bible.jpeg` / `6f65f19d…`) **does** depict canonical Amy (purple cap + headphones + AmyAI branding). The failure is **not** “wrong bible file on disk.” The failure is that **KIE output did not obey that bible**, under a reference stack that also included a **Girl-only** identity keyframe as primary seed, plus prompt language that analogizes Amy to Paddington/Ted / soft-robot without a hard exact-reference lock.

**CHARACTER IDENTITY VALIDATION = FAIL**

---

## 1. Actual references sent (from captured payload)

Source of truth:  
`.amynest-assets/kie-safe-memory-validate-010-learn/validate-payload-redacted.json`  
(SHA recomputed from disk — **match PROVEN**)

| Slot | Role (payload label) | Path | SHA-256 | Dims | Format | Visual description |
|------|----------------------|------|---------|------|--------|-------------------|
| 0 | `canonical-girl-bible` | `…/brand/assets/amy-girl-bible.jpeg` | `dc09bf858293f02de97d51e0cee1344257304d301916c7bc4f33490482f09f2f` | 1376×768 | JPEG | Official Girl Character Bible sheet (multi-pose). Purple hoodie, yellow bow, purple sneakers. **No Amy robot.** |
| 1 | `canonical-amy-bible` | `…/brand/assets/amy-ai-bible.jpeg` | `6f65f19d2ac5b6b48056370c943cb4c6f0665c3e9c65ad8f4d171acb73f543fb` | 1376×768 | JPEG | Official Amy Character Bible sheet. **Purple AmyAI cap, integrated headphones, AmyAI logo, canonical purple eyes, white floating body, tiny feet, neon glow.** Multi-panel (front/profile/back/details). |
| 2 | `approved-identity-keyframe` | `…/p0-regression-golden-010/…/keyframes/shot-amy-girl-learn-identity.png` | `e083f1b222e83ae510a307e932cce21411c8caa46a99f44108cbbfd7c7ecfe10` | 1080×1920 | PNG | **Amy Girl only** on soft env wash / checker. Purple hoodie, yellow bow. **No Amy robot at all.** |

### Does the actual Amy reference (slot 1) contain canonical traits?

| Trait | Present on `amy-ai-bible.jpeg` (`6f65f19d…`)? |
|-------|-----------------------------------------------|
| Purple cap | **YES** |
| Headphones | **YES** |
| AmyAI branding on cap | **YES** |
| Canonical eyes | **YES** |
| Canonical body / floating feet | **YES** |

**Verdict:** The Amy bible reference itself is **not wrong**.  
**Confidence:** **PROVEN** (direct visual inspection of the exact hashed file).

Memory freeze `9a043e…` was **local-only** and **not** in `imageUrls` (**PROVEN** by payload: `kieGeneratedMemoryRefs: 0`, `localMemoryFreezeSentToKie: false`).

---

## 2. Identity keyframe `e083f1b2…` analysis

| Field | Value |
|-------|--------|
| Exact asset | `…/p0-regression-golden-010/work/cinematic/keyframes/shot-amy-girl-learn-identity.png` |
| SHA-256 | `e083f1b222e83ae510a307e932cce21411c8caa46a99f44108cbbfd7c7ecfe10` |
| Size | 1080×1920 PNG (~1.3 MB) |

### Does `e083f1b2` depict canonical Amy?

**NO**

It depicts **canonical Amy Girl only** (side ponytail + yellow bow + purple hoodie). Zero Amy robot pixels.

### Why it was selected (no replacement performed)

**PROVEN** from code + shot identity:

1. Shot lead character = `amy-girl` (`shot-amy-girl-learn`).
2. `compose.ts` / validation harness calls `writeIdentityKeyframe({ character: shot.character, … })` → `resolveCharacterBase("amy-girl")` → **`amy-girl-base.png`**, not `amy-ai-base.png` / not bible.
3. `resolveGenerationSeed()` always sets:
   - `imagePath = identityKeyframePath` (this Girl PNG)
   - `referenceImagePaths = [cast bibles…, identity]`
4. Validation harness reused the pre-existing Golden-010 learn identity file (byte-identical `e083f1b2…`).

So `e083f1b2…` is a **correct Girl identity keyframe** for an `amy-girl` shot — but it was **mischaracterized** in the earlier validation narrative as a general “approved identity reference” that could stand in for Amy. It is **not** an Amy identity authority asset.

**Confidence:** **PROVEN**

---

## 3. Reference selection path (trace only)

```
Official Character Bible (amy-ai-bible.jpeg / amy-girl-bible.jpeg)
    ↑ wardrobeFor(id).bibleAsset  — unchanged, correct files

amy-girl-base.png  ──writeIdentityKeyframe(character=amy-girl)──►
    shot-amy-girl-learn-identity.png  (e083f1b2…)
    = PIL: env RGB wash + resize/paste Girl base into 9:16
    ※ Not a re-render of Amy bible; Amy not on this canvas

resolveGenerationSeed():
    imagePath = identity (Girl keyframe)          ← PRIMARY visual seed
    referenceImagePaths = [girl bible, amy bible, identity]
    localMemoryFreezePath = host-last.png         ← retained, NOT in refs
    usedPreviousFrame = true (semantic only)

resolveKieReferencePaths():
    order = required bibles → imagePath → remaining refs (max 3)
    strips character-memory/*-last.png
    → [girl bible, amy bible, girl identity]

Kie upload → HTTP imageUrls[3]
    (same three files; memory absent)
```

### Transformation findings

| Question | Answer | Confidence |
|----------|--------|------------|
| Is canonical Amy resized/re-rendered before upload? | **No** — bible JPEG uploaded as-is | **PROVEN** |
| Does identity keyframe replace canonical Amy? | **Not by deletion** — Amy bible still slot 1. But identity is **primary `imagePath`** and is **Girl-only**, so Amy is **not** the primary seed | **PROVEN** |
| Is identity generated from incomplete Amy asset? | N/A for this shot — identity is from **Girl base**, not Amy | **PROVEN** |
| Environment wash change Amy identity? | Wash only affects Girl keyframe; Amy bible untouched | **PROVEN** |
| Fallback / wrong character ID? | Character ID `amy-girl` for lead is correct for learn shot; Amy enters via **cast** bible stack | **PROVEN** |
| Stale cache? | File hashes match payload; no evidence of stale wrong Amy bible | **PROVEN** (hashes) |
| Reference ordering / role assignment? | Slot0 Girl bible, Slot1 Amy bible, Slot2 Girl identity — payload roles match files | **PROVEN** |
| Visual weight imbalance? | **2/3 refs are Girl**; Amy is **1 multi-panel landscape sheet** | **STRONGLY INDICATED** as drift contributor |

**Identity authority principle violation:** Design says Character Bible must be identity authority. Implementation still elevates **identity keyframe as `imagePath` primary**. For this shot that primary is **not even Amy**. That **violates** “bible is highest authority” in the provider handoff sense.

**Confidence:** **PROVEN** (code) for the violation of primary-seed role; **STRONGLY INDICATED** as a cause of Amy drift in the output.

---

## 4. KIE payload mapping (captured only)

From `validate-payload-redacted.json` — **no new payload created**.

| imageUrls index | Role | Hash prefix | Maps to |
|-----------------|------|-------------|---------|
| 0 | canonical-girl-bible | `dc09bf…` | **Girl** bible |
| 1 | canonical-amy-bible | `6f65f19d…` | **Amy** bible |
| 2 | approved-identity-keyframe | `e083f1b2…` | **Girl** identity (not Amy, not memory) |
| — | (absent) | `9a043e…` | **Memory** — present locally, **not sent** |

- Reference count: **3**
- Generated memory refs: **0** (**PROVEN**)
- KIE actually received: Girl bible + Amy bible + Girl identity (**PROVEN** by path+hash recompute)

---

## 5. Canonical vs generated comparison

Canonical = visual traits on `amy-ai-bible.jpeg` (`6f65f19d…`) and `amy-ai-base.png` (`4739c817…`).  
Generated = frames from `validate-out.mp4` (e.g. t≈3s).

| Identity Attribute | Canonical | Generated | Match |
|--------------------|-----------|-----------|-------|
| Purple cap | Present (AmyAI baseball cap) | **Absent** — bare head | **NO** |
| Headphones | Present (integrated purple cups) | **Absent** | **NO** |
| AmyAI branding | Present on cap | **Absent** | **NO** |
| Face | Cap-framed white head, no brows | Bare egg head, **visible black eyebrows** | **NO** |
| Eyes | Glossy dark-purple with catchlights | Glowing purple ovals (related palette, wrong framing) | **PARTIAL** |
| Body | White soft-polymer rounded / pear | White rounded body (generic) | **PARTIAL** |
| Proportions | Large head ~70%, tiny floating feet | Larger standing feet / leg-like base | **NO** |
| Silhouette | Cap + headphone mass + floating stubs | Smooth bald head + halo ring only | **NO** |
| Floating design | Tiny floating feet, no legs | Chunky grounded feet | **NO** |
| Color palette | White + deep purple + pink blush + neon | White + purple glow + pink blush | **PARTIAL** |

**Girl** in the same frames largely matches Girl bible/identity (purple hoodie, yellow bow) — Girl consistency is **not** the failure under audit. **Amy** consistency is.

**Confidence:** **PROVEN** (side-by-side asset vs frame inspection)

---

## 6. Prompt inspection (exact validation prompt)

File: `.amynest-assets/kie-safety-filter-forensic/prompt-010-learn-production.txt`  
SHA-256: `059148ac7c7785f5387f23c756906e8bc18db3804cec63c8d2af0d083f2e1e74`  
(matches payload `promptHash` — **PROVEN**)

### Exact hard-lock phrase?

> “Use the supplied canonical Amy reference as the exact character identity. Do not redesign, reinterpret, replace, simplify or invent Amy.”

**ABSENT** (**PROVEN** — string search).

### Present / conflicting signals

| Signal | Present? | Notes |
|--------|----------|-------|
| `Paddington/Ted` analogy | **YES** | Opening cinematic rule |
| `permanent stylized Amy` / `soft-robot` | **YES** | Style framing |
| `mascot` (mostly as negative) | **YES** | “No mascot Amy” / reject mascot energy |
| `Accessories LOCK: deep purple AmyAI baseball cap with headphones, neon purple halo` | **YES** | In Character Memory block |
| `Clothing LOCK: white soft-polymer rounded body` | **YES** | Memory block |
| Hard “exact supplied reference / do not redesign” | **NO** | Missing |
| Explicit “generic/minimalist/cinematic robot” redesign invite | **NO** as literal phrases | Soft-robot / Paddington/Ted still invite reinterpretation |

**Confidence:** **PROVEN** for presence/absence; **STRONGLY INDICATED** that soft analogies + missing hard lock contribute to redesign under weak Amy pixel weight.

---

## 7. Identity authority audit

| Rank claim (should be) | Current effective authority on this shot | Violates bible-first? |
|------------------------|------------------------------------------|------------------------|
| **A. Character Bible** | Present in `imageUrls[1]` but **not** primary `imagePath` | **YES — diluted** |
| **B. Identity keyframe** | **Primary `imagePath`** = Girl keyframe `e083…` | Elevates non-Amy asset |
| **C. Character Memory (text)** | Full pose/wardrobe/accessories locks in prompt | Text only — cannot force pixels |
| **D. Scene / Story Memory** | Present in prompt | Text only |
| **E. Generated previous frame** | Local freeze present; **not** in `imageUrls` | Not on wire (B+D working) |
| **F. Prompt description** | Heavy cinematic + Paddington/Ted language | Competes with bible |

**Principle:** Canonical Character Bible MUST be the identity authority.  
**Current implementation:** For KIE handoff, **identity keyframe is primary seed**; bible is an attached ref. On this learn shot, primary seed is **Girl**, and Amy’s only pixel authority is a **landscape multi-panel bible sheet** competing with two Girl images + a long prompt.

**Violation:** **YES** (authority principle vs primary-seed behavior) — **PROVEN** in code path; causal weight on output drift **STRONGLY INDICATED**.

---

## 8. Root cause

### What is PROVEN

1. Prior “character consistency PASS” was **incorrect** for Amy.
2. Generated Amy **lacks** cap / headphones / AmyAI branding vs bible.
3. Uploaded Amy bible `6f65f19d…` **is** the correct canonical bible (traits present).
4. `e083f1b2…` is **Girl-only**; does **not** depict Amy; was selected because lead character is `amy-girl`.
5. Memory freeze was **not** on the wire.
6. Prompt lacks the exact hard identity-lock sentence; includes Paddington/Ted / soft-robot framing.
7. Seed policy sets **identity keyframe as primary `imagePath`**.

### What is STRONGLY INDICATED (not sole-cause proven)

1. **Ref imbalance** (2 Girl pixel refs + 1 Amy sheet) caused KIE to invent a “generic cute white robot” companion while locking Girl well.
2. **Multi-panel landscape bible** is a weaker single-character lock than a clean full-body Amy hero cutout under `REFERENCE_2_VIDEO`.
3. **Prompt soft analogies** licensed redesign despite Accessories LOCK text.
4. **Primary seed = Girl identity** reduced Amy’s effective authority below the Character Bible principle.

### What is UNKNOWN

1. Whether sending **only** Amy bible + Girl bible (CONTROL shape, no `e083…`) would have preserved cap on this same prompt (CONTROL was not re-audited here for cap traits).
2. Whether KIE always ignores multi-panel sheets for accessory lock.
3. Whether Golden 011 host failure shares the same redesign mechanism.

### Non-causes for this failure (ruled out)

| Hypothesis | Status |
|------------|--------|
| Wrong Amy bible file / corrupted hash | **Ruled out** — hash + visual match canonical |
| Memory freeze on wire | **Ruled out** — count 0 |
| Character Memory disabled | **Ruled out** — enabled + prompt block present |
| Accidental Amy↔Girl bible swap | **Ruled out** — slot mapping correct |

---

## Confidence summary

| Claim | Confidence |
|-------|------------|
| CHARACTER IDENTITY VALIDATION = FAIL | **PROVEN** |
| Canonical Amy bible sent was visually correct | **PROVEN** |
| `e083f1b2…` is not canonical Amy | **PROVEN** |
| Primary seed / authority dilution contributes | **STRONGLY INDICATED** |
| Prompt missing hard lock contributes | **STRONGLY INDICATED** |
| Exact single necessary fix | **UNKNOWN** (diagnosis only; no fix executed) |

---

## Mandatory conclusion

**CHARACTER IDENTITY VALIDATION = FAIL**

No production changes made. No assets replaced. No prompts edited. No provider changes. No second generation.

---

KIE LOCKED — ZERO API CALLS — ZERO CREDITS SPENT.
