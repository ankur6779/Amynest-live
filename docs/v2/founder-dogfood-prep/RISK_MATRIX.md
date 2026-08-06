# Launch Risk Matrix

**Rule:** Classify remaining issues only. No implementation in this sprint.  
**Keys:** P0 launch blocker · P1 before public beta · P2 after launch · P3 future delight

---

## P0 — Launch blocker

| ID | Issue | Rationale |
|----|-------|-----------|
| R-P0-1 | `/ask-amy` and `/for-child` use `makeProtectedRoute` | Unsigned guests bounce to `/sign-in` despite soft-nav / For Child teaser — guest dogfood of those tabs is false |
| R-P0-2 | Post-auth return to Ask Amy / For Child vs children gate | New accounts without children can land in `/onboarding` instead of stashed path — breaks soft-save promise |

---

## P1 — Should fix before public beta

| ID | Issue | Rationale |
|----|-------|-----------|
| R-P1-1 | Guest account sheet lacks focus trap | Escape + initial focus only; keyboard users can tab behind the dialog |
| R-P1-2 | For Child sections are title-only shells | Even signed-in preview feels hollow — set expectation or fill presentation carefully before beta |
| R-P1-3 | Frozen Decision / Experience stack remains OFF | “Amy remembers / decides” brain story is not live in dogfood unless bind flags are turned on |

---

## P2 — Can improve after launch

| ID | Issue | Rationale |
|----|-------|-----------|
| R-P2-1 | Offline UX uneven | Premium crafted; other V2 surfaces rely on global amber banner |
| R-P2-2 | Unused / unread V2 flags in inventory | e.g. `mission_engine_v2` declared but mission gated by `today_v2` — rollout confusion |
| R-P2-3 | Unit tests bypass AppCore guest routing | Soft-gate tests green while production route guard contradicts guest story |

---

## P3 — Future delight

| ID | Issue | Rationale |
|----|-------|-----------|
| R-P3-1 | Runtime Inspector / Founder Observe are DEV-only | Correct for prod; founders must use DEV builds for instrumentation |
| R-P3-2 | Ask Amy wraps legacy assistant black box | V2 continuity copy; conversation quality is legacy — set dogfood expectation |

---

## Priority rollup

| Priority | Count | Dogfood impact |
|----------|------:|----------------|
| P0 | 2 | Blocks truthful guest observation of Ask Amy / For Child |
| P1 | 3 | A11y + expectation + brain-off clarity |
| P2 | 3 | Polish / inventory honesty |
| P3 | 2 | Tools + legacy assistant framing |

---

## Founder decision boxes

| Decision | GO / NO-GO | Notes |
|----------|------------|-------|
| Founder dogfood of Front Door → Today → Mission → Coach → Premium | | |
| Founder dogfood of guest Ask Amy / For Child | | Blocked until R-P0-1 addressed (or sessions note bounce as expected) |
| Public beta | | Requires P0 clear; P1 strongly recommended |
| Brain-on dogfood | | Separate wave — flags still OFF by design |

**STOP.** Wait for Founder review before any fix wave.
