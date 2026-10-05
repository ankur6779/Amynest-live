# AmyNest — Buy vs Build Analysis

**Date:** 14 September 2026  
**Question:** *“I can build this myself for $30K. Why pay $100K?”*  
**Rule:** Do not inflate engineering cost. Separate **demo clone** from **production-equivalent**.

Assumptions (labeled): India-based competent engineers, 2026 AI-assisted development, **$8,000–$12,000** fully loaded per person-month (use **$10,000** midpoint). US/EU rates would be ~2–2.5×; that helps a Western strategic’s buy case, not an Indian buyer’s.

---

## 1. What “$30K / 6 weeks” actually buys

A hostile engineer is **partly right**.

| Deliverable | In a $30k / 6-week clone? |
|-------------|---------------------------|
| React web UI for 3–5 screens (auth, child form, chat, fake routine) | Yes |
| Firebase email + Google sign-in | Yes |
| One OpenAI chat route | Yes |
| Stripe or Razorpay test checkout | Yes |
| Postgres + 10 tables | Yes |
| Live App Store + Play listings, approved IAP, RevenueCat webhooks matching entitlements | **No** |
| Android Play policy (no web checkout in Play shell) + BillingBridge | **No** |
| Apple Sign In + StoreKit + privacy nutrition + review cycles | **No** |
| Speech realtime (WebRTC / `gpt-realtime`) production path | **No** |
| FCM + APNs + token hygiene + notification fatigue | **No** |
| Age-band safety validator on generated routines | Maybe a JSON file, not production-tested |
| Device limits, restore, grace, refund webhooks | **No** |
| ~999 tests, CI release gates, OTA | **No** |
| Domain, SEO landings, ads pixels, Growth OS | Partial / no |

**Verdict on the $30k argument:** it builds a **fundraising demo**, not a **transferable parenting OS**. Equating the two is how ICs overpay *or* underpay. Here it is used to **underpay**.

---

## 2. Rebuild estimate — two products

### Product T — Thinner equivalent (what a rational buyer would actually rebuild)

Scope: Today Home + child profiles + routine generate/run + one AI coach + paywall + iOS + Android + RC + Play + Apple + Firebase + basic push + admin entitlements. **No** Birth Sky, content-engine, olympiad, abacus, Health Lab universe, 88-package zoo.

| Workstream | Person-months | $ at $10k | Calendar (2 people) | Risk |
|------------|---------------|-----------|---------------------|------|
| Web app (parent UX) | 2.5 | 25,000 | | Medium — design taste |
| Backend + DB | 1.5 | 15,000 | | Low |
| Auth (Firebase) | 0.4 | 4,000 | | Low |
| iOS Capacitor + Apple IAP | 1.2 | 12,000 | | **High** — review, Sign in with Apple |
| Android WebView or native + Play Billing | 1.2 | 12,000 | | **High** — policy |
| RevenueCat + webhooks + entitlements | 0.8 | 8,000 | | Medium — edge cases (restore, grace, refund) |
| Razorpay India web | 0.3 | 3,000 | | Low–med |
| AI coach + routine JSON + safety rules | 1.5 | 15,000 | | Medium — prompt quality |
| Speech/realtime | 1.5 | 15,000 | | **High** — WebRTC, cost, latency |
| Notifications | 0.6 | 6,000 | | Medium |
| Analytics + attribution | 0.5 | 5,000 | | Medium |
| Admin / growth basics | 0.4 | 4,000 | | Low |
| Deploy (CDN + API + worker + secrets) | 0.5 | 5,000 | | Medium |
| Tests + security + hardening | 0.8 | 8,000 | | Medium |
| Store approvals / legal pages / privacy labels | 0.8 | 8,000 | | **High** — calendar, not just hours |
| **Thinner total** | **~14.5** | **~$145,000** | **~7–8 months** | |

**Stress-the-estimate downward (AI coding, reuse, ruthless scope):** a very good two-person team that **already knows** RC + Play + Apple might land thinner at **~$80k–$110k and 4–6 months**. Below **~$60k / 3 months** they are shipping a clone, not production IAP.

### Product F — Full AmyNest scope

88 packages, content-engine, Birth Sky + ephemeris, phonics/speech/learning suite, notification intelligence, Growth OS, dual shells, OTA.

| | Person-months | $ at $10k | Calendar (3 people) |
|--|---------------|-----------|---------------------|
| Full recreation | **22–28** | **$220k–$280k** | **8–12 months** |

A buyer **should not recreate Product F**. Half of F has not been monetized. Paying $100k for F only makes sense if they will **use** a large fraction of it or it is cheaper than T **and** already live in stores.

---

## 3. Time, risk, opportunity cost

| | Build T | Buy AmyNest at $100k |
|--|---------|----------------------|
| Cash | $80k–$145k | $100k (+ transition $5–15k) |
| Time to live IAP on both stores | 4–8 months | **Days to weeks** if accounts transfer (Apple/Play transfer can still take weeks) |
| Store-rejection risk | High (first-time IAP) | **Already approved** (listings live; ratings absent) |
| Entitlement/refund/restore bugs | You will write them | Already webhooked (quality still must be tested) |
| Speech realtime | You start at zero | Code exists (`speech-coach-v2`, OpenAI Realtime) |
| Safety rules | You invent | `@workspace/safety` + gate tests exist |
| What you do **not** get | Control, simplicity | Users, brand proof, cash flow |
| Opportunity cost | 2 people × 5 months off *your* product | Integration sprint |

**Opportunity cost (assumption):** if the buyer’s existing parenting product does $X/month, five months delay is 5X plus competitive window. **NOT VERIFIED** for any named buyer — this is the only place $100k becomes “cheap.”

---

## 4. Attack on “I can build this for $30k”

1. **$30k is a prototype budget.** Live Play Billing inside a WebView wrapper that **blocks Razorpay**, plus Apple IAP, plus RC customer identity = a known graveyard of 2–3 extra months. AmyNest already paid that tuition (`native-billing.ts`, `BillingBridge`, `native-billing-ios.ts`).
2. **Store presence is an option, not a repo.** Bundle `com.amynest.app`, App Store ID **6767664343**, Play package live. First-time store + IAP approval is calendar risk. That is worth **something**; it is not worth $100k by itself (empty ratings).
3. **Domain logic is real but not magical.** `@workspace/safety` is a deterministic age-band validator (sleep, screen, intensity) — rebuildable in days as JSON, valuable as **already wired to generate-and-reject**. Routine + hub journey quotas + premium-gate (internal trial does **not** equal paid) is the kind of logic teams get wrong (documented in July 2026 subscription audit).
4. **You would not rebuild 88 packages.** So do not compare $100k to Product F. Compare to Product T: **$80k–$145k and 4–8 months**, with store risk.
5. **$100k vs $30k is the wrong fight.** The honest fight is **$100k vs $80k–$145k plus delay**. Then $100k is **not cheap**, but **not insane** for a strategic in a hurry — **if** they will use the OS and **if** they bring distribution.

---

## 5. What is actually worth acquiring (not rebuilding)

See also the component table in `AMYNEST_100K_ACQUISITION_STRATEGY.md` § technology.

**Worth paying for (time saved):**

- Live iOS + Android IAP + RC entitlement `premium` + webhook state machine  
- Play-policy WebView architecture (Razorpay blocked in shell)  
- Freemium gate that distinguishes internal trial vs store premium (`subscription-premium-gate.ts`)  
- Routine safety gate + parent-hub journey  
- Speech Coach v2 realtime path  
- Notification engine + native bridges  
- Production topology (Cloudflare → Coolify → Hetzner worker) **if** it transfers  

**Not worth a premium:**

- CRUD children/routines tables  
- Firebase wrapper  
- Marketing landings  
- Birth Sky / content-engine unless that is the buyer’s category  
- “Patent-pending orchestration” branding  

---

## 6. Head-to-head

| | Build T | Acquire @ $100k |
|--|---------|-----------------|
| Expected cost | $80k–$145k | $100k + $5–15k transition + AI COGS unchanged |
| Expected time | 4–8 months | Transfer 2–8 weeks + integration 1–3 months |
| Technical risk | Medium–high | Medium (complexity, founder) |
| Market risk | Same (you still must convert parents) | **Worse** if you keep AmyNest’s funnel; **better** if you throw the funnel and keep the pipes |
| $100k rational? | — | **Only if delay costs you ≥~$20k–$50k** in lost roadmap **and** you need both stores **now** |

**Hostile close:** If I do not already have parents, I build a thin T for ~$80k or I **do not enter this category**. I do not pay $100k for 3 subscribers.

**Sell-side close:** If I am a parenting app with users and no OS, **$100k vs 6 months** is a project-management purchase, not a SaaS purchase. That is the only honest $100k buy-vs-build.
