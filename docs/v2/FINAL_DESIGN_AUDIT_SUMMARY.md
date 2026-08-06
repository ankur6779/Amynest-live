# AmyNest V2 — Final Design Audit Summary

**Mode:** Summary only — **no redesign · no implementation · no code**  
**Sources:** Design Constitution · Visual Constitution · Spatial Rhythm Audit · Optical Alignment · Reduction Report · Premium Feel Audit · Founder Review · Emotional Journey · (prior) Visual Identity / Industrial / Decision Board  
**Bar:** Among the world’s highest-quality parenting apps — Nest Presence lived, not merely documented.

---

# 1. Executive Summary

| Metric | Score | Read |
|--------|------:|------|
| **Overall Design Score** | **58 / 100** | Warm mid-premium shell. Constitution locked; lived UI still SaaS-adjacent. |
| **Current Production Readiness** | **52 / 100** | Dogfood / internal possible. World-class Nest Presence craft **not** production-ready. |
| **Apple-Level Readiness** | **48 / 100** | Law of three broken on core tabs. Chrome louder than content. Finish incomplete. |
| **Luxury Score** | **53 / 100** | Restraint intended; cards, rings, nav shelf, hollow tiles kill luxury. |
| **Calm Score** | **59 / 100** | Copy often calm; chapter stacks, dual CTAs, loud nav raise volume. |
| **Consistency Score** | **44 / 100** | Worst gap. Edge 16 vs 20 vs 24; plate pads 20/24; chapter gaps 32/40; glows everywhere. |
| **Craftsmanship Score** | **55 / 100** | Breath / Success / Guest sheet / Calm prepare show ceiling. Rest unfinished. |
| **Confidence Score** | **61 / 100** | Direction approved. Masters agree on quieter. Execution not landed — confidence in *path*, not *pixels*. |

**One-line truth:** The product knows who it wants to be. It does not yet look like that product.

---

# 2. Biggest Strengths

| # | Strength | Why it is valuable |
|---|----------|-------------------|
| 1 | **Nest Presence direction is Founder-approved and locked** | Ends concept thrash. One DNA for every future screen. |
| 2 | **Design Constitution exists as a production freeze** | Typography, buttons, surfaces, nav, light, motion have canonical locks — implementable without inventing. |
| 3 | **Law of three is explicit** | Prevents dashboard relapse when obeyed. Clarity for tired parents. |
| 4 | **Four materials only (Atmosphere · Soft Plate · Sheet Glass · Bloom)** | Material discipline is how Linear/Apple-scale products stay coherent. |
| 5 | **Humanity in language leads craft** | Parents can feel cared for in words — rare and hard-won; craft can catch up by subtraction. |
| 6 | **Guest soft-save + “Not right now”** | Trust architecture: exit breath prevents trapped emotion (Emotional Journey + Founder panel agree). |
| 7 | **Front Door Breath emotional beat** | Overwhelm → heard in one step. Highest humanity surface; proves the ceiling. |
| 8 | **Mission Success honor (almost)** | Doing → honored without (full) fireworks — correct emotional tread. |
| 9 | **Calm prepare vs MEET AMY splash** | Waiting → reassured instead of startled. System trust repair. |
| 10 | **Audit stack is complete and aligned** | Spatial, optical, reduction, premium, founder, emotion all point the same direction — quieter — so execution won’t thrash. |

---

# 3. Biggest Weaknesses

Sorted by impact.

### High

| # | Issue | Why it matters |
|---|-------|----------------|
| 1 | **Constitution not lived in UI** | Locked language on paper; screens still kit cards, coral primary, mixed radii. Parents experience the gap, not the PDF. |
| 2 | **Today breaks Law of three** | Mission + Coach + Ask Amy + Premium = dashboard. Calm → overwhelm (E1). Core daily surface fails Nest Presence. |
| 3 | **For Child hollow cards** | Fake shelves destroy luxury, trust, and hope (hope → disappointed). Unanimous Founder remove. |
| 4 | **Bottom nav is anti-luxury** | Heavy shadow, border, underline glow. Caps calm on every tabbed screen. |
| 5 | **Spacing off the locked ladder** | 4/6/12/20/112 everywhere. Invisible grid broken → product never “breathes as one.” |

### Medium

| # | Issue | Why it matters |
|---|-------|----------------|
| 6 | **Glow / shadow multiplicity** | Mission ring+md, focus chip, orb rings, nav underline, plan selection — multiple light sources. Depth becomes noise. |
| 7 | **Ask Amy = AI feature silhouette** | Prompt card wall + tool header. Timelessness and Apple scores collapse. |
| 8 | **Premium = store catalog** | Continuity copy wearing plan theater → sold-to emotion (E7). Trust tax. |
| 9 | **Optical / axis failures** | Front Door logo vs hero; orb center vs type left; sunk geometric centers. Feels accidental, not designed. |
| 10 | **Emotional jumps at gates** | Success+Coach bridge; Coach→signup; Ask Amy sheet mid-vulnerability. One-step law violated. |

### Low

*(Still real — do not ignore after P0/P1.)*

| Residual | Why |
|----------|-----|
| Eyebrow labels (“Right now,” “Speech,” etc.) | Filing-cabinet smell; easy reduction later. |
| Skeleton fake-content on prepare | Slight “fooled” risk while waiting. |
| Plan badges / WifiOff icons | Commerce and alert residue. |

---

# 4. Constitution Compliance

Against [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) as locked — **lived product**, not document quality.

| Section | Status | Reasoning |
|---------|--------|-----------|
| **0. Inheritance & freeze** | **FAIL** | Local invention still rules (mixed cards, nav underline, chip chrome). Freeze not enforced in craft. |
| **1. Typography** | **FAIL** | No single hero/body/caption/CTA scale lived. `text-2xl` / `text-xl` / `text-lg` / eyebrows compete. |
| **2. Buttons** | **PARTIAL** | Primary/outline/ghost exist but not one family (radius/glow/padding/shadow locked). Peer full-width ghosts common. |
| **3. Cards / surfaces** | **FAIL** | Hard borders, `shadow-md`+ring, hollow tiles, prompt walls. Soft Plate / Sheet Glass / Elevated not canonical. |
| **4. Navigation** | **FAIL** | Height 64 ≠ 56; underline active; heavy shelf shadow; hard `border-t`. Not whisper Sheet Glass. |
| **5. Lighting** | **FAIL** | Morning/Evening/Night presets not lived. Flat kit + primary wash ≠ one light story. |
| **6. Background system** | **PARTIAL** | Front Door soft gradient; Today/elsewhere mostly flat app background. Not continuous Nest home. |
| **7. Component library** | **FAIL** | Duplicate card weights, chip-as-badge, mixed sheet pads, icon+text backs. Not one anatomy. |
| **8. Motion** | **PARTIAL** | Shared transition tokens exist; duration/easing family not universally one breath; nav indicator still chrome motion. |
| **9. Color roles** | **PARTIAL** | Intent toward one bloom; coral/primary kit + purple relics risk remains. Competing accents not fully dead. |
| **10. Brand mark** | **FAIL** | Front Door wordmark competes with hero. |
| **11. Consistency audit → canonical** | **FAIL** | Audit named the replacements; product still ships the “Before” column. |
| **12. Screen checklist (ship gate)** | **FAIL** | Almost no screen would pass the Constitution ship checklist today. |
| **Visual Constitution — Law of three** | **FAIL** | Broken on Today; strained on Ask Amy / For Child / Premium. |
| **Visual Constitution — Materials (4 only)** | **FAIL** | Borders, rings, underline pills, chip fills = extra material language. |
| **Visual Constitution — Lighting presets** | **FAIL** | Three presets not implemented as system. |
| **Spacing ladder (Constitution §1)** | **FAIL** | Spatial Rhythm Audit: systematic off-ladder habit. |

**Compliance summary:** Document **PASS** (locked, clear). Product **FAIL** / **PARTIAL**. Gap is execution, not vision.

---

# 5. Screen-by-Screen Score

Scores 1–10. Synthesized from Premium Feel, Optical, Spatial, Reduction, Emotion.

| Screen | Visual | Consistency | Hierarchy | Type | Spacing | Emotion | A11y* | Luxury | **Overall** |
|--------|-------:|------------:|----------:|-----:|--------:|--------:|------:|-------:|----------:|
| Front Door — Breath | 7 | 5 | 7 | 7 | 5 | 9 | 7 | 7 | **7.0** |
| Front Door — Age/Name/Worry | 6 | 5 | 6 | 6 | 5 | 8 | 7 | 5 | **6.0** |
| Today | 5 | 4 | 4 | 5 | 4 | 6 | 7 | 5 | **5.0** |
| Mission Play | 6 | 5 | 6 | 6 | 5 | 8 | 7 | 6 | **6.1** |
| Mission Success | 7 | 6 | 7 | 7 | 5 | 8 | 7 | 7 | **6.8** |
| Ask Amy | 5 | 4 | 4 | 5 | 4 | 6 | 7 | 4 | **4.9** |
| For Child | 3 | 3 | 3 | 5 | 3 | 4 | 6 | 3 | **3.8** |
| Coach confirm/ready | 6 | 5 | 6 | 6 | 5 | 7 | 7 | 6 | **6.0** |
| Coach on Today | 5 | 4 | 4 | 5 | 4 | 6 | 7 | 5 | **5.0** |
| Premium Journey | 5 | 4 | 4 | 5 | 4 | 5 | 6 | 4 | **4.6** |
| Account gate | 5 | 5 | 5 | 5 | 4 | 5 | 6 | 5 | **5.0** |
| Guest Account Sheet | 6 | 6 | 7 | 6 | 5 | 8 | 8 | 6 | **6.5** |
| Bottom nav | 4 | 3 | 4 | 5 | 3 | 5 | 7 | 4 | **4.4** |
| Calm prepare | 7 | 6 | 7 | 6 | 5 | 8 | 7 | 7 | **6.6** |

\*Accessibility here = craft-adjacent (contrast of mist type, hit targets, exit labels, focus rings) — not a full WCAG audit. Soft exits and labeled controls help; mist-on-night and dense stacks remain risks.

**Weakest overall:** For Child · Nav · Premium · Ask Amy · Today.  
**Strongest overall:** Breath · Success · Guest sheet · Calm prepare.

---

# 6. Design Debt

Remaining inconsistencies (inventory):

### Duplicate / competing styles
- Mission `shadow-md` + ring vs Coach `shadow-sm` vs default card border  
- Primary / outline / ghost not one Bloom family  
- Centered ritual vs left column without a single axis rule lived  
- Multiple “eyebrow” patterns (uppercase tracked vs `text-sm` muted)

### Mixed spacing (off ladder)
- Edge `px-4` (16) vs Front Door `px-5` (20) vs Constitution 24  
- `space-y-3` (12), `gap-5` (20), `space-y-1.5` (6), `gap-1` (4), `mt-1` (4)  
- Chapter `gap-8` (32) vs Today `gap-10` (40) vs preferred 48  
- `pb-28` (112) clearance vs 64 + safe-area  
- Sheet `p-5` (20) vs plate `p-6` (24) vs Coach `p-5`

### Multiple shadows / glows
- Nav upward shelf shadow  
- Mission ring + shadow stack  
- Focus chip primary wash  
- Success / Breath `ring-8`  
- Plan selected border + shadow  
- Tab underline as glow proxy

### Incorrect materials
- Hard `border` cards as default  
- Hollow For Child tiles as “structure”  
- Prompt walls as equal Soft Plates  
- Progress meter as chrome material on ritual  
- Underline pill as nav material

### Visual noise
- Today chapter stack + border-t separators  
- Ask Amy conversation `border-b` chrome  
- Premium state-card lottery  
- Prepare skeleton blocks  
- Logo + progress competing with breath hero

### Hierarchy issues
- Page hero vs card titles equal weight  
- Peer full-width CTAs  
- Meta labels shouting  
- Coach twin to Mission  
- Plan price over continuity story

### Alignment issues
- Back controls with negative margin hang  
- Orb centered / type left on Breath  
- Geometric center sunk on prepare/premium  
- Long tab labels optical imbalance

### Motion inconsistencies
- Nav layoutId underline vs Constitution soft-fill  
- Mixed page/card/sheet transitions vs one duration family not fully enforced  
- Orb breathe vs reduced-motion discipline uneven by surface

### Lighting inconsistencies
- No Morning / Evening / Night system lived  
- Primary wash ≠ Nest key light  
- Multiple warm loci per viewport

### Emotional design debt
- E1–E12 jumps (Today re-overwhelm, Success+upsell, gates→trapped, For Child disappointment, Premium sold-to)

---

# 7. What Should Be Fixed Before Production

Blockers only — for **world-class Nest Presence production**, not “can we dogfood.”

### P0 (must fix)

1. **Live the Design Constitution on all V2 shells** — type scale, button family, Soft Plate / Sheet Glass, edge 24, chapter 48, kill off-ladder spacing.  
2. **Today Law of three** — one hero, one Mission support, one bloom above fold; Coach/Ask/Premium cannot peer.  
3. **Remove For Child hollow cards** — name + hope + air until real content.  
4. **Nav whisper** — height 56, no underline, no heavy shelf, Sheet Glass only.  
5. **Kill multi-glow** — bloom + Amy only; Mission ring/chip/nav glow gone.  
6. **Emotional jump blockers** — no Success+Coach sell same breath; no trapped gates; Premium invited not catalog-hyped.

### P1 (should fix)

1. Ask Amy: dissolve prompt wall; tool header → care hero.  
2. Front Door: quiet wordmark; kill/soften progress; one optical axis.  
3. Mission Play: steps without heavy card; drop “Speech” eyebrow.  
4. Premium: continuity letter silhouette; no badges/selection theater.  
5. Optical nudges: optical center ~45%; column lock; CTA pause 32.  
6. Lighting presets Morning / Evening / Night on every surface.

### P2 (future polish)

1. Remaining eyebrow purge product-wide.  
2. Skeleton → presence line only.  
3. Micro optical bias on sheets/dialogs.  
4. Longevity pass on any remaining AI-era clichés.  
5. Full WCAG audit beyond craft-adjacent a11y.

---

# 8. Overall Founder Verdict

# ❌ Not Ready

**Why this verdict — not “Nearly Ready”:**

- The **bar stated** is world-class parenting-app craft, Apple-adjacent. At **58 overall** and **48 Apple-level**, that bar is not met.  
- The Design Constitution is **locked but not lived** — compliance is FAIL across typography, surfaces, nav, lighting, spacing.  
- Founder panel (Ive / Rams / Fukasawa / Maeda): **would not ship** the current feel as finished luxury.  
- Emotional journey still contains **High** jumps (Today stack, For Child void, Premium sold-to, gate traps).  
- Strengths (humanity, soft-save, Breath, calm prepare) prove the destination is real — they do **not** make the current shell production-ready at the intended quality.

**Nearly Ready would mean:** Constitution executed on core tabs, Law of three on Today, hollow cards gone, nav quiet, emotional P0 jumps closed.  
**That state is not the current state.**

Dogfood / internal observation: acceptable with eyes open.  
**Production as Nest Presence luxury: ❌ Not Ready.**

---

# 9. Final Recommendations

Next 10 highest-impact improvements — **priority order · do not implement here:**

1. **Implement Design Constitution tokens** (type · space ladder · button · plate · sheet · bloom) as the only V2 craft path.  
2. **Rebuild Today first viewport** to Law of three (greeting · Mission · one bloom).  
3. **Delete For Child empty card grid**; leave hope + name.  
4. **Replace nav chrome** with Constitution whisper nav.  
5. **Enforce spacing ladder** (kill 4/6/12/20/112; edge 24; chapter 48; clearance 64+safe).  
6. **Single light / glow policy** — remove rings, chip washes, underline glows, dual shadows.  
7. **Close emotional P0 jumps** (Success honor-only; soft invite gates; Premium non-catalog).  
8. **Ask Amy reduction** — atmosphere prompts, care hero, one Start.  
9. **Front Door optical + brand quiet** — one axis; whisper logo; progress gone or hairline.  
10. **Lighting presets** Morning / Evening / Night across all shells so the home feels continuous.

---

## Source index

| Document | Role in this summary |
|----------|----------------------|
| [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) | Locked system — compliance FAIL in product |
| [`VISUAL_CONSTITUTION.md`](./VISUAL_CONSTITUTION.md) | Soul DNA — Law of three / materials unmet |
| [`SPATIAL_RHYTHM_AUDIT.md`](./SPATIAL_RHYTHM_AUDIT.md) | Spacing debt |
| [`OPTICAL_ALIGNMENT.md`](./OPTICAL_ALIGNMENT.md) | Perception debt |
| [`REDUCTION_REPORT.md`](./REDUCTION_REPORT.md) | Subtraction backlog |
| [`PREMIUM_FEEL_AUDIT.md`](./PREMIUM_FEEL_AUDIT.md) | ~6.1 feel average |
| [`FOUNDER_REVIEW.md`](./FOUNDER_REVIEW.md) | Masters: quieter; do not ship |
| [`EMOTIONAL_JOURNEY.md`](./EMOTIONAL_JOURNEY.md) | One-step law; jump flags |

---

**STOP.** Final design audit summary complete. No redesign. No implementation. No code.
