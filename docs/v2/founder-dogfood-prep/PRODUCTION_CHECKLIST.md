# Production Checklist

**Audit form** for founder dogfood / pre-beta. Mark each row during a live pass.  
**Report only** — this sprint does not implement fixes.

Build / SHA: ____________ · Date: ____________ · Tester: ____________

---

## Craft & accessibility

| # | Item | Pass | Fail | N/A | Notes |
|---|------|:----:|:----:|:---:|-------|
| 1 | Loading uses calm prepare (no MEET AMY flash on V2) | | | | |
| 2 | Accessibility: landmarks / labels readable by VoiceOver or TalkBack sample | | | | |
| 3 | Reduced motion: no jarring motion when OS reduce-motion ON | | | | |
| 4 | Focus: visible rings on primary CTAs | | | | |
| 5 | Keyboard: Escape dismisses guest sheet; Tab order sane on Today | | | | |
| 6 | Empty states use hope language (not “nothing here”) | | | | |
| 7 | Offline: banner or Premium offline phase appears when network cut | | | | |

---

## Journeys

| # | Item | Pass | Fail | N/A | Notes |
|---|------|:----:|:----:|:---:|-------|
| 8 | Guest journey: Front Door → Today without account | | | | |
| 9 | Signup return: soft-save lands expected surface | | | | |
| 10 | Premium continuity: guest → gate → signup → `/premium` | | | | |
| 11 | For Child preview: soft teaser (or record sign-in bounce) | | | | |
| 12 | Ask Amy continuity: concern-aware entry / sheet (or record bounce) | | | | |
| 13 | Coach continuity: plan / prepare survives account | | | | |
| 14 | Mission continuity: start → complete → gentle exit | | | | |

---

## Observation tooling (DEV)

| # | Item | Pass | Fail | N/A | Notes |
|---|------|:----:|:----:|:---:|-------|
| 15 | `?founderObserve=1` activates with console notice | | | | |
| 16 | `getSummary()` shows screen sequence | | | | |
| 17 | No parent-visible observation UI | | | | |
| 18 | Runtime inspector stays off unless opt-in | | | | |

---

## Frozen platform (sanity)

| # | Item | Pass | Fail | N/A | Notes |
|---|------|:----:|:----:|:---:|-------|
| 19 | Brain / Decision flags remain OFF in this dogfood build | | | | |
| 20 | Experience packs remain OFF | | | | |
| 21 | Production defaults for V2 flags remain false in repo | | | | |

---

## Sign-off

| Gate | Result |
|------|--------|
| Safe for founder dogfood (core path) | YES / NO |
| Safe for guest Ask Amy / For Child observation | YES / NO |
| Safe for public beta | YES / NO |
| Blockers filed in Risk Matrix | YES / NO |

Observer signature: __________________
