# AmyNest Philosophy — Company DNA

Visual systems are permanently frozen. This document is the permanent voice contract.

Every feature, notification, premium surface, memory, and return must satisfy these principles — or it does not ship.

## The Four Emotional States

Product language may express only:

1. **Notice** — observe without computing  
2. **Guide** — offer the next right thing  
3. **Remember** — hold what parents shared, completed, or saved  
4. **Support** — lighten load for exhausted parents  

Forbidden: score, judge, push, artificial celebrate, FOMO, urgency, guilt.

## The Five Immutable Principles

1. **Understand** — We help parents know the next right thing — never more than they need.  
2. **Trust first** — Trust precedes every request. Value before account, permission, or premium.  
3. **Remember kindly** — We remember only what parents shared, completed, or saved — never surveillance.  
4. **Life continues** — Returns continue life. Never restart, interrupt, or demand attention.  
5. **Calm companionship** — AmyNest supports exhausted parents with relief and restraint — never pressure.

## The Question Tax Law (Founder — Absolute)

Every additional question is a tax.

Every tap must earn its existence.

If the product can infer safely, never ask.

If the product must ask, immediately demonstrate why the answer mattered.

Parents should feel smarter after every answer, never more tired.

### Manufacturing consequences

- Prefer inference from continuity, age, context, and prior answers  
- Delete questions that do not change the next right thing  
- Never stack forms for completeness  
- After every required ask: show the value of the answer in the same beat  
- Child Discovery (when unlocked) must obey this law first  

## Manufacturing Law — Six Reviews (Founder — Absolute)

Every feature must pass **ALL six** reviews:

1. Founder Review  
2. Parent Review  
3. Apple Craft Review  
4. Engineering Review  
5. Database Review  
6. Growth Review  

A feature is **COMPLETE** only if all six pass.

Automatic FAIL:

- Beautiful but unstable  
- Technically perfect but emotionally weak  
- Good UX but poor conversion  
- Good conversion but broken trust  

Full law: `docs/AMYNEST_MANUFACTURING_LAW.md`

## Reuse Before Rewrite (Founder — Absolute)

If functionality already exists in the codebase, discover it first and reuse or refactor it.

Create a new implementation only when the existing architecture cannot support the use case.

Never invent a parallel system out of convenience.

## Today Home Law (Founder — Absolute)

If the parent has to decide what to do next, Today Home has failed.

If Today Home has to decide what to do next, AmyNest has succeeded.

### Manufacturing consequences

- Home must name **one** next right thing for this child today  
- Competing modules, equal heroes, and feature malls are automatic FAIL  
- The parent’s job is to act — never to choose among product options  
- Within three seconds: what matters, why, what to do next  
- Gate in code: `passesTodayHomeLaw()` · `TODAY_HOME_LAW`  
- Blueprint: `docs/v2/TODAY_HOME_BLUEPRINT.md`

## Premium Voice

Never: Buy · Unlock · Limited · Ending soon  

Instead: *We can support you further whenever you're ready.*

## Notification Litmus

Every notification must answer: **Would this make a tired parent feel lighter?**  
If not, remove it.

## Source of Truth in Code

`artifacts/kidschedule/src/lib/amynest-philosophy.ts`
