# Framework Debt Register

**Status:** BINDING inventory — documentation only  
**Nest CSS:** COMPLETE — do not reopen  
**Sources:** CSS Phases 1–3 · FRAMEWORK_LIMITATIONS · PIXEL_PERFECTION_REPORT

---

## Classification legend

| Class | Meaning |
|-------|---------|
| **A — Framework Debt** | Imposed by ChatPlatform / Assistant / App Shell / SDK / layout contracts |
| **B — Component Debt** | Owned by a Nest-adjacent component that is not craft tokens (swap or wrap needed) |
| **C — Intentional Debt** | Founder-approved dual path or frozen product composition |
| **D — Future Product Debt** | Product capability / IA / engine identity — not presentation manufacturing |

This register lists **A** and **B** only. **C** / **D** → [`PRODUCT_DEBT_REGISTER.md`](./PRODUCT_DEBT_REGISTER.md).

---

## Audit matrix (every remaining mismatch)

| ID | Mismatch | Room | CSS? | Composition? | Imposed by | Architecture? | Class |
|----|----------|------|:----:|:------------:|------------|:-------------:|:-----:|
| F1 | ChatPlatform keyboard / `adjustResize` / scroll | Hearing | **NO** | **NO** | ChatPlatform | **YES** | A |
| F2 | Inline `style` textarea height | Hearing | **NO** | Partial* | ChatPlatform | **YES** | A |
| F3 | `Loader2` spinner loading language | Hearing | **NO** | **YES**† | Assistant Engine | **YES** | A/B |
| F4 | Topic grid / interactive message tree chrome | Hearing | **NO** | **NO** | ChatPlatform + Assistant | **YES** | A |
| F5 | AmyIcon ring / prop-driven sizes in engine | Hearing | **NO** | **YES**† | Assistant / component props | **YES** | B |
| F6 | Mode tabs / WEB_MODES (if re-exposed) | Hearing | **NO** | **YES**† | Assistant Engine | **YES** | A |
| F7 | Quota / briefing / upgrade cards in thread | Hearing | **NO** | **YES**† | Assistant Engine | **YES** | A/D |
| F8 | Coach plan engine after Nest discovery | Study | **NO** | **NO** | Assistant / Coach engine | **YES** | A |
| F9 | Speech / mission engine internals | Practice | **NO** | **NO** | Speech / mission framework | **YES** | A |
| F10 | App logo + “AI” pill above Nest shells | All tabs | **NO** | **YES**† | App Shell | **YES** | A/B |
| F11 | MEET AMY splash before Nest paint | Cold nav | **NO** | **YES**† | App Shell / route fallback | **YES** | A |
| F12 | Native auth keyboard shell padding | Keep | **NO** | Partial* | App Shell (native) | **YES** | A |
| F13 | Native store paywall sheet | Continuity | **NO** | **NO** | Third-party SDK (store) | **YES** | A |
| F14 | Chat bubble structure / CVA Button sizes in engine | Hearing | Soft-bound only | **YES**† | Assistant + UI kit | **YES** | B |

\*Composition could hide or wrap, not own the contract.  
†Composition = Nest wrapper / component swap without changing Brain — still not CSS Phase work.

---

## Framework Debt Register (A · B)

| ID | Priority | Impact | Difficulty | Owner | Risk | Class | Notes |
|----|:--------:|:------:|:----------:|-------|:----:|:-----:|-------|
| F1 | **P0** | High — Hearing never feels like Nest while scrolling/typing | Hard | ChatPlatform | High — keyboard regressions | A | Blocks 95%→board on conversation |
| F2 | **P0** | Medium — composer optical fight | Medium | ChatPlatform | Med — resize edge cases | A | Inline style beats CSS |
| F3 | **P1** | Medium — spinner ≠ prepare | Easy–Med | Assistant presentation | Low | A/B | Swap to Nest prepare component |
| F10 | **P1** | High — every tabbed room | Medium | App Shell | Med — branding/legal | A/B | Nest tab bar is clean; chrome above isn’t |
| F11 | **P1** | High — cold trust break | Medium | App Shell / Suspense | Med — perceived perf | A | Nest already has calm prepare |
| F8 | **P1** | High — Study identity after Nest | Hard | Coach engine | High | A | Nest shell stops at discovery |
| F9 | **P1** | High — Practice play internals | Hard | Speech / mission | High | A | Nest owns play chrome only |
| F13 | **P1** | Medium — Continuity after Nest gate | Hard | Billing / store SDK | High — store policy | A | Cannot Nest-skin native sheet |
| F4 | **P2** | Medium — chatbot theatre | Hard | ChatPlatform | High | A | Interactive tree = engine |
| F6 | **P2** | Medium — dashboard relapse risk | Med | Assistant | Med | A | Header hidden in Nest nest |
| F7 | **P2** | Medium — SaaS cards in care | Med | Assistant + Product | Med | A/D | Also product gate |
| F5 | **P2** | Low–Med | Easy | AmyIcon / Assistant | Low | B | Prop API |
| F14 | **P2** | Medium | Med | UI kit + Assistant | Med | B | Nest soft-bind maximized |
| F12 | **P3** | Low | Med | Native shell | Low | A | Keep Nest shell already tokened |

---

## Priority key

| Priority | Meaning |
|----------|---------|
| P0 | Blocks Nest Presence on a core room (Hearing conversation) |
| P1 | Visible on every session or major room |
| P2 | Visible in secondary engine surfaces |
| P3 | Edge / native only |

---

## Owner map

| Owner | Scope |
|-------|--------|
| **ChatPlatform** | Keyboard, scroll, thread layout, composer geometry |
| **Assistant Engine** | Modes, briefing, quota UI, thread chrome, spinner |
| **App Shell** | Logo pill, MEET AMY splash, native keyboard chrome |
| **Coach / Speech engines** | Post-Nest Study / Practice |
| **Store SDK** | Continuity native paywall |
| **UI kit** | shadcn Button CVA inside engines |

---

## What this register does **not** authorize

- New Nest CSS  
- Constitution edits  
- Room translation / copy / hierarchy  
- Brain / API / analytics work under the CSS track  

Further premium on F1–F14 = **framework or product programs**, not CSS Translation.
