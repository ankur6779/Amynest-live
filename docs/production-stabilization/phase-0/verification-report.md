# Verification Report — Orphans, Duplicates, Dead Code

**Phase 0 only — nothing deleted.**

## 1. Orphan database tables

| Table | Risk | Recommendation |
|-------|------|----------------|
| `conversations` | Low — not exported, no reads | Keep; mark deprecated in Phase 12 |
| `messages` | Low — FK to conversations | Keep; mark deprecated |
| `phonics_audio_assets` | Medium — script-only | Keep; used by audio generation pipeline |
| `validation_runs` | Low — boot ensure only | Keep |
| `system_meta_state` | Low — lib-only | Keep; wire to admin in Phase 10 |
| `phonics_content_cache` | Low — lib-only | Keep |
| `health_lab_progress` | Medium — zero prod users | Keep; add analytics in Phase 1 |

## 2. Duplicate APIs

### Safe duplicates (intentional backward compatibility)

| Duplicate | Reason to keep |
|-----------|----------------|
| `/coach/*` ↔ `/ai-coach/*` | Mobile clients may use legacy paths |
| `/logs` ↔ `/log-client-error` | Client error reporting aliases |

### Overlapping (not duplicates — document only)

| Overlap | Action |
|---------|--------|
| 4 journey status endpoints | Extend each with analytics; do not merge |
| 3 daily-plan APIs | Domain-separated; document in API inventory |
| 2 notification pref systems | Extend `notification-prefs.ts`; keep legacy read |

### Broken duplicate paths (fix in Phase 1/3)

| Issue | Location |
|-------|----------|
| `growth_analytics` log type sent by client, rejected by server | `growth-analytics.ts` ↔ `client-logs.ts` Zod |
| Paywall: `premium_paywall_viewed` vs `paywall_opened` | Unify via taxonomy in Phase 1 |

## 3. Dead / ephemeral services

| Service / store | Persistence | Risk |
|-----------------|-------------|------|
| `startup-telemetry-store.ts` | In-memory (lost on deploy) | Phase 1: optional DB or analytics_events |
| `audio-health-store.ts` | In-memory | Phase 10: admin reads OK |
| `health-lab-metrics-store.ts` | In-memory | Phase 1: persist key metrics |
| `chatPlatformHealthStore.ts` | In-memory | Ops only |
| `client-logs` recent buffer | 200 entries | Admin debug only |
| `analytics quality counters` | In-memory | Phase 10: expose in admin |

**Not dead** — operational buffers by design. Do not remove.

## 4. Unused / low-traffic UI routes

~100 routes in `AppCore.tsx`. Routes with **zero production analytics signal**:

| Route / page | File | Notes |
|--------------|------|-------|
| `/reels` | reels integration | No DB events |
| `/health-lab` | `health-lab.tsx` | No user analytics |
| Debug routes | `debug-parity`, `openai-realtime-test` | Dev-only; gated |
| `/admin/audio-health` | Redirects to dashboard | Keep redirect |

**Do not remove** — user requirement: no feature removal.

## 5. Unused components (candidates for Phase 12 review)

| Component | Path | Signal |
|-----------|------|--------|
| `admin-audio-health.tsx` | Redirect only | Superseded by admin-dashboard |
| `game-maze-analytics.ts` | localStorage only | Named misleadingly; feature may be active |
| `phonics-telemetry.ts` | Dev console only | Prod uses amy-voice POST |

**Phase 12 action:** Refactor, not delete, unless proven unreachable.

## 6. Production bugs confirmed (cross-reference audit)

| Bug | Evidence | Target phase |
|-----|----------|--------------|
| Routine generation failure | 1 user_feedback + 13/148 users reach generate | **Phase 2** |
| `hub-journey/status` 500 | Render logs Jun 30, Jul 1 | **Phase 3** |
| `learning-progress/status` 500 | Render logs Jun 28, Jul 1 | **Phase 3** |
| `log-client-error` 500 | Render logs Jul 3 (meta-incident) | **Phase 3** |
| Phonics crashes | 43 crash_events on `/phonics` | **Phase 4** |
| Parenting hub crashes | 42 on `/parenting-hub` | **Phase 4** |
| `mathConfidenceStars` undefined | 3 crash_events | **Phase 4** |
| `device_header_missing` storm | 4,125 events (70% of spine) | **Phase 1** |
| `growth_analytics` HTTP 400 | Client/server Zod mismatch | **Phase 1** |
| 116 subs without profiles | SQL count | **Phase 5** |
| Paywall CTA 92% drop | 1/13 click | **Phase 7** |
| D1 retention 7% | retentionService | **Phase 6** |
| Notification CTR 0.28% | notification_log | **Phase 6** |
| 28 billing reconciliation failures | billing_audit_events | **Phase 7** |

## 7. Security surface (Phase 9 preview)

| Area | Current state |
|------|---------------|
| Auth | Firebase JWT + device registration |
| Admin | `ADMIN_USER_IDS` allowlist |
| Webhooks | RevenueCat, Razorpay signature validation |
| Rate limiting | Device limits, notification caps, usage_daily |
| SQL injection | Drizzle parameterized queries |
| Secrets | Render env; not in repo |
| CSRF | SPA + Bearer token (low CSRF risk) |

No critical security orphans found in Phase 0 scan.

## 8. Test coverage gaps (Phase 11 preview)

| Area | Known issues |
|------|--------------|
| kidschedule vitest | 3 files fail import setup (pre-existing) |
| api-server | analytics.test.ts exists |
| Full typecheck | `lib/content-orchestration`, `lib/phonics-curriculum` pre-existing errors |
| E2E | Playwright helpers exist; not full suite |

## 9. Phase 0 completion checklist

- [x] Architecture report
- [x] Dependency map
- [x] Analytics map
- [x] API inventory (~115 modules)
- [x] Database inventory (136 tables)
- [x] Migration inventory (44 + 7 manual)
- [x] Orphan table verification
- [x] Duplicate API documentation
- [x] Dead service identification
- [x] Unused component candidates
- [x] Cross-reference to production audit findings
- [x] No deletions performed
- [x] No code changes to production paths

## 10. Recommended phase order (validated against inventory)

```
Phase 0 ✅ Inventory (this document)
Phase 1 → Analytics foundation (unblocks measurement for all later phases)
Phase 2 → Routine system (P0 user bug)
Phase 3 → API stability (500s)
Phase 4 → Crash elimination
Phase 5 → User activation
Phase 6 → Retention
Phase 7 → Paywall
Phase 8 → Performance
Phase 9 → Security
Phase 10 → Admin dashboard
Phase 11 → Testing
Phase 12 → Code quality
Phase 13 → Final audit
```

**Rationale:** Phase 1 must precede Phases 5–7 and 10 so fixes are measurable. Phase 2 addresses the only confirmed user-facing bug report.
