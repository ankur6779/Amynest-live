# AmyNest V2 — Migration (pointer)

**Status:** Locked planning (Phase 9 Migration Blueprint + Phase 9 naming amendment + Phase 11 routing map).  
**Sprint 0 deliverable:** Route Registry + redirect table only. No AppCore redirect wiring yet.

## Canonical names

- Tabs: **Today · Ask Amy · For [Child]** · Account (edge)
- Treasury surface: **For [Child]** (never “All Tools” / permanent “Practice”)
- Current hero wedge: **Speech** (`v2_wedge_id=speech`)

## Authoritative code (Sprint 0)

| Concern | Location |
|---------|----------|
| Route owners + lifecycle | `artifacts/kidschedule/src/registries/routes/` |
| Redirect map | `artifacts/kidschedule/src/registries/routes/redirects.ts` |
| Feature discovery stages | `artifacts/kidschedule/src/registries/features/` |
| V2 flags (incl. `migration_mode`) | `artifacts/kidschedule/src/lib/feature-flags/` |

## Required redirects (registered; not applied until migration flags)

| From | To |
|------|-----|
| `/dashboard` | `/today` |
| `/parenting-hub` | `/for-child` |
| `/assistant` | `/ask-amy` |

## Rules (do not redesign)

1. Redirect > break. Unknown → Today + safe message (later sprint).
2. Existing users keep ecosystem via For [Child] / deep links.
3. User content and entitlements are never archived.
4. Applying redirects requires `migration_mode` / `today_v2` (later tickets).

## Planning sources

Phase 9 Migration Blueprint, Phase 9 naming amendment, Phase 10 Routing Constitution, Phase 11 Implementation Blueprint, Phase 12 S0-T02.
