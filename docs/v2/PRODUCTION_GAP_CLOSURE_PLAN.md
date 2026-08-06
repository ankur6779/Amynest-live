# AmyNest V2 — Production Gap Closure Plan

**Status:** Action plan only — **no redesign · no new features · no experimentation · no implementation yet**  
**Authority:** Locked [`DESIGN_CONSTITUTION.md`](./DESIGN_CONSTITUTION.md) + [`VISUAL_CONSTITUTION.md`](./VISUAL_CONSTITUTION.md)  
**Source:** [`FINAL_DESIGN_AUDIT_SUMMARY.md`](./FINAL_DESIGN_AUDIT_SUMMARY.md) and every audit it references  
**Target:** Overall Design **58 → 95+** by living the Constitution — subtraction and normalization only.

---

# Executive Summary

## Why the product scored 58 instead of 90+

AmyNest already has the right emotional intent (human copy, soft-save exits, Breath ritual, calm prepare). It scored **58** because the **locked Nest Presence language is documented, not lived**.

| What 90+ requires | What 58 has |
|-------------------|-------------|
| One type ladder | Mixed `text-2xl` / `xl` / `lg` / eyebrows |
| One spacing ladder (8→64) | 4 / 6 / 12 / 20 / 112 arbitrary gaps |
| Law of three on Today | Mission + Coach + Ask Amy + Premium peers |
| Four materials only | Borders, rings, chips, underline pills |
| Whisper nav | Heavy shelf shadow + underline glow |
| One light story | Multi-glow per viewport; no Morning/Evening/Night |
| Continuous Nest home | Flat kit backgrounds + hollow For Child shelves |
| One-step emotion | Dashboard re-overwhelm, sold-to Premium, gate traps |

The gap is **execution fidelity**, not missing features. Closing it means applying the Constitution and Reduction / Spatial / Optical / Emotion audits — nothing new.

**Current:** Overall 58 · Production 52 · Apple-level 48 · ❌ Not Ready  
**This plan:** Smallest roadmap to Constitution-complete production craft.

---

# Root Causes

Every audit issue grouped (no new categories invented).

### Typography
- No lived hero 36 / body 17 / caption 13 / CTA 16 scales  
- Page heroes compete with card titles and uppercase eyebrows  
- Front Door wordmark at body-semibold weight fights the breath line  
- Ask Amy `text-xl` vs Today `text-2xl` hierarchy drift between tabs  

### Spacing
- Edge 16 / 20 instead of Constitution 24  
- Off-ladder micros: 4, 6, 12, 20  
- Chapter gaps 32 vs 40 vs preferred 48  
- Scroll pad 112 (`pb-28`) instead of 64 + safe-area  
- Sheet/plate pads 20 vs 24 mixed  
- Double separators (border-t + extra pt)  

### Hierarchy
- Today breaks Law of three (multiple peer chapters/CTAs)  
- Coach card optically twins Mission  
- Peer full-width ghost/outline buttons  
- Meta labels (“Right now,” “Speech,” “Amy Coach · Long-term”) shout  
- Premium plan price / badges overpower continuity story  

### Navigation
- Content height 64 ≠ locked 56  
- Active underline pill (forbidden)  
- Heavy upward drop shadow  
- Hard `border-t`  
- Glow on chrome (Bloom reserved for action)  
- Caps calm ceiling on every tabbed screen  

### Components
- Soft Plate / Sheet Glass / Elevated not canonical  
- Hard-bordered cards as default  
- Focus chip as badge chrome  
- Icon + text duplicate backs  
- Prompt rows as heavy equal cards  
- Hollow For Child section cards  
- Steps list wrapped in unnecessary plate  
- Skeleton blocks simulating content  

### Lighting
- Morning / Evening / Night presets not lived  
- Flat app fill instead of Nest field  
- Multiple warm loci (chip, ring, CTA, nav, orb)  
- Primary wash ≠ single believable key light  

### Motion
- One easing + duration family not universally enforced  
- Nav `layoutId` underline motion contradicts soft-fill active  
- Orb / pulse / indicator not one breath language  
- Reduced-motion uneven by surface  

### Materials
- Extra languages: hard borders, rings, underline pills, chip fills, progress meter chrome  
- Constitution allows only Atmosphere · Soft Plate · Sheet Glass · Bloom  
- Nav and sheets not same Sheet Glass blur family (20–24)  

### Consistency
- Worst audit score (44) — every shell invents local craft  
- Radius / shadow / pad / gap diverge by screen  
- Centered ritual vs left column without lived axis rule  
- State cards (Premium) use different visual mass  

### Emotional pacing
- Today stack: calm → overwhelm (E1)  
- Success + Coach bridge: honor → enrolled (E3)  
- Gates: ready/heard → trapped risk (E4, E6)  
- For Child voids: hope → disappointed (E5)  
- Premium theater: continuity → sold-to (E7)  
- One-step staircase violated  

### Brand identity
- Logo competes with hero on Front Door  
- Nest Presence approved but shell still reads parenting SaaS  
- Bloom accent not yet sole action material  
- Product feels like multiple teams’ UI kits  

---

# P0 (Production Blockers)

Must fix before Nest Presence production. Complexity: **S** small · **M** medium · **L** large (presentation-only; no architecture).

### P0-1 — Live Design Constitution craft tokens

| | |
|--|--|
| **Description** | Map V2 craft to locked type scales, spacing ladder (8→64), button anatomy (H52 · pad 24 · R26 · primary/secondary/tertiary), Soft Plate / Sheet Glass / Elevated only, Bloom as sole primary. Replace ad-hoc Tailwind spacing/type/shadow mixes. |
| **Constitution violation** | §0 Inheritance · §1 Typography · §2 Buttons · §3 Surfaces · §7 Components · §11 Consistency — all FAIL while tokens are not the only path. |
| **Affected screens** | All V2 shells (Today, Ask Amy, For Child, Coach, Mission, Premium, Front Door, sheets, nav, prepare). |
| **Expected visual improvement** | Instant family resemblance; SaaS kit smell drops; consistency score recovers hardest. |
| **Complexity** | **L** |
| **Estimated impact** | **+10** Overall |

### P0-2 — Enforce spacing ladder + scroll/nav clearance

| | |
|--|--|
| **Description** | Edge **24**; chapter **48** (min 40); kill 4/6/12/20; plate/sheet pad **24**; hero stacks **16**; chapter CTA pause **32**; `pb` = **64** + safe-area-bottom; nav content **56** + safe-area. |
| **Constitution violation** | §1 spacing ladder; Spatial Rhythm Audit Before column still shipping. |
| **Affected screens** | All scroll shells + nav + sheets. |
| **Expected visual improvement** | One invisible grid; product “breathes”; less visual tension. |
| **Complexity** | **M** |
| **Estimated impact** | **+5** Overall (partly overlaps P0-1; counted as distinct delivery) |

### P0-3 — Today Law of three

| | |
|--|--|
| **Description** | First viewport: one greeting hero · one Mission Soft Plate · one Bloom. Coach/Ask Amy/Premium cannot peer above the fold — quieter below or tertiary breath only (Reduction + Emotion E1). No new features; presentation hierarchy only. |
| **Constitution violation** | Visual Constitution Law of three; Design Constitution ship gate; hierarchy FAIL. |
| **Affected screens** | Today (+ Today Coach card weight). |
| **Expected visual improvement** | Dashboard → Nest room; calm → hope holds; Apple-level jump. |
| **Complexity** | **M** |
| **Estimated impact** | **+6** Overall · **+8** Apple-level |

### P0-4 — Remove For Child hollow cards

| | |
|--|--|
| **Description** | Delete empty Play/Learn/Care/Helping card grid. Keep “For {name}” · hope line · quiet guest save path. Atmosphere only until real content exists. |
| **Constitution violation** | §3 Surfaces · §6 Background (fake places); Reduction unanimous; Founder D2; Emotion E5. |
| **Affected screens** | For Child. |
| **Expected visual improvement** | Largest single luxury/trust recovery; hope no longer collapses. |
| **Complexity** | **S** |
| **Estimated impact** | **+4** Overall · For Child screen **+3–4** |

### P0-5 — Whisper navigation

| | |
|--|--|
| **Description** | Sheet Glass blur 20–24; height 56 + safe-area; soft-fill active; no underline; no heavy upward shadow; no hard border-t; Bloom never on chrome. |
| **Constitution violation** | §4 Navigation FAIL; Materials (underline/shadow as fifth language). |
| **Affected screens** | Global (Today, Ask Amy, For Child, and any tabbed shell). |
| **Expected visual improvement** | Calm ceiling rises on every tab; feet of the product quiet. |
| **Complexity** | **M** |
| **Estimated impact** | **+4** Overall · **+5** Calm · **+4** Luxury |

### P0-6 — Single glow / shadow policy

| | |
|--|--|
| **Description** | Remove Mission ring+md stack excess (one Soft Plate settle only); focus chip wash; Success/Breath ring-8 theater; plan selection shadow+border glow; nav underline glow. Glow only on Bloom primary and Amy presence. |
| **Constitution violation** | §5 Lighting · Materials · Optical glow balance; Visual Constitution glow laws. |
| **Affected screens** | Today Mission, Front Door Breath, Mission Success, Premium plans, Nav, focus chip. |
| **Expected visual improvement** | One light story per screen; depth becomes believable. |
| **Complexity** | **S–M** |
| **Estimated impact** | **+3** Overall · **+4** Luxury |

### P0-7 — Emotional P0 jump closure (presentation)

| | |
|--|--|
| **Description** | Success: honor only — Coach bridge not same breath as honor (quiet later or tertiary). Gates/sheets: keep Not right now; no trapped silhouette. Premium: remove badge/selection theater so continuity → invited not sold-to. No routing/Brain changes — presentation pacing only. |
| **Constitution violation** | Interaction ethics; Emotional Journey E3/E4/E6/E7; guest sheet laws. |
| **Affected screens** | Mission Success, Guest sheet, Coach ready, Ask Amy sheet timing feel, Premium. |
| **Expected visual / emotional improvement** | One-step staircase holds; trust and humanity scores rise. |
| **Complexity** | **M** |
| **Estimated impact** | **+3** Overall · **+6** Production Readiness (trust) |

**P0 impact subtotal (with overlap dampening):** ~**+28 → ~86 Overall** if executed cleanly (see Score Recovery).

---

# P1 (Major Improvements)

### P1-1 — Ask Amy Nest Presence reduction

| | |
|--|--|
| **Description** | Care hero (parity with Today type band); dissolve prompt card wall to atmosphere rows; remove conversation border-b chrome; one Start Bloom; back as whisper (icon or text, not both competing). |
| **Constitution violation** | Law of three; §3 Surfaces; Reduction Ask Amy; Premium Feel Ask Amy low timelessness. |
| **Affected screens** | Ask Amy. |
| **Expected visual improvement** | Leaves “AI feature” silhouette; becomes a room to ask. |
| **Complexity** | **M** |
| **Estimated impact** | **+3** Overall · Ask Amy **+2–3** |

### P1-2 — Front Door brand quiet + one optical axis

| | |
|--|--|
| **Description** | Wordmark → caption whisper or absent; progress hairline or removed; orb + type share one axis (center ritual or left-lock — pick Constitution ritual rule); soften choice tile hard borders to Soft Plate. |
| **Constitution violation** | §10 Brand mark; Optical D11/D14/D5; Lighting single source. |
| **Affected screens** | Front Door (all steps). |
| **Expected visual improvement** | Breath owns the room; onboarding costume drops. |
| **Complexity** | **M** |
| **Estimated impact** | **+2** Overall · **+3** Apple-level |

### P1-3 — Mission Play / Success reduction

| | |
|--|--|
| **Description** | Drop “Speech” / “Today’s step” eyebrows; steps on atmosphere (no heavy card); align back to column; Success: quieter mark, no ring-8; CTA optically coupled after air. |
| **Constitution violation** | Reduction Mission; Optical Success; Materials. |
| **Affected screens** | Mission Play, Mission Success. |
| **Expected visual improvement** | Doing/honor feel adult, not worksheet/trophy. |
| **Complexity** | **S** |
| **Estimated impact** | **+2** Overall |

### P1-4 — Premium continuity silhouette

| | |
|--|--|
| **Description** | Continuity letter composition; Soft Plate once; no “Best value” badges; selection = soft fill only; offline/error without alarm-icon theater; one Bloom. Honest plans may remain (Rams) but catalog chrome dies. |
| **Constitution violation** | Hospitality layer; Emotion E7; Founder D6/D12. |
| **Affected screens** | Premium Journey, Account gate. |
| **Expected visual improvement** | Sold-to → invited; trust recovery. |
| **Complexity** | **M** |
| **Estimated impact** | **+2** Overall · **+3** Trust/Production |

### P1-5 — Optical alignment pass (nudges only)

| | |
|--|--|
| **Description** | Apply Optical Alignment: optical center ~45% on ritual/prepare; left column lock on in-product; CTA pause; no hanging negative-margin icons; quiet logo. Ladder values only. |
| **Constitution violation** | §1 optical alignment law; Optical Alignment defect list. |
| **Affected screens** | All (especially Front Door, prepare, Premium center, sheets). |
| **Expected visual improvement** | Feels designed by one eye; less “math-centered but wrong.” |
| **Complexity** | **M** |
| **Estimated impact** | **+2** Overall · **+3** Craftsmanship |

### P1-6 — Lighting presets Morning / Evening / Night

| | |
|--|--|
| **Description** | Live three Constitution lighting presets as Nest field atmospheres; every screen picks exactly one; continuous home (no new locations). |
| **Constitution violation** | §5 Lighting · §6 Background FAIL. |
| **Affected screens** | All V2 surfaces. |
| **Expected visual improvement** | Depth + longevity; same world different hour. |
| **Complexity** | **L** |
| **Estimated impact** | **+3** Overall · **+5** Depth/Luxury |

### P1-7 — Motion unification

| | |
|--|--|
| **Description** | One easing `cubic-bezier(0.22, 1, 0.36, 1)`; durations 120/220/320/480 only; fade+6–8px rise; press 0.97; kill nav underline motion; reduced-motion = static light. |
| **Constitution violation** | §8 Motion PARTIAL → must PASS. |
| **Affected screens** | All interactive V2. |
| **Expected visual improvement** | Everything breathes together; premium touch feel. |
| **Complexity** | **M** |
| **Estimated impact** | **+2** Overall |

**P1 impact subtotal (dampened):** ~**+12**

---

# P2 (Polish)

### P2-1 — Product-wide eyebrow purge

| | |
|--|--|
| **Description** | Remove remaining filing labels not required for clarity (Coach “Amy Coach,” residual metas). |
| **Constitution violation** | Reduction; typography whisper law. |
| **Affected screens** | Coach, residual Today/Mission metas. |
| **Expected visual improvement** | Cleaner heroes. |
| **Complexity** | **S** |
| **Estimated impact** | **+1** |

### P2-2 — Prepare: presence line only

| | |
|--|--|
| **Description** | Remove skeleton fake rows; one calm message + optional soft mark. |
| **Constitution violation** | Founder D15; Emotion E8 residue. |
| **Affected screens** | Calm prepare / loading. |
| **Expected visual improvement** | Truer stillness. |
| **Complexity** | **S** |
| **Estimated impact** | **+1** |

### P2-3 — Sheet / dialog micro optical bias

| | |
|--|--|
| **Description** | Title in sheet upper third; body→action **32**; tertiary as breath not twin pill. |
| **Constitution violation** | Optical Guest sheet; §2 tertiary. |
| **Affected screens** | Guest Account Sheet, Account gate, dialogs. |
| **Expected visual improvement** | Hosted ask, not modal arrest. |
| **Complexity** | **S** |
| **Estimated impact** | **+1** |

### P2-4 — Longevity cliché sweep

| | |
|--|--|
| **Description** | Final pass for any remaining AI-prompt-grid / onboarding-meter / trophy residue after P0–P1. |
| **Constitution violation** | Timelessness goals in Premium Feel audit. |
| **Affected screens** | Residual across Ask Amy / Front Door / Success. |
| **Expected visual improvement** | Ages past 2024 AI-skin. |
| **Complexity** | **S** |
| **Estimated impact** | **+1** |

### P2-5 — Craft-adjacent a11y hardening

| | |
|--|--|
| **Description** | Mist contrast on Nest night, hit targets 52, focus rings Constitution-safe — no feature work; finish pass. |
| **Constitution violation** | Ship gate readability; audit a11y asterisk. |
| **Affected screens** | All. |
| **Expected visual improvement** | Production confidence; fewer fatigue failures. |
| **Complexity** | **M** |
| **Estimated impact** | **+1** Overall · **+3** Production Readiness |

**P2 impact subtotal:** ~**+4–5**

---

# Score Recovery

Estimates assume faithful Constitution execution (no scope creep). Dampening applied for overlap.

| Milestone | Overall Design | Production Readiness | Apple-Level | Luxury | Calm | Consistency | Notes |
|-----------|---------------:|---------------------:|------------:|-------:|-----:|------------:|-------|
| **Today (baseline)** | **58** | **52** | **48** | 53 | 59 | 44 | ❌ Not Ready |
| **P0 complete** | **84–87** | **78–82** | **76–80** | 78 | 80 | 82 | ⚠ Nearly Ready — core Nest Presence lived |
| **P0 + P1 complete** | **93–96** | **90–93** | **90–93** | 92 | 91 | 93 | ✅ Production Ready at world-class craft bar |
| **P0 + P1 + P2 complete** | **96–98** | **94–96** | **94–96** | 95 | 94 | 96 | Finish / longevity / a11y headroom |

### Why not a guaranteed 100
- Human judgment of “luxury” never saturates.  
- Content still arrives later on For Child (atmosphere is correct; richness comes with real content — not invented here).  
- 95+ is the plan target; 98 is asymptotic polish.

### Mapping to verdict flip

| Score band | Verdict |
|------------|---------|
| < 80 Overall or Apple < 75 | ❌ Not Ready |
| P0 done (~85) | ⚠ Nearly Ready |
| P0+P1 (~95) | ✅ Production Ready |

---

# Dependency Order

Exact implementation order. Each step depends only on completed prior steps.

| Step | Work | Depends on |
|-----:|------|------------|
| **1** | **P0-1** Constitution craft tokens (type · space · button · plate · sheet · bloom) | — |
| **2** | **P0-2** Ladder enforcement + clearance + nav height token (structural spacing) | Step 1 |
| **3** | **P0-5** Whisper nav (uses Sheet Glass + spacing from 1–2) | Steps 1–2 |
| **4** | **P0-6** Single glow/shadow policy (materials from 1) | Step 1 |
| **5** | **P0-4** For Child hollow card removal (atmosphere + tokens) | Step 1 |
| **6** | **P0-3** Today Law of three (uses tokens, spacing, glow policy) | Steps 1–2, 4 |
| **7** | **P0-7** Emotional jump closure on Success / gates / Premium chrome | Steps 1, 4, 6 |
| **8** | **P1-7** Motion unification (stable surfaces first) | Steps 1–3 |
| **9** | **P1-6** Lighting presets Morning / Evening / Night | Steps 1, 4 |
| **10** | **P1-1** Ask Amy reduction | Steps 1–2, 4, 9 |
| **11** | **P1-2** Front Door brand quiet + axis | Steps 1, 4, 9 |
| **12** | **P1-3** Mission Play / Success reduction | Steps 1, 4, 7 |
| **13** | **P1-4** Premium continuity silhouette | Steps 1, 4, 7, 9 |
| **14** | **P1-5** Optical nudge pass product-wide | Steps 1–13 |
| **15** | **P2-1** Eyebrow purge | Steps 6–13 |
| **16** | **P2-2** Prepare presence-only | Steps 1, 8 |
| **17** | **P2-3** Sheet optical micro | Steps 1–2, 14 |
| **18** | **P2-4** Longevity cliché sweep | Steps 10–14 |
| **19** | **P2-5** A11y hardening | Steps 1–14 |
| **20** | **Founder Checklist sign-off** — all boxes · re-score vs audit | Steps 1–19 |

**Rule:** Do not start Today hierarchy (6) before tokens (1) and glow policy (4). Do not light the Nest (9) before materials exist (1). Do not optical-nudge (14) before surfaces stabilize.

---

# Founder Checklist

Ship Nest Presence production only when every box is true:

- [ ] Typography unified  
- [ ] One button anatomy  
- [ ] One navigation  
- [ ] One lighting system  
- [ ] One Nest world  
- [ ] Motion unified  
- [ ] Surface system unified  
- [ ] Components canonical  
- [ ] Visual debt removed  
- [ ] Constitution fully respected  

**Sign-off rule:** If any box is unchecked, verdict remains **❌ Not Ready** or **⚠ Nearly Ready** — never **✅ Production Ready**.

---

## Traceability

| Plan item | Primary audit source |
|-----------|----------------------|
| P0-1 / P0-2 | Design Constitution · Spatial Rhythm |
| P0-3 | Final Summary · Visual Constitution · Emotion E1 |
| P0-4 | Reduction · Founder D2 · Emotion E5 |
| P0-5 | Design Constitution §4 · Premium Feel nav |
| P0-6 | Optical · Reduction · Lighting laws |
| P0-7 | Emotional Journey · Founder gates |
| P1-* | Final Recommendations 8–10 · Optical · Reduction |
| P2-* | Final Summary P2 · Premium Feel residuals |

---

**STOP.** Gap closure plan complete. No redesign. No mockups. No code. No new ideas. Constitution only.
