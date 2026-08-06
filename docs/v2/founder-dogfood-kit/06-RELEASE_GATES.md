# 6. Release Gates

**Rules:** Evidence from Observation Sheets + Bug Reports + Dashboard.  
No vibes-only GO. One P0 = NO GO for that stage.

---

## Gate definitions

| Stage | Who | Purpose |
|-------|-----|---------|
| **Internal** | Founder + team | Path works; no dead ends |
| **Alpha** | Trusted parents (small) | Confusion low; pay signal directional |
| **Beta** | Broader parents | Stability + clarity at volume |
| **Production** | Public | Rollout flags + support ready |

---

## Internal dogfood

### GO

- [ ] Fresh guest completes Front Door → Today → Mission → Back to Today  
- [ ] Reopen lands on Today (no COMPLETE loop)  
- [ ] Guest Ask Amy / For Child CTAs or tabs never hard-drop to raw Sign In mid-journey  
- [ ] Mission shows **one** clear back (Back to Today)  
- [ ] Today hierarchy: Mission strongest → Premium secondary → Ask Amy quieter  
- [ ] Premium entry visible; account-required messaging prepares for signup  
- [ ] **0** open P0s on happy path  
- [ ] ≥3 internal sessions with recordings  

### NO GO

- Any P0 on happy path  
- Auth wall from in-journey Ask Amy / nav CTA for guests  
- Front Door dead end / cannot reach Today  
- Mission unusable or duplicate back causes abandonment  
- Flags accidentally on in production defaults  

**Internal decision:** GO / NO GO · Date: ________ · Signer: ________

---

## Alpha

### GO

- [ ] Internal GO already signed  
- [ ] ≥8 parent sessions (mixed devices)  
- [ ] Mission completion ≥ **70%** of those who start  
- [ ] Major confusion ≤ **25%** of sessions (recovered without help)  
- [ ] Premium open rate measured (any % OK if not confusing)  
- [ ] Account creation path tested ≥3 times successfully  
- [ ] **0** P0 · P1s documented with owners  
- [ ] “Would you pay?” not universally No without reason  

### NO GO

- Mission completion &lt; 50%  
- Same P1 confusion in &gt; half of sessions  
- Account/Premium path surprises or feels like a trap  
- Crash rate unacceptable on Android or iOS dogfood builds  

**Alpha decision:** GO / NO GO · Date: ________ · Signer: ________

---

## Beta

### GO

- [ ] Alpha GO signed  
- [ ] ≥25 sessions across Android + iPhone (+ desktop optional)  
- [ ] Mission completion ≥ **75%**  
- [ ] P0 = 0 for 7 days of beta  
- [ ] P1 backlog triage done (fix or accept)  
- [ ] Soft-save / reopen validated on both mobile shells  
- [ ] Support / founder can reproduce top 3 bugs  
- [ ] Analytics (if on) not required for beta GO — but must not break UX  

### NO GO

- Platform-specific blocker (e.g. iOS-only broken mission)  
- Paywall / account trust issues unresolved  
- Regression vs Internal happy path  

**Beta decision:** GO / NO GO · Date: ________ · Signer: ________

---

## Production

### GO

- [ ] Beta GO signed  
- [ ] Feature flags rollout plan (defaults remain safe; staged %)  
- [ ] Rollback plan verified (`VITE_V2_FF_*` off → classic)  
- [ ] Store / web release owner named  
- [ ] Privacy / account / billing paths reviewed for real users  
- [ ] No known P0; accepted P1s listed in release notes  
- [ ] Dogfood Dashboard last wave green on completion + confusion  

### NO GO

- Flags default ON without rollout plan  
- Unresolved auth/billing P0/P1  
- Happy path weaker than beta baseline  
- No rollback owner  

**Production decision:** GO / NO GO · Date: ________ · Signer: ________

---

## Quick matrix

| Stage | Mission complete | P0 | Confusion | Audience |
|-------|------------------|----|-----------|----------|
| Internal | Path works | 0 | Founder OK | Team |
| Alpha | ≥70% start→complete | 0 | ≤25% major | Trusted parents |
| Beta | ≥75% | 0 for 7d | Triaged | Broader |
| Production | Hold beta bar | 0 | Accepted only | Public |
