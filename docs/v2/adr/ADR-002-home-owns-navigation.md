# ADR-002 — Home Owns Navigation

**Status:** Accepted (binding decision) · Implementation deferred to Founder-approved Platform V3  
**Date:** 2026-08-05  
**Laws:** L01 · L05 · L09 · L15 · L17  
**Canon:** [`AMYNEST_CANON.md`](../AMYNEST_CANON.md) · [`PLATFORM_V3_ARCHITECTURE.md`](../PLATFORM_V3_ARCHITECTURE.md) Pillars 2 & 5 · Design Constitution nav

---

## Why Home owns navigation

Dual land (`/today` vs `/dashboard`), classic tab bar vs Nest tab bar, logo/AI-pill chrome, and MEET AMY splash create **app-switching**. Engines that own their own nav or peer shells become visitor products. Unity Law requires one navigation for one Home.

---

## Decision

**The Home owns navigation.**

- One Nest shell and one Nest tab language when Nest is on  
- Room crossings, not app launches  
- Engines mount **inside** rooms — they do not ship peer nav or peer Homes  
- Classic dashboard / classic tab bar are legacy escape, not equal Home  

---

## Alternatives considered

| Alternative | Outcome |
|-------------|---------|
| A. Engines own their navigation (Coach app, Speech app, Assistant app) | Rejected — second Homes |
| B. Peer Nest and classic Homes forever | Rejected — permanent app-switching (F10/F11 symptoms) |
| C. Per-feature custom tab bars | Rejected — Design Constitution: one nav system |
| D. Home owns navigation; engines are room interiors | **Chosen** |

---

## Chosen

**D — Home owns navigation.** Entire app lives inside one Home.

---

## Reason

- L09 Unity: one atmosphere, one navigation, one shell, one language  
- L01 Home: parents cross thresholds; they do not open apps  
- Design Constitution: one bottom navigation; no per-screen invent  
- Platform goal: no moment where the parent thinks “I switched apps”  

---

## Consequences

| Positive | Negative / cost |
|----------|-----------------|
| Continuous Nest air across Living → Hearing → Study → Practice | Classic dual-path must be demoted, not polished as peer |
| Engines cannot justify “their own IA chrome” | Deep links must resolve into rooms, not product shells |
| AI-pill / MEET AMY leave Nest cold path | Branding/legal review for header quieting (F10/F11) |

---

## STOP

Decision record only. Not implementation.
