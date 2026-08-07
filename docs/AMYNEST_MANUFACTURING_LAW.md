# AmyNest Manufacturing Law — Six Reviews

**Status:** NON-NEGOTIABLE · Founder absolute  
**Applies to:** Every feature, surface, and redesign after Welcome V3  

A feature is **COMPLETE** only if **all six** reviews pass.

---

## The Six Reviews

| # | Review | Must prove |
|---|---|---|
| 1 | **Founder Review** | Mission fit · emotional truth · AmyNest-only craft · freeze obedience |
| 2 | **Parent Review** | Tired parent feels lighter, smarter, more confident — never more tired |
| 3 | **Apple Craft Review** | Proportion · restraint · materials · motion · photography · no SaaS/HTML feeling |
| 4 | **Engineering Review** | Build/tests · no auth/session regressions · flags · a11y · offline · deep links |
| 5 | **Database Review** | Schema reuse · migrations justified · ownership/FKs/indexes · no duplicate data · existing users safe |
| 6 | **Growth Review** | Conversion / activation / retention / trust metrics improve or hold — analytics intact |

---

## Automatic FAIL conditions

| Condition | Verdict |
|---|---|
| Beautiful but unstable | **FAIL** |
| Technically perfect but emotionally weak | **FAIL** |
| Good UX but poor conversion | **FAIL** |
| Good conversion but broken trust | **FAIL** |
| Any one of the six reviews fails | **FAIL** — feature is not complete |

Partial credit does not ship.

---

## How reviews relate to prior law

| Law | Role |
|---|---|
| Four Pillars | What every screen must satisfy while manufacturing |
| Question Tax Law | How questions and taps are judged |
| Today Home Law | Home fails if the parent must decide next; succeeds when the product decides |
| Reuse Before Rewrite | Discover existing capability first; new code only when architecture cannot support the use case |
| Six Reviews | Whether the finished feature may be called **COMPLETE** |

All are absolute. None may override Production Safety.

---

## Reuse Before Rewrite (Engineering absolute)

Before writing new functionality:

1. Search the codebase for an existing implementation  
2. If found → reuse or safely refactor  
3. If not suitable → document the architectural gap  
4. Only then create a new implementation  

**FAIL:** duplicate business logic, parallel APIs, or second UI systems for the same job without a proven gap.

---

## Completion checklist (ship gate)

Before declaring COMPLETE:

- [ ] Founder Review — PASS  
- [ ] Parent Review — PASS  
- [ ] Apple Craft Review — PASS  
- [ ] Engineering Review — PASS  
- [ ] Database Review — PASS  
- [ ] Growth Review — PASS  

If any box is unchecked → **STOP. Do not ship. Do not freeze.**

---

## Source of truth in code

`artifacts/kidschedule/src/lib/amynest-philosophy.ts` → `MANUFACTURING_SIX_REVIEWS` · `isManufacturingComplete()`

See also: `docs/PRODUCTION_MANUFACTURING_PILLARS.md` · `docs/AMYNEST_PHILOSOPHY.md`
