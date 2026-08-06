# P0.7 Reality Check — Try to Break the Visual System

**Sprint:** Production Recovery · P0.7  
**Mode:** Reality only — **no fixes · no redesign · no token work**  
**Bar:** Apple Design Review. Reject anything that would not survive.  
**Assumption:** The system is **not** production ready until proven otherwise.  
**Inputs:** Lived screens after P0.1–P0.6 · Design Constitution · prior audit (58) · optimistic sprint estimates (~90)

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Would you ship this?** | **NO** |
| **WHY** | Tokens are ahead of pixels. Constitution is frozen on paper and partially wired in craft, but the parent still walks purple Landing → checkbox Mission → Coach upsell → Neon Signup → empty For Child. Law of Three is mostly opacity theater. Type scale is almost unused. Legacy `.app-footer` still forces a 72px dark shelf under whisper nav. Apple would stop at Landing and never open Today. |
| **Current TRUE score** | **66 / 100** Overall |
| **Current TRUE launch stage** | **Internal dogfood / closed alpha** — not TestFlight polish, not App Store Nest Presence |

Sprint estimates after P0.6 (~90–93) measured **craft compliance optimism**. This document measures **what a sleep-deprived parent sees**.

---

## Scoreboard (TRUE — lived product)

| Metric | Pre-P0 audit | Optimistic post-P0.6 | **TRUE now** | Read |
|--------|-------------:|---------------------:|-------------:|------|
| Overall Design | 58 | ~90–93 | **66** | Foundation real; silhouette not |
| Production Readiness | 52 | ~84–87 | **58** | Ship craft ≠ ship product |
| Apple-Level | 48 | ~78–82 | **52** | Would fail Design Review |
| Luxury | 53 | ~high 70s | **57** | Quiet intent; loud entry/exit |
| Calm | 59 | ~high 70s | **62** | Copy calmer than composition |
| Consistency | 44 | ~92–94 | **61** | Tokens one; screens many |
| Craftsmanship | 55 | — | **60** | Breath / sheet / prepare show ceiling |
| Confidence (path) | 61 | — | **70** | Direction still correct |
| Confidence (pixels) | — | — | **48** | Would not show Jobs |

**One-line truth:** We built a Constitution and a craft spine. We have not yet manufactured a Nest Presence product.

---

## Journey walked

```
Landing → Front Door → Today → Mission → Mission Success
        → Coach → Ask Amy → Premium → Signup → For Child
        (+ Guest Sheets · Bottom Nav on every tab)
```

**Personas applied:** first-time · sleep-deprived · night · one-handed · returning · guest.

---

## Top 50 remaining issues

Ranked by ship risk. Severity: **P0** blocks Nest Presence ship · **P1** hurts trust/luxury · **P2** polish.

| # | Sev | Screen | Issue | Persona | Feel |
|--:|:---:|--------|-------|---------|------|
| 1 | **P0** | Landing | Purple/pink fog, rainbow wordmark, Meet AMY glass — still AI marketing, not Nest. Opacity ≠ redesign. | first-time | AI / cheap |
| 2 | **P0** | Signup (V2 calm) | NeonRingHero + purple wave rings + pink/purple submit still mount (dimmed only). Forbidden neon survives. | guest | AI / cheap |
| 3 | **P0** | System / Nav | `.app-footer` CSS forces `height: 72px` + dark shelf under V2 whisper `h-14` Sheet Glass. Manufacturing defect. | night | manufacturing |
| 4 | **P0** | Global | `V2_TYPE` almost unused on screens (brandMark + nav caption only). Lived type is `text-2xl/xl/lg/sm` invent. | all | unfinished |
| 5 | **P0** | Today | Stack still Mission + Coach + Ask Amy + Premium. Opacity-70/80 ≠ Law of Three lived. Dashboard remains. | sleep-deprived | dashboard |
| 6 | **P0** | Brand path | Landing rainbow → Front Door whisper → Signup neon = three brand systems in one guest journey. | first-time | cheap |
| 7 | **P0** | Mission Play | “Mark complete” is the ritual — checkbox honor, not practice. Feels unfinished / empty. | first-time | empty |
| 8 | **P0** | Mission Success → Coach | Honor breath immediately sells Coach; then Continue → Signup wall. Emotional trap. | guest | fatigue |
| 9 | **P0** | Ask Amy | Prompt Soft Plate wall + legacy `AssistantPage` black box = AI feature silhouette mid-vulnerability. | guest | AI |
| 10 | **P0** | Ask Amy guest | Account sheet opens before help — gate at the vulnerable moment. | guest | fatigue |
| 11 | **P0** | Coach | Legacy `CoachUnderstandingScreen` breaks craft ownership mid-journey. | guest | unfinished |
| 12 | **P0** | Coach ready | “Plan ready” → hard `/sign-up` — trust then trap. | guest | product |
| 13 | **P0** | Premium | Plan rows + prices + badges = store catalog wearing continuity copy. | guest | corporate |
| 14 | **P0** | For Child | Signed-in: hope line only — empty tab, no next step. | returning | empty |
| 15 | **P0** | Hierarchy | Law of Three as `data-v2-law` + opacity — not type/size/air demotion. Theater. | sleep-deprived | safe |
| 16 | **P0** | Emotional arc | Calm Front Door → Today dashboard → checkbox → upsell → neon signup. One-step law fails end-to-end. | guest | fatigue |
| 17 | **P1** | Landing | Dual CTAs remain (Try on Web + Get app). Peer decisions. | one-handed | fatigue |
| 18 | **P1** | Landing | Store badges / QR / trust strip still in first viewport (only dimmed). | first-time | busy |
| 19 | **P1** | Landing | Type is Quicksand black display — not Constitution 36/17/13. | first-time | alignment |
| 20 | **P1** | Front Door | Progress meter always on — ritual meter competes with Breath hero. | sleep-deprived | product |
| 21 | **P1** | Front Door | Orb centered vs H1 left — optical axis broken. | first-time | alignment |
| 22 | **P1** | Front Door | H1 `text-3xl font-semibold` — not `V2_TYPE.hero`. | first-time | unfinished |
| 23 | **P1** | Front Door Age/Worry | 5–7 Soft Plate choice rows — filing cabinet (peers only dimmed). | sleep-deprived | busy |
| 24 | **P1** | Today | Focus “hero” is a caption chip — emotional hero is an instrument. | returning | template |
| 25 | **P1** | Today | Greeting `text-2xl` still second hero when focus exists. | returning | repetitive |
| 26 | **P1** | Today | Body/support at `text-sm` — not body 17. | sleep-deprived | unfinished |
| 27 | **P1** | Today | Outline Ask Amy + ghost Premium = fourth/fifth button languages on home. | guest | manufacturing |
| 28 | **P1** | Coach card | Twin Soft Plate under Mission; outline CTA; uppercase eyebrow. | returning | repetitive |
| 29 | **P1** | Mission Success | Three exits stacked (Coach / Back / Ask Amy). | one-handed | fatigue |
| 30 | **P1** | Mission Success | Check + `text-primary` paint; hero not Constitution type. | returning | cheap |
| 31 | **P1** | Ask Amy | Static prompts ignore worry — template AI. | returning | template |
| 32 | **P1** | Ask Amy | Back + H1 tool header — not care hero air. | sleep-deprived | safe |
| 33 | **P1** | Premium | Dual CTAs: Continue + Restore. | returning | fatigue |
| 34 | **P1** | Premium | Type unused; catalog silhouette. | guest | unfinished |
| 35 | **P1** | Account gate | Three full-width buttons — decision stack. | guest | fatigue |
| 36 | **P1** | Signup | OAuth stack only 0.75 opacity — still loud vs email primary. | one-handed | busy |
| 37 | **P1** | Signup | Purple label ink / dividers / red error — not Nest mist/Bloom. | guest | corporate |
| 38 | **P1** | For Child guest | Primary marked on `outline` CTA — Bloom law broken. | guest | manufacturing |
| 39 | **P1** | Guest sheet | Title reuses CTA string as headline (“Ask about bedtime”). | guest | copy |
| 40 | **P1** | Nav | Personalized `For {name}` imbalances optical weight vs Today/Help. | returning | alignment |
| 41 | **P1** | Materials | Sheet Glass fill `bg-background/85` reads milky SaaS, not 8–12% quiet glass. | night | manufacturing |
| 42 | **P1** | Buttons | Widespread shadcn `outline` — fourth style vs Bloom/Soft Plate/Atmosphere. | all | manufacturing |
| 43 | **P1** | Lighting | Session freezes hour at first open — night parent stuck on evening wash. | night | product |
| 44 | **P1** | Lighting | Sleep worry does not force Night preset — sleep journey under daylight. | night | product |
| 45 | **P1** | Motion | Landing 20px rises · orb 4.5s pulse · signup 10s rotate · Framer bands — not one breath. | night | transition |
| 46 | **P1** | Coach prepare | Timed fake steps (0.9/1.8/2.8s) — fooled-wait risk. | sleep-deprived | empty |
| 47 | **P2** | Landing nav | Get-the-app Bloom in chrome. | first-time | corporate |
| 48 | **P2** | Front Door | Orb motion outside Constitution duration family. | night | transition |
| 49 | **P2** | Mission / Coach | Uppercase eyebrows (“Right now,” “Speech,” “Long-term”) — filing cabinet. | returning | copy |
| 50 | **P2** | Premium offline | WifiOff icon theater — SaaS ops residue. | night | cheap |

### Additional defects (51–60) — still real, not in Top 50 cut

| # | Sev | Issue |
|--:|:---:|-------|
| 51 | P2 | Mission Success: centered panel vs left CTA column — axis flip |
| 52 | P2 | Guest sheet: scrim tap = dismiss — one-handed accident risk |
| 53 | P2 | Front Door Name: Continue + Skip stacked decisions |
| 54 | P2 | Premium loading: twin skeleton bars feel like fake content |
| 55 | P2 | Account gate: Soft Plate wraps whole screen — Atmosphere default violated |
| 56 | P2 | Lighting hour buckets: 12–18 labeled Evening — afternoon as dusk |
| 57 | P2 | Tempo overlays (Quiet / Celebration / Unhurried) never lived |
| 58 | P2 | For Child H1 not `V2_TYPE.hero` |
| 59 | P2 | Front Door Complete: flag-off dead-end copy possible |
| 60 | P1 | Landing age band section may enter short viewports — dashboard under hero |

---

## Severity tally (Top 50)

| Severity | Count | Meaning |
|----------|------:|---------|
| **P0** | 16 | Apple would reject or stop the review |
| **P1** | 30 | Trust / luxury / consistency damage |
| **P2** | 4 (+ more below cut) | Polish after P0/P1 |

---

## Persona findings

| Persona | What breaks |
|---------|-------------|
| **First-time parent** | Landing looks like every AI startup. Brand identity flips three times before Today. |
| **Sleep-deprived parent** | Today is still a stack. Mission is a checkbox. Success sells Coach. Too many decisions. |
| **Night mode parent** | Legacy footer shelf + evening wash stuck + WifiOff/Premium ops chrome. Not Nest Night. |
| **One-handed parent** | Dual CTAs, three-button gates, stacked Success exits, scrim dismiss. |
| **Returning parent** | For Child empty. Focus chip as “hero.” Template prompts. Dashboard fatigue. |
| **Guest parent** | Soft sheet mid-Ask Amy; Coach→Signup wall; Neon Signup after calm Front Door — betrayal of breath. |

---

## Feel checklist (honest)

| Feel | Present? | Where |
|------|:--------:|-------|
| Unfinished | **Yes** | Type unused · Mission checkbox · For Child empty · legacy Coach |
| Cheap | **Yes** | Landing/Signup neon · Success primary paint · brand flip |
| Repetitive | **Yes** | Soft Plate twins · outline CTAs · eyebrow labels |
| Template-like | **Yes** | Focus chip hero · static Ask Amy prompts · plan rows |
| AI-generated | **Yes** | Landing Meet AMY · prompt wall · Assistant black box |
| Too empty | **Yes** | For Child signed-in · Mission Play thin ritual |
| Too busy | **Yes** | Today stack · Front Door choice lists · Landing fold |
| Too safe | **Yes** | Opacity Law of Three · outline everywhere · no bold Nest silhouette |
| Too corporate | **Yes** | Premium catalog · Signup purple SaaS · Restore commerce |
| Too dashboard | **Yes** | Today chapters · Premium plans · Landing age strip |
| Too product | **Yes** | Domain eyebrows · duration/difficulty meta · progress meters |

---

## What P0.1–P0.6 actually fixed (credit — not reopen)

- Spacing ladder tokens + widespread off-ladder removal inside V2 shells  
- Whisper nav *intent* (soft fill, short labels, no underline indicator in React)  
- Four-material craft tokens (Soft Plate / Sheet Glass / Elevated / Atmosphere)  
- Hollow For Child shelves deleted  
- Lighting CSS presets + bloom/orb emit classes  
- Law of Three markers + peer opacity  
- Guest sheet / dismiss language quieter than before  

**These are necessary. They are not sufficient.**

---

## Manufacturing defects (Apple would name)

1. **CSS fights React** — `.app-footer { height: 72px }` defeats Constitution nav.  
2. **Tokens unused** — `V2_TYPE` locked in tests, invented on surfaces.  
3. **Entry/exit outside craft** — Landing + Signup own the guest brand.  
4. **Legacy islands** — Coach understanding + Assistant black box.  
5. **Hierarchy as CSS opacity** — not composition.

---

## TRUE launch stage

| Stage | Fit? |
|-------|:----:|
| Concept / direction | Done |
| Craft spine / Constitution | Done (P0.1–P0.6) |
| **Internal dogfood** | **YES — current** |
| Closed alpha (friendly parents) | Only with apology for Landing/Signup/For Child |
| TestFlight / open beta | **NO** |
| App Store Nest Presence | **NO** |

---

## Would you ship this?

# **NO**

### WHY

1. Apple Design Review would fail on **Landing brand** and **Signup neon** before seeing Front Door.  
2. Core daily surface (**Today**) still reads as a **demoted dashboard**.  
3. Mission does not feel like a lived parenting moment — it feels like a **checkbox**.  
4. Guest path **punishes trust** (Success→Coach→Signup; Ask Amy sheet).  
5. **For Child** is an empty promise for returning parents.  
6. Whisper nav is **undermined by global CSS**.  
7. Optimistic 90+ scores measured **token theater**, not parental reality.

Ship when: one Nest brand from Landing→Signup, Today passes Law of Three without opacity excuses, Mission is a real step, Ask Amy is care not chatbot, For Child has a next breath, and the footer stops fighting the Constitution.

---

## Recommended next pressure (for Founder — not this sprint)

Ordered by damage, not convenience:

1. Kill Landing/Signup purple identity for V2 guest path (or divert entirely into Front Door ritual).  
2. Live `V2_TYPE` on every V2 surface.  
3. Fix `.app-footer` conflict so whisper nav is the only height/material.  
4. Today: true Law of Three (remove/relocate peers, not only opacity).  
5. Mission: replace checkbox ritual with one believable parenting action.  
6. Ask Amy: dissolve prompt wall; delay account sheet until after first help.  
7. Premium: continuity letter, not plan table.  
8. For Child: one real next step or hide the tab.  
9. Retire legacy Coach/Assistant islands from V2 craft path.

---

## STOP

P0.7 complete.  
**No fixes in this sprint.**  
Do **not** begin P0.8 / P1 until Founder directs.
