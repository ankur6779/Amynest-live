# 5. Founder Dashboard

Fill after each wave of testers. Numbers only + short notes. No redesign discussion here.

**Wave:** _______________ · **Date:** _______________ · **Owner:** _______________

---

## Volume

| Metric | Count | Notes |
|--------|------:|-------|
| Number of testers | | |
| Sessions with usable recording | | |
| Fresh-install sessions | | |

---

## Funnel (guest happy path)

| Metric | Count | Rate | Notes |
|--------|------:|-----:|-------|
| Front Door completed | | % of testers | |
| Mission started | | | |
| Mission completion | | % of starters | |
| WOW rate* | | % of completions | *Mission complete within ~90s of door start if instrumented; else “felt wow” Y/N tally |
| Premium opens | | % of testers | |
| Account creation | | % of testers | |
| Reopen → Today success | | | |

\*If Firebase DebugView available: count `v2_wow_completed` / `v2_mission_completed`. Else use Observation Sheet “favorite / felt magic” qualitative tally labeled **Felt-WOW**.

---

## Confusion & defects

| Metric | Count | Top themes |
|--------|------:|------------|
| Major confusion (sessions) | | |
| P0 bugs | | |
| P1 bugs | | |
| P2 bugs | | |

### Top 3 confusion points

1.  
2.  
3.  

### Top 3 delights

1.  
2.  
3.  

---

## Willingness to pay (directional)

| Answer | Count |
|--------|------:|
| Yes | |
| Maybe | |
| No | |

**Why themes (bullets):**

-  

---

## Wave verdict (circle one)

| Verdict | Meaning |
|---------|---------|
| **CONTINUE DOGFOOD** | More testers; no code change required |
| **POLISH THEN RETEST** | P1s only; keep scope tiny |
| **HOLD** | P0 present — do not expand audience |

Link to Release Gates: [`06-RELEASE_GATES.md`](./06-RELEASE_GATES.md)
