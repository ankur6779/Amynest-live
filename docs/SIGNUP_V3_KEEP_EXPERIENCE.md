# AmyNest Signup V3 — Keep Experience (R6)

**Status:** PERMANENTLY FROZEN — Founder approved  
**Authority:** Four Pillars · Welcome V3 freeze · Founder keep ritual brief  
**Frozen:** Welcome / `/begin` · Signup Keep Experience  
**Next:** Child Discovery — see `docs/v2/CHILD_DISCOVERY_BLUEPRINT.md` (Phase 1 study)

## Emotional goal

“I don’t want to lose what just happened.”  
That feeling arrives **before** the first form field.

Signup = preservation ritual. Authentication is secondary.

## Hierarchy (required)

1. **Keep** — sanctuary shell, no neon portal  
2. **What is being protected** — Keepsake card (show, don’t describe)  
3. **Quiet invitation** — one soft line  
4. **Identity** — OAuth / email as ways to protect the same keepsake  

## What shipped

| Surface | Keep behavior |
|---|---|
| Sign up | Keepsake hero → invitation → Apple/Google primary · Facebook/Phone secondary · email as quiet path |
| Sign in | Same hierarchy with return tone · guest try hidden on keep beat |
| Forgot password | “Find your way back” — never support-portal language |
| Verify email | “It’s safely held” — confirmation the keepsake is stored |
| Errors | Calmed — no blame, no Firebase codes in keep mode |

### Keepsake shows

- Child’s name  
- Today’s next right thing  
- What was completed  
- What remains safe  

### Production safety (preserved)

No rewrites of Google / Apple / Facebook / Phone / Email signup-login / Forgot / Verify / Firebase session / analytics / RevenueCat / feature flags.  
Copy + visual hierarchy only. Handlers untouched.

## Entry

`/sign-up?from=first-experience` · `/sign-in?from=first-experience`  
Continuity key: `amynest_first_experience_continuity_v1`

## Modules

- `artifacts/kidschedule/src/lib/first-experience/signup-keep.ts`  
- `artifacts/kidschedule/src/components/keep-keepsake-card.tsx`  

## STOP

Signup Keep Experience is permanently frozen.  
Do not edit keep ritual screens, copy modules, or OAuth hierarchy.
