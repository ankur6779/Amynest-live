# Signup Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign. No new features.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes · Auth methods (as product capability)  
**Surface:** `artifacts/kidschedule/src/pages/sign-up.tsx` (+ AuthShell · NeonRingHero · OAuth/phone · legal footer)  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

If Signup had been designed by **Apple + Headspace** on Day One, would it look like this?

**No.**

This is a dark purple neon auth portal from the AI-startup era, with a continuity subline and opacity quieting bolted on when a guest arrives from Front Door / Coach / Premium. Apple would reject the atmosphere at first glance. Headspace would reject the anxiety of rotating rings, pink glow, and “AI-powered” copy at the moment of vulnerability. Nest Presence would never interrupt care with a nightclub login.

---

## Special focus

### Purple identity

| Finding | Verdict |
|---------|---------|
| Page background `#0a061a` → purple radial + concentric wave rings | **DELETE** — forbidden Nest costume |
| NeonRingHero — conic purple/pink rotate, shimmer, flicker flare, Meet/AMY glass | **DELETE** — neon is Constitutionally out |
| Purple label ink, purple dividers, purple Sign-in / legal links | **DELETE** as identity — keep links as mist whisper |
| Pink/purple gradient submit + pink hover bloom | **DELETE** paint — keep *one* primary submit as Nest Bloom (capability KEEP, identity DELETE) |
| `v2Calm` only dims neon to 0.45 / OAuth to 0.75 | **DELETE** as strategy — opacity is not translation |

Purple is not “brand accent” here. It is a second product identity that breaks Landing Nest → Front Door Nest → Signup betrayal.

### Social auth hierarchy

| Current | Problem | Decision |
|---------|---------|----------|
| Apple → Google → Facebook → Phone stacked **above** email | Four loud peers before the form; decision fatigue at trust moment | **MERGE** — one primary quiet path; social as secondary whisper stack (platform rules may require Apple prominence on iOS — still Soft Plate / Atmosphere, never neon peers of Bloom) |
| OAuth stack full-width equal height | Looks like a settings panel, not care | Recede visually; never compete with Continuity H1 + one Bloom |
| Phone OTP + purple hover glow | Extra anxiety + purple identity | **KEEP** capability if product-frozen · **DELETE** purple hover theatre |
| Divider “or” with purple hairlines | SaaS pattern | **WHISPER** or **MERGE** into spacing alone |

Auth methods stay (product frozen). Hierarchy must invert: **continuity + one Bloom create** lead; social is convenience, not the emotional hero.

### Trust

| Current | Problem | Decision |
|---------|---------|----------|
| Default subtitle: “Your AI-powered parenting coach…” | Anti-trust for Nest | **DELETE** wording energy — replace job with continuity or quiet care line (translation of copy role, not new feature) |
| Continuity subline when guest soft-saved | Real trust — “Save {name}'s {worry} progress” | **KEEP** — this is the emotional hero when present |
| Legal footer (Terms / Privacy) | Required | **WHISPER** — mist ink, not purple links |
| Tagline “Where Smart Parenting Begins” | Growth slogan under anxiety UI | **DELETE** |
| Red error banner | Necessary function | **KEEP** function · **DELETE** alarm-red SaaS chrome → quiet settle (role KEEP) |
| No child-safe / privacy line near submit | Trust only in legal microcopy | **MERGE** one short trust whisper near primary (with legal, not instead of) |

### Visual anxiety

| Current | Problem | Decision |
|---------|---------|----------|
| Ring rotate 10s · shimmer 3.5s · pulse · flicker · Amy glow · wave pulse 8s | Motion storm at account creation | **DELETE** all neon motion |
| Dark void + purple fog | Nightclub, not nest | **DELETE** — Nest Atmosphere + session light |
| Input purple focus glow | Electric fields | **DELETE** glow — Soft Plate field + quiet focus rim |
| Submit scale + pink outer glow on hover | Arcade CTA | **DELETE** theatre — Constitution press only |
| Busy state “Creating account…” vs prepare “Saving your place with Amy…” | Split personality | **MERGE** — always return-to-care language when continuity exists; never cold “Creating…” on Nest path |

### Return-to-care

| Current | Problem | Decision |
|---------|---------|----------|
| `buildSignupContinuitySubline` | Correct product intent | **KEEP** |
| Neon hero still dominates when calm (dimmed Meet AMY) | Care line loses to AI portal | **DELETE** neon hero so continuity can be the hero |
| Post-auth `resolveV2PostAuthPath` | Journey continuity (route frozen) | **KEEP** — invisible craft, not a visible SaaS panel |
| Sign-in link for existing parents | Return path | **WHISPER** |

Return-to-care means: the parent feels they are *saving a place with Amy*, not *onboarding into a coach SaaS*.

### Journey continuity

| Current | Problem | Decision |
|---------|---------|----------|
| Guest name + worry → subline | Continuity lived | **KEEP** as support/hero copy |
| Title still “Start Parenting Smart” when continuity present | Marketing headline fights soft-save | **MERGE** — title becomes care/continuity; default marketing title **DELETE** |
| Calm flag only quiets chrome | Page still reads as Sign-up product, not chapter of Front Door → Today | Continuity must own hierarchy: H1 care · one Bloom · fields Soft Plate · OAuth whisper |
| Landing Nest (if translated) → this purple wall | Brand discontinuity | Signup must share Nest Atmosphere or the guest path fails Apple review at the gate |

---

## Element decisions

| Current element | Decision | WHY |
|-----------------|----------|-----|
| AuthShell purple void + radial | **DELETE** | SaaS nightclub. Nest Atmosphere only. |
| Concentric wave ring shadows | **DELETE** | Decorative anxiety. Unanimous NO. |
| NeonRingHero (all layers) | **DELETE** | Neon · Meet AMY · rotating identity. Apple/Headspace absolute NO. |
| Hero underglow blur pink/purple | **DELETE** | Neon residue. |
| Dim-to-0.45 calm on neon hero | **DELETE** | Softening is not translation; remove the object. |
| Card chrome (`authCardStyle` dark glass) | **MERGE** | Keep a single Soft Plate / Atmosphere field for the form — not a floating SaaS card on purple. |
| H1 “Start Parenting Smart” | **DELETE** | Growth marketing. Not Nest. Not Headspace. |
| Default subtitle “AI-powered parenting coach…” | **DELETE** | AI tool pitch at vulnerability. |
| Continuity subline (`buildSignupContinuitySubline`) | **KEEP** | Return-to-care. Journey continuity. Emotional reason to create account. |
| Continuity as Law-of-Three support/hero | **KEEP** / **MERGE** | When present, this *is* the hero copy; title merges into it or whispers under it. |
| Apple Sign-In button | **KEEP** (capability) · **WHISPER** (visual) | Required on Apple platforms; must not out-glow Nest Bloom. |
| Google Sign-In button | **KEEP** (capability) · **WHISPER** (visual) | Convenience path; secondary. |
| Facebook Sign-In button | **KEEP** (capability) · **WHISPER** (visual) | Same — never peer of primary care CTA. |
| Phone OTP flow | **KEEP** (capability) · **WHISPER** (visual) | Product-frozen; delete purple hover only. |
| OAuth stack above email as primary | **MERGE** | Invert hierarchy: email/Bloom create leads; social below or quieter. (Platform Apple-first exception: Apple may stay top of *social* stack, still whisper vs Bloom.) |
| OAuth opacity 0.75 calm | **DELETE** as fix | Hierarchy by composition, not opacity theatre. |
| Divider “or” + purple lines | **WHISPER** | Or spacing-only merge — no purple. |
| Name field | **KEEP** | Human. Soft Plate field. Optional weight OK. |
| Email field | **KEEP** | Required account path. |
| Password field | **KEEP** | Required for email path. |
| Show / Hide password | **KEEP** · **WHISPER** | Utility; mist control. |
| Purple label ink | **DELETE** | Nest caption ink only. |
| Purple input focus glow | **DELETE** | Visual anxiety. |
| Error banner (role=alert) | **KEEP** | Must communicate failure. |
| Error red SaaS paint | **DELETE** paint | Quiet settle — function stays. |
| Submit “Create account” | **KEEP** (action) | One primary Bloom. Route/auth frozen. |
| Submit pink/purple gradient + glow | **DELETE** | Nest Bloom fill — not neon gradient. |
| Submit hover scale + pink bloom | **DELETE** | Arcade. Constitution press only. |
| Busy “Creating account…” | **MERGE** | Prefer return-to-care prepare copy on Nest path (`Saving your place with Amy…` already exists). |
| Busy prepare copy when continuity | **KEEP** | Correct Nest language. |
| “Already have an account? Sign in” | **WHISPER** | Necessary return path; never purple link shout. |
| AuthLegalFooter | **WHISPER** | Required trust/legal; mist, not purple brand links. |
| Bottom tagline “Where Smart Parenting Begins” | **DELETE** | Slogan under anxiety UI. Unanimous NO. |
| Pre-signup reengagement side effects | **KEEP** (invisible) | Product/analytics frozen — not a visible section. |
| Post-auth navigation / soft-save return | **KEEP** (invisible) | Journey continuity. |

---

## Decision tally

| Decision | What it means here |
|----------|-------------------|
| **DELETE** | Purple void · neon hero · waves · slogans · AI subtitle · neon submit paint · glow/flicker/hover theatre · opacity-as-design |
| **KEEP** | Continuity subline · email/name/password · create action · OAuth/phone *capabilities* · errors · legal · sign-in exit · post-auth return |
| **MERGE** | Title+continuity into one care hero · social under one primary · card→Soft Plate field · busy copy→return-to-care |
| **WHISPER** | Social buttons · Sign in · legal · show/hide · divider |

---

## Surviving composition (after delete)

Almost empty — a threshold to save care, not an auth product demo:

1. **Nest Atmosphere** (same world as Front Door / Landing Nest)  
2. **Care hero** — continuity line when guest has a journey; otherwise one quiet care title (not “Smart” / not “AI-powered”)  
3. **One Bloom** — Create account / save place  
4. **Soft Plate fields** — name · email · password  
5. **Whisper social** — Apple / Google / Facebook / Phone as convenience  
6. **Whisper** — Sign in · legal · one trust breath  

No neon. No Meet AMY. No tagline. No purple identity.

---

## Would Apple + Headspace ship this today?

| Team | Ship? | One line |
|------|:-----:|----------|
| Apple | **NO** | Neon portal fails Design Review before the form is read. |
| Headspace | **NO** | Anxiety motion + AI copy at the save-care moment. |
| Airbnb | **NO** | Feels like a tool gate, not a return to a place. |
| Linear | **NO** | Loud identity, weak hierarchy, opacity theatre. |

---

## What Signup would feel like if AmyNest had never been a SaaS product

You leave Front Door or a mission with Amy and the light does not change. Same Nest hour. No rotating ring. No “Meet AMY.”

A short line remembers why you are here — your child’s name, the worry you already named, the progress worth protecting. One warm action saves that place. Fields are quiet. Sign-in with Apple or Google is available without shouting. Legal text is there if you look. Nothing asks you to become a “smart parenting” customer. You are only keeping a promise with Amy.

That is Signup as Nest Presence — a soft lock on care, not a login page.

---

## STOP

Translation complete. No code. No mockups. No implementation.
