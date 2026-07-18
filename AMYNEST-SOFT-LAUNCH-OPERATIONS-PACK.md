# AmyNest AI — Soft Launch Operations Pack

**Document owner:** Release Manager  
**Audience:** SRE, Mobile QA, Reliability, Product Operations  
**Effective date:** 2026-07-18  
**Scope:** Production soft launch of AmyNest (web + Android WebView + iOS Capacitor), including Gaming Hub  
**Constraint:** Product is **code complete**. This pack manages launch quality only. No features, redesign, UI polish, gameplay changes, or new gamification.

**Authority evidence (code gate):**
- Gaming Hub Phase 9: **SOFT LAUNCH ONLY** — zero open code P0; physical device lab and AT smoke not yet executed (`gaming-hub-phase9-ga-certification.md`)
- Platform plane: Coolify 100% traffic certified; Cloudflare Worker canary rollback path proven (`AMYNEST_COOLIFY_MIGRATION_FINAL_CERTIFICATION.md`)

---

## How to use this pack on launch day

1. Complete **§1 Pre-launch checklist** — every box must be checked or waived in writing by Release Manager.
2. Run **§2 Device** and **§3 Accessibility** smokes — blockers stop promotion past Internal / 20 users.
3. Confirm **§4 Subscription** critical paths on one Android + one iOS build.
4. Open **§5 Monitoring dashboard** before first external invite.
5. Advance stages only per **§6 Rollout plan** success criteria.
6. If any **§7 Rollback** auto-block fires — halt and execute **§8 Incident response**.
7. Judge stage health against **§9 Success metrics**.
8. Final gate: **§10 Recommendation** — do not override without new measurable evidence.

**Sign-off roles**

| Role | Initials | Date |
|------|----------|------|
| Release Manager | | |
| Staff SRE | | |
| Mobile QA Lead | | |
| Reliability Engineer | | |
| Product Operations | | |

---

## 1. Pre-launch checklist

Every item required before pressing Release / sending first external invite.

### 1.1 Build & release artifacts

- [ ] Production web build deployed (Cloudflare Pages / current prod host) matches intended git SHA
- [ ] Android Play Store track build uploaded (WebView shell `android/`) — versionCode / versionName recorded
- [ ] iOS App Store / TestFlight build uploaded (Capacitor) — build number recorded
- [ ] Release notes frozen (no “coming soon” that implies unfinished P0 work)
- [ ] Store listings, age rating, privacy policy, and support URL current
- [ ] Feature flags / remote config: no experimental Gaming Hub flags left on for soft launch unless intentional

### 1.2 Code & quality gates (desk — already expected green)

- [ ] No open **code P0** on Gaming Hub finish / wallet / mastery paths
- [ ] Kidschedule typecheck clean on release branch
- [ ] Critical reliability unit suites green (`game-finish`, `game-ga-reliability`, mastery/experience as applicable)
- [ ] API health: Coolify `/health` green; scheduler singleton owner correct
- [ ] OpenAPI / codegen not dirty vs release SHA

### 1.3 Backend & dependencies

- [ ] `DATABASE_URL` / Redis / BullMQ healthy on Coolify
- [ ] RevenueCat webhook URL live: `https://www.amynest.in/api/subscription/webhook` (auth secret configured)
- [ ] Firebase Auth + FCM configs match prod Android / iOS apps
- [ ] Cloudflare Worker / Pages DNS pointing at intended origin
- [ ] GCS / media / audio paths known-good (no CORS regression)

### 1.4 Soft-launch ops readiness

- [ ] On-call owner named for first 72 hours (primary + backup)
- [ ] Incident channel ready (`#amynest-launch` or equivalent) with paging path
- [ ] Monitoring dashboard (§5) open and baselined for 1 hour pre-invite
- [ ] Rollback owner knows Cloudflare `CANARY_PERCENT` / store halt procedures (§7)
- [ ] Invite list for Internal + 20-user cohorts prepared (consent / feedback form link)
- [ ] Parent support macro ready: “progress saved on device; Nest points sync when online”

### 1.5 Explicit soft-launch gates (must pass before leaving Internal)

- [ ] Real-device smoke: Android Go (~3GB) + mid-range + iPhone SE + one tablet (§2)
- [ ] TalkBack + VoiceOver smoke: Card Flip + one timed game (§3)
- [ ] Signed-in airplane → reconnect: mastery kept + wallet sync queue flushes once (§2 Offline)

**Release Manager rule:** Do not promote past **Internal** until 1.5 is complete. Do not promote past **100 users** until §4 Trial + Restore pass on both stores.

---

## 2. Device validation checklist

**Pass criteria per device:** App launches; hub usable; one short game completes; result shows; mastery/progress visible after return to hub; no hard crash/ANR during the script.

**Standard script (12–15 min / device)**

1. Cold start → sign in (or guest if cohort allows) → open Games  
2. Start Card Flip → complete → confirm result + return to hub  
3. Start one timed game (Speed Math or Target Tap Easy) → complete  
4. Background app 30s mid-game → resume (timers should pause when hidden)  
5. Airplane mode → complete one game → confirm result → reconnect → confirm sync (signed-in)  
6. Rotate to landscape once → confirm board usable / scrollable  

Mark each cell: **Pass / Fail / N/A / Blocked**

| Device class | Cold start | Card Flip | Timed game | Background resume | Offline finish | Landscape | Battery Saver | Low storage | Notes / build |
|--------------|------------|-----------|------------|-------------------|----------------|-----------|---------------|-------------|---------------|
| Android Go (~2–3 GB) | | | | | | | | | |
| Android mid-range | | | | | | | | | |
| Android flagship | | | | | | | | | |
| iPhone SE | | | | | | | | | |
| Latest iPhone | | | | | | | | | |
| iPad | | | | | | | | | |
| Android tablet | | | | | | | | | |

### 2.1 Condition-specific checks

| Condition | Steps | Pass if |
|-----------|-------|---------|
| **Landscape (phone)** | Rotate during intro and mid-game | Board reachable; no permanent white screen; CTAs tappable |
| **Landscape (tablet)** | Same | Usable (tablet-native layout not required) |
| **Battery Saver / Low Power** | Enable OS saver; play Target Tap + Sequence | Completes; no frozen timers after resume from background |
| **Offline** | Airplane → play → finish → land | Result always shown; mastery persists; signed-in wallet queued then flushes |
| **Low storage** | Device near storage pressure if available | App does not crash on finish; if storage write fails, user still sees result (support notes if mastery cannot persist) |

### 2.2 Soft-launch blockers (device)

Stop external invite if any of:

- Hard crash / ANR on two consecutive runs of the same script on a priority device (Go, SE, mid-range)
- Offline finish fails to show result
- Mastery wiped after successful completion on same device without clear storage clear
- Signed-in reconnect never flushes after three intentional retries (document as wallet sync incident)

---

## 3. Accessibility checklist

**Minimum soft-launch smoke (30–45 min total):** TalkBack + VoiceOver on Card Flip + Pattern Match (or Odd One Out) + Speed Math Easy.

| Check | Android TalkBack | iOS VoiceOver | Pass criteria |
|-------|------------------|---------------|---------------|
| Hub game list announced | | | Name + state (locked/ready) understandable |
| Intro CTA focusable | | | “Start” / tap-to-start reachable without sighted assist |
| In-game primary controls | | | Choices / cards / board actions announced |
| Result panel | | | Outcome + next action announced |
| Timed game warning | | | User can understand time pressure without visual-only cue |
| Escape / Back | | | Can leave game without trapping focus |

| Setting | Platform | Pass criteria |
|---------|----------|---------------|
| **Dynamic Type / large text** | iOS largest accessibility size; Android large font | Critical CTAs not clipped off permanently; game still completable |
| **Reduce Motion** | iOS + Android | No required information conveyed only by motion; finish/result still clear |
| **Switch Access** | One platform sample | Can reach Start → complete one simple game → exit |
| **Keyboard / external** | Web or tablet if available | Focus order logical; Enter activates primary CTA |

### 3.1 Soft-launch blockers (a11y)

- Cannot start or finish Card Flip with TalkBack **or** VoiceOver  
- Result screen not reachable / not announced after completion  
- Focus trap with no Back escape on either platform  

**Note:** Full WCAG audit is not a soft-launch gate. Device AT smoke is.

---

## 4. Subscription checklist

Run on **production or production-like sandbox** with real store sandbox accounts. One Android (Play) + one iOS (App Store) minimum before 100-user stage.

| Scenario | Android | iOS | Web (if enabled IN) | Pass criteria |
|----------|---------|-----|---------------------|---------------|
| **Trial start** | | | | Entitlement active; premium gates open within 2 min |
| **Renewal** | | | | Status remains active after renewal event / webhook |
| **Cancel** | | | | Access through period end; no false “expired” immediate lock (per product rules) |
| **Restore** | | | | Prior purchase restores entitlement on clean install / new device |
| **Upgrade** | | | | Correct plan; no double charge; entitlement matches package |
| **Downgrade** | | | | Effective per store rules; app reflects plan without crash |
| **Offline purchase recovery** | | | | Purchase while flaky/offline recovers after reconnect; webhook or restore heals entitlement |

### 4.1 Webhook / identity

- [ ] RevenueCat webhook deliveries succeeding (no sustained 4xx/5xx from AmyNest)
- [ ] Customer ID / app user ID linkage correct for test accounts
- [ ] Support can look up one test purchase end-to-end in &lt;10 minutes

### 4.2 Soft-launch blockers (billing)

- Trial or restore fails on both platforms  
- Webhook error rate sustained above auto-block threshold (§7)  
- Paid users systematically locked out of entitled features  

---

## 5. Monitoring dashboard

Open before first invite. Record baseline for 60 minutes. Review every stage gate.

### 5.1 Required panels / queries

| Signal | Source (typical) | Soft-launch watch | Alert owner |
|--------|------------------|-------------------|-------------|
| **Crash rate / crash-free sessions** | Play Console, App Store / Xcode Organizer, Firebase Crashlytics | Crash-free sessions ≥ 99.0% soft; ≥ 99.5% toward GA | Mobile QA / SRE |
| **ANR** | Play Console | ANR rate &lt; 0.47% (Play bad-behavior guide); investigate any spike | Mobile QA |
| **API latency** | Coolify / APM / Cloudflare | p95 `/api/*` within baseline ±30%; health 200 | SRE |
| **Offline sync queue** | Client telemetry if present; support reports; server play idempotency logs | Queue flush success after reconnect; no unbounded growth reports | Reliability |
| **Mastery sync / persistence** | Local mastery is device-first; watch support “progress lost” | Zero mass “progress wiped” reports; finish completions continue | Product Ops |
| **Wallet / play sync failures** | API `POST /gaming-rewards/play` 4xx/5xx + idempotency hits | Failure rate not trending up; duplicates short-circuit OK | Reliability |
| **RevenueCat webhook failures** | API logs + RevenueCat dashboard | Sustained failures → billing incident | SRE + Product Ops |
| **Session completion** | Analytics: game start → finish / result shown | Completion not collapsing vs Internal baseline | Product Ops |
| **Purchase success** | RevenueCat + store consoles | Trial/start success stable | Product Ops |

### 5.2 Launch-day cadence

| Window | Action |
|--------|--------|
| T−60m | Dashboard green; baseline snapshot saved |
| Every 30m (first 6h) | Crash/ANR/API/webhook skim |
| End of each rollout stage | Full §9 scorecard + go/no-go |
| Daily for 7 days | Trend review; stage promotion decision |

### 5.3 Snapshot template (copy per stage)

```
Stage: ________   Date/time: ________   Traffic / users: ________
Crash-free sessions: ____%
ANR: ____%
API p95: ____ ms
Webhook fail rate: ____%
Wallet sync fail rate: ____%
Session completion (vs Internal): ____%
Support tickets (P0/P1): ____ / ____
Decision: HOLD / ADVANCE / ROLLBACK
Signed: ________
```

---

## 6. Rollout plan

Advance **one stage at a time**. No skipping. Minimum soak before next stage unless Release Manager documents an emergency freeze (not an acceleration).

| Stage | Audience | Min soak | Entry criteria | Exit / success criteria to advance |
|-------|----------|----------|----------------|-------------------------------------|
| **0 — Internal** | Team + dogfood (≤10) | 24h | §1 complete; builds live | §2 priority devices Pass; §3 TalkBack+VoiceOver Pass; §4 Trial+Restore Pass one platform each; zero code P0 regressions |
| **1 — 20 users** | Closed invite (trusted parents) | 48h | Stage 0 exit met | Crash-free ≥ 99.0%; ≤1 P0 incident; offline reconnect verified by ≥2 external users; no mass mastery-loss reports |
| **2 — 100 users** | Expanded closed beta | 72h | Stage 1 exit met | Crash-free ≥ 99.2%; ANR under threshold; purchase path green; webhook fail rate within baseline; session completion ≥ Internal −10 pts |
| **3 — 500 users** | Broader invite / store % (~small) | 5 days | Stage 2 exit met | Crash-free ≥ 99.3%; ≤2 billing P1s total; support load manageable (&lt;5% of cohort reporting hard blocks) |
| **4 — 2,000 users** | Staged store rollout | 7 days | Stage 3 exit met | Crash-free ≥ 99.4%; purchase success stable; wallet/webhook stable 7 days; no unresolved P0 |
| **5 — 10,000 users** | Near-GA / high % | 7 days | Stage 4 exit met | Meets **Full GA** bar in §9; AT + device matrix still green; Release Manager + SRE dual sign-off |

**Store percent mapping (illustrative — set to match cohort size):**

| Cohort | Suggested Play / App Store % |
|--------|------------------------------|
| Internal / 20 | Internal testing / TestFlight only |
| 100 | ~1–2% (or closed track) |
| 500 | ~5% |
| 2,000 | ~20% |
| 10,000 | ~50–100% only after GA criteria |

**Feedback ops each stage**
- Collect: crash IDs, “progress lost”, “paid but locked”, “can’t finish game offline”
- Do **not** intake feature requests into the soft-launch backlog

---

## 7. Rollback plan

### 7.1 When rollout must stop

Halt advancement (and consider rollback) if **any** of:

| Trigger | Action |
|---------|--------|
| Crash-free sessions &lt; 98.5% over 4h rolling (or sudden −2 pts vs prior stage) | **Stop rollout**; triage; rollback store % if sustained 2h |
| ANR ≥ Play bad-behavior threshold or clear spike vs baseline | **Stop** Android %; investigate |
| API health failing 3 consecutive composite checks | **Traffic rollback** via Cloudflare Worker canary / origin switch (proven path) |
| RevenueCat webhook failure rate &gt; 5% sustained 30 min **or** entitlement outage for paid users | **Stop billing-related invites**; freeze store %; billing incident |
| Mastery / progress loss reported by ≥3 independent users same day with repro | **Stop** Games promotion; reliability incident |
| Offline sync / wallet double-award or silent loss confirmed in prod | **Stop**; reliability incident |
| P0 security / data exposure | **Immediate full halt** |

### 7.2 Automatic / standing block metrics

Treat as **auto-block** (no stage advance; Release Manager notified within 15 min):

1. Crash-free sessions &lt; 99.0% (soft launch) or &lt; 99.5% (pre-GA stages 4–5) over agreed window  
2. Sustained API 5xx / health failure (3 consecutive composite failures)  
3. RevenueCat webhook error spike above 5% for 30 minutes  
4. Confirmed paid-user lockout cluster (≥2 verified)  
5. Confirmed mastery wipe cluster (≥3 verified)  

### 7.3 Rollback actions (ordered)

1. **Stop invites** and freeze store rollout percent (do not increase).  
2. **Reduce store %** to previous good stage (or 0 / halt new installs).  
3. **API / edge:** set Cloudflare canary / backend switch to last known-good origin (Render hot standby path if still available; otherwise Coolify previous deploy).  
4. **Communicate** to cohort: short status + “progress on device; purchases restoreable”.  
5. **Do not** ship product changes during incident — only hotfix for P0 if Release Manager + SRE approve (outside this pack’s feature freeze for enhancements).  
6. **Postmortem** within 48h before any re-advance.

---

## 8. Incident response

**Severity**

| Sev | Definition | Response |
|-----|------------|----------|
| SEV-1 | Paid lockout, data loss cluster, API down for all, crash storm | Page on-call; halt rollout; war room |
| SEV-2 | Offline sync broken for signed-in; webhook degraded; high crash on one OEM | Halt advance; fix/mitigate same day |
| SEV-3 | Single-device quirks; cosmetic; isolated reports | Track; no stage skip |

### 8.1 Playbooks

#### Crash spike

1. Halt store % increase.  
2. Identify top crash in Crashlytics / Play / Xcode (stack + OS + device).  
3. Confirm whether Games-only or app-wide.  
4. If &gt; threshold §7 → reduce % / pull build from rollout.  
5. Hotfix only if SEV-1/2 and approved; otherwise hold at last good %.

#### Purchase failure

1. Check RevenueCat dashboard + AmyNest webhook logs.  
2. Verify store sandbox vs prod misconfig.  
3. Ask affected users to **Restore Purchases**.  
4. If webhook down → §7 billing block; do not tell users to re-buy.  
5. Confirm entitlement heal before resuming invites.

#### Mastery loss

1. Confirm whether user cleared site data / reinstalled / new device (local mastery is device-scoped).  
2. If wipe **without** storage clear → capture device, OS, steps; halt Games promotion.  
3. Reassure: Nest points / server wallet may still sync; mastery is local-first by design — set parent expectations honestly.  
4. Do not “add cloud mastery” as incident scope (feature freeze).

#### Offline sync failures

1. Reproduce: airplane → finish → reconnect.  
2. Check `POST /gaming-rewards/play` errors vs idempotent 200 replays.  
3. If queue never flushes → SEV-2; halt signed-in growth messaging that promises server sync.  
4. Mastery must still show locally; if not → escalate as mastery loss.

#### API outage

1. Confirm Coolify health + Cloudflare route.  
2. Execute edge rollback / origin switch per Coolify runbook.  
3. Client offline paths should keep Games playable; verify.  
4. Resume traffic only after 3 consecutive healthy composites.

#### RevenueCat outage

1. Freeze new purchase marketing / trial pushes.  
2. Keep Restore path available.  
3. Monitor webhook backlog when RC recovers.  
4. Reconcile entitlements before expanding cohort.

#### Cloudflare outage

1. Status page confirm.  
2. If Pages/Worker down: communicate degradation; avoid store % increase.  
3. When restored: smoke auth + Games hub + one finish + webhook.  
4. No stage advance until 60 min clean.

---

## 9. Success metrics

Targets are **gates**, not aspirations. Measure per stage window.

| Metric | Soft launch (stages 0–3) | Pre-GA (stages 4–5) | Full GA bar |
|--------|--------------------------|---------------------|-------------|
| **Crash-free sessions** | ≥ 99.0% | ≥ 99.4% | ≥ 99.5% |
| **ANR (Android)** | Below Play bad-behavior; no worsening trend | Stable ≤ baseline | Stable ≤ baseline |
| **Purchase success** (trial/start) | ≥ 95% of attempted sandboxed/prod trials that reach store sheet | ≥ 97% | ≥ 98% |
| **Mastery persistence** | 100% of completed sessions keep mastery on same device in QA; &lt;0.5% of cohort report unexplained loss | Same + no clusters | Same |
| **Offline recovery** | Result always; queue flush verified in QA + ≥5 cohort reports OK | Same at scale | Same |
| **Session completion** (start→result) | ≥ Internal baseline −10 percentage points | ≥ baseline −5 pp | ≥ Internal baseline |
| **Subscription conversion** (trial→paid where offered) | Track only; no kill unless billing broken | Within plan band | Within plan band |
| **Parent satisfaction** | Qualitative: &lt;10% of responding parents report “broken / unusable”; NPS/CSAT optional | Improving or stable | Soft-launch themes closed |

**Definition notes**
- **Mastery persistence:** local skill stage/score present after kill app and relaunch (same profile/device).  
- **Offline recovery:** finish offline → result → online → no user-facing hard failure; signed-in wallet eventually consistent via idempotent play.  
- **Session completion:** user-visible result screen, not server award alone.

---

## 10. Final recommendation

# SOFT LAUNCH

### Justification (measurable / evidenced)

| Evidence | Result |
|----------|--------|
| Code P0 on finish durability, idempotent play sync, offline fast-path, mastery corruption recovery | **Cleared** (Phase 9 unit + service evidence) |
| Dual-economy / soft-fail / mastery-first trust remediation | **Cleared** (Phase 8 + P0/P1 remediation reports) |
| Physical device lab (Android Go, SE, tablet, landscape, battery saver) | **Not executed** — residual P1 ops risk |
| TalkBack + VoiceOver hardware smoke | **Not executed** — residual P1 ops risk |
| Live signed-in offline → reconnect wallet flush | **Code OK; one live account smoke pending** |
| Platform traffic plane (Coolify 100%, Cloudflare rollback) | **Certified** — supports staged ops |
| Confidence scores (Phase 9) | **~78% soft launch** vs **~55% full GA without device/AT smoke** |

**Why not DO NOT RELEASE:** Code-complete reliability gates for Gaming Hub and platform plane are green enough for controlled cohorts; offline mastery and result durability are tested; rollback paths exist.

**Why not FULL GA:** Missing real-device matrix, AT smoke, and live reconnect proof required before 10k-scale confidence. Phase 9 explicitly blocks full GA until those ops checks pass.

### Release Manager directive

1. Proceed with **Stage 0 Internal** immediately after §1 boxes are checked.  
2. Do not invite external users until §1.5 device + a11y + offline reconnect pass.  
3. Climb §6 ladder only when exit criteria and §7 auto-blocks are clear.  
4. Revisit Full GA only when §9 Full GA bar is met with dual sign-off (Release Manager + Staff SRE).

---

## Appendix A — On-call contacts (fill on launch day)

| Role | Name | Phone / handle |
|------|------|----------------|
| Release Manager | | |
| Staff SRE | | |
| Mobile QA Lead | | |
| Billing / RevenueCat owner | | |
| Support lead | | |

## Appendix B — Related artifacts

- `gaming-hub-phase9-ga-certification.md` — code gate & soft-launch conditions  
- `gaming-hub-phase8-final-certification.md` — prior certification with conditions  
- `gaming-hub-p0-p1-remediation.md` — finish / soft-fail / economy demotion  
- `AMYNEST_COOLIFY_MIGRATION_FINAL_CERTIFICATION.md` — edge rollback / traffic plane  
- Store consoles: Google Play, App Store Connect, RevenueCat, Firebase Crashlytics  

## Appendix C — Explicit non-goals (soft launch window)

- No new games, APIs, or database tables  
- No XP/coins/streak redesign or new gamification systems  
- No UI redesign or “polish” passes  
- No gameplay balancing except SEV-1 hotfix if a game is unplayable  

---

**Document status:** Ready for Release Manager use on launch day.  
**Recommendation locked:** **SOFT LAUNCH** until §9 Full GA bar is evidenced.
