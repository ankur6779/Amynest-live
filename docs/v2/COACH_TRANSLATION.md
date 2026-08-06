# Coach Translation — Nest Presence from Day One

**Mode:** Translation only. No code. No mockups. No redesign exploration.  
**Frozen:** Constitution · Product · Features · Brain · Architecture · Routes · Coach engine after auth  
**Surface:** Today Coach card · `/today/coach-plan` (confirm → understanding → prepare → ready) · legacy `CoachUnderstandingScreen`  
**Jury rule:** Apple · Headspace · Airbnb · Linear — if **all four say NO → DELETE.**

---

## Day One question

Does this feel like **a setup wizard** or **a caring coach**?

**A setup wizard.**

Lived guest Coach is a four-phase funnel: confirm → purple legacy “Understanding” → timed fake prepare steps → “plan ready” → **Continue → `/sign-up`**. Caring language appears in spots (“Amy already sees what matters”), then the product behaves like onboarding software: checklist prepare, generate-first-win CTA, account gate as climax.

A Nest Presence coach would sit with the parent — one calm mirror of what they already shared, one invitation to continue when ready — not walk them through a multi-screen setup that ends in signup.

---

## Review by lens

### Journey

| Current phase / object | Decision | WHY |
|------------------------|----------|-----|
| Multi-phase wizard: confirm → understanding → preparing → ready | **MERGE** | Product may need continuity; *felt* journey must collapse toward one care conversation, not four admin steps. |
| Confirm: “Amy already sees what matters” + concern/name | **KEEP** | Caring coach voice. Real memory. |
| Confirm eyebrow “Amy Coach · Long-term” | **DELETE** | Taxonomy / product line stamp. |
| Confirm CTA “Yes — continue with Amy” | **KEEP** | Human consent. |
| Confirm “Back to today” | **WHISPER** | Soft exit. |
| Understanding via legacy `CoachUnderstandingScreen` | **DELETE** (as Nest surface) | Purple void · Sparkles · section stack · “Generate My First Win” = wizard island mid-Nest path. Capability of “Amy heard you” **MERGE** into Nest confirm/ready — not a second app. |
| Purple understanding gradient / violet chrome | **DELETE** | Identity break. Unanimous NO. |
| “Amy's Understanding” + bullet cards + approach + signals + focus areas | **MERGE** / **DELETE** bulk | One mirror is enough. Four sections = brochure wizard. Keep *hearing* meaning; delete personalization checklist theatre. |
| “Generate My First Win” | **DELETE** | Gamified setup verb. Not care. |
| Preparing: 0.9 / 1.8 / 2.8s timed steps | **DELETE** as fake progress | Fooled-wait wizard. Headspace/Apple NO. |
| Prepare step labels (understanding / holding / mapping) | **MERGE** | If any wait remains, one quiet Amy line — not a Soft Plate checklist advancing on timers. |
| Ready: “Amy is ready…” + “Create your account to save progress” | **MERGE** | Care headline OK; body is setup gate copy — account pressure as climax **DELETE** from emotional hero. |
| Ready “Continue” → hard `/sign-up` | **KEEP** (route capability) · **DELETE** (as Coach climax feeling) | Auth may be required later; Success-of-Coach should not *be* Signup. Trap. |
| Ready “Not right now” | **KEEP** · **WHISPER** | Relief exit — correct Nest instinct. |
| Post-auth real `/amy-coach` plan | **KEEP** | Real coaching lives after trust — not the fake prepare. |

### Progress

| Current | Decision | WHY |
|---------|----------|-----|
| Prepare Soft Plate step list with active/done states | **DELETE** | Classic wizard progress UI. |
| Pulse bar during prepare | **WHISPER** | One calm pulse OK if wait is honest; not a progress theatre. |
| Fake timed advancement | **DELETE** | Dishonest. Breaks trust. |
| Today card “Continue Your Plan” / resumable | **KEEP** | Real continuity when something exists. |
| Wizard completeness before any real plan | **DELETE** | Progress without substance = setup. |

### Plan

| Current | Decision | WHY |
|---------|----------|-----|
| Stashed / prepared plan gate (local) | **KEEP** (capability) | Soft-save continuity. |
| Ready copy implying readiness then account | **MERGE** | Be truthful: Amy is ready to *begin* with you — not “plan manufactured behind a spinner.” (Ready gate already tries honesty; still smells like setup.) |
| “Build My Plan” / “Start Your Plan” / “Continue Plan” CTA labels | **MERGE** | “Plan” is SaaS. Prefer journey/care verbs when translated — capability stays. |
| “New Goal” mode | **WHISPER** | Product mode OK; sounds like fitness app on Today. |
| Real plan generation only after auth | **KEEP** | Do not fake a full plan in guest wizard. |

### Cards

| Current | Decision | WHY |
|---------|----------|-----|
| Today Coach Soft Plate twin of Mission | **DELETE** from Today home | See `TODAY_TRANSLATION.md` — dashboard. Coach entry elsewhere. |
| “Amy Coach · Long-term” card eyebrow | **DELETE** | Filing cabinet. |
| Outline secondary CTA on Today card | **DELETE** (from Today) | Button democracy. |
| Understanding glass/violet cards (multiple) | **DELETE** | Wizard brochure. |
| Prepare step rows as cards | **DELETE** | Checklist. |

### Sections

| Current | Decision | WHY |
|---------|----------|-----|
| Understanding: hearing bullets | **KEEP** · **MERGE** into one Nest block | The caring core. |
| Understanding: Amy's Approach | **WHISPER** or **MERGE** into hearing | One idea — small repeated actions — can live in support line. |
| Understanding: “tailored using” check grid | **DELETE** | Feature checklist. Setup. |
| Understanding: “What coaching may focus on” + disclaimer | **DELETE** or **WHISPER** | Preview catalogue; anxiety + legal tone. |
| Confirm header + dual CTAs | **KEEP** structure (simpler) | Closest to caring coach already. |
| Ready header + Continue / Not now | **KEEP** structure · **MERGE** copy hierarchy | Account must not own the hero body. |

### Hierarchy

| Current | Decision | WHY |
|---------|----------|-----|
| Confirm Law of Three (hero / Continue / support) | **KEEP** | Good Nest instinct. |
| Understanding: many equal sections | **DELETE** | No hero — wall of modules. |
| Prepare: active step as hero via Soft Plate | **DELETE** | Progress as hero = wizard. |
| Ready: care headline · Continue Bloom · Not now | **KEEP** roles · **MERGE** body | Support should be care, not “create account.” |
| Signup as Continue target feeling like Coach success | **DELETE** | Wrong climax. |
| Legacy purple screen interrupting Nest Atmosphere | **DELETE** | Hierarchy of worlds — Nest then nightclub. |

### Emotional tone

| Current tone | Decision | WHY |
|--------------|----------|-----|
| Confirm: seen, named, calm | **KEEP** | Caring coach. |
| Understanding: AI product demo (Sparkles, Generate Win) | **DELETE** | Wizard / AI startup. |
| Prepare: “Amy working” with fake stages | **DELETE** | Performative care. |
| Ready: warmth + account ask | **MERGE** | Split — keep warmth; demote account to whisper/secondary truth. |
| Card: “Build My Plan” | **MERGE** | Builder tone → companion tone. |
| Long-term label | **DELETE** | Cold product. |
| Trap: care → signup wall | **DELETE** | Betrays coach. |

---

## Full element table

| Current element | Decision | WHY |
|-----------------|----------|-----|
| Coach product / `/amy-coach` after auth | **KEEP** | Real coach lives here. |
| Guest discovery route | **KEEP** (route) | Entry exists. |
| Today Coach Soft Plate | **DELETE** from Today | Dashboard (see Today translation). |
| Confirm care copy | **KEEP** | Heart of Nest Coach. |
| “Amy Coach · Long-term” | **DELETE** | Taxonomy. |
| “Yes — continue with Amy” | **KEEP** | Consent. |
| Back to Today / Not right now | **WHISPER** | Relief exits. |
| Legacy Understanding screen | **DELETE** | Purple wizard island. |
| Hearing bullets meaning | **MERGE** into Nest | One mirror. |
| Approach / signals / focus sections | **DELETE** | Setup brochure. |
| “Generate My First Win” | **DELETE** | Gamified wizard CTA. |
| Timed prepare checklist | **DELETE** | Fake progress. |
| Pulse / one quiet wait (if needed) | **WHISPER** | Honest stillness only. |
| Ready headline (guide journey) | **KEEP** | Care. |
| Ready body account-first | **DELETE** / **MERGE** | Setup pressure out of hero. |
| Continue → sign-up | **KEEP** capability · **WHISPER** framing | Don't climax as login. |
| Prepared plan stash | **KEEP** | Continuity. |
| Plan CTA vocabulary on cards | **MERGE** | Less “Build Plan,” more companion. |

---

## Surviving Coach (after translation)

Almost not a wizard:

1. **One Nest screen** — Amy names what you already shared (concern, child).  
2. **One invitation** — continue with Amy when ready.  
3. **One soft exit** — back to Today / not right now.  
4. **Account** — only when truly required, as whisper truth — never the emotional climax of “coaching.”  
5. **Real coaching** — after trust, in `/amy-coach` — not fake prepare.

No purple understanding tour. No Generate Win. No timed Soft Plate checklist. No Today twin card.

---

## Law of Three (Coach entry)

| Role | Survives |
|------|----------|
| Emotional hero | “Amy already sees what matters” (or ready care headline) |
| Primary action | Continue with Amy (care) — not Generate Win / not signup-as-hero |
| Supporting object | Named concern (+ child) · soft exit whisper |

---

## Verdict

| Question | Answer |
|----------|--------|
| Wizard or caring coach? | **Now: wizard. After translation: caring coach.** |
| Would Apple ship the purple Understanding island? | **NO** |
| Would Headspace ship fake prepare? | **NO** |
| Would Linear ship four phases to a login? | **NO** |
| One sentence | Coach should feel like being seen — not being onboarded. |

---

## What Coach would feel like if AmyNest had never been a SaaS product

You arrive because something is hard — sleep, talking, mornings. Amy does not open a setup wizard. She does not show violet feature cards or a progress checklist pretending to think.

She simply says she already sees what matters — the worry you named, the child you love — and that she can walk with you, one calm step at a time. You say yes, or you go back to Today. There is no “generate my first win.” There is no theatre of mapping steps on a timer. If an account is needed to keep the journey safe, that truth is quiet and later — not the applause after “your plan is ready.”

When coaching begins for real, it begins as guidance — not as a funnel that congratulated itself for finishing onboarding.

---

## STOP

Translation complete. No code. No mockups. No next screen.
