# Automated Content Factory

**Status:** Schedule enabled · **LIVE spend = ON** (`AMYNEST_CONTENT_FACTORY_LIVE=1`) — first production 2026-09-02 17:00 IST  
**AUTOMATION DRY RUN = PASS** (2026-09-01)  
**KIE video credits during setup = 0**

---

## Schedule

| Field | Value |
|-------|--------|
| DTSTART | **2026-09-02 17:00:00 Asia/Kolkata** |
| RRULE | `FREQ=DAILY;INTERVAL=3` |
| Occurrences | Sep 2, Sep 5, Sep 8, Sep 11, … @ 5:00 PM IST |
| Immediate run on deploy | **No** (before DTSTART + LIVE≠1) |

Cloud wake-up: GitHub Actions cron `30 11 * * *` (17:00 IST).  
The in-process schedule gate only produces on INTERVAL days at 17:00.

Equivalent systemd (optional host deploy):

```
OnCalendar=*-*-* 17:00:00
# ExecStart → content-factory tick (gate decides)
```

---

## Golden queue

Persistent ledger: `$AMYNEST_DATA_DIR/content-factory/golden-factory-queue.json`

| Rule | Behavior |
|------|----------|
| One run | Exactly one Golden Script |
| Order | Strict ascending |
| Consumed | Never regenerated |
| Failed | Blocks queue advance (no skip) |
| Historical | golden-001…013 marked PUBLISHED (013 = YouTube `_gLsFmfA888`) |
| **Next** | **golden-014** — Reaction Games That Train Focus Through Play |

States: `QUEUED → PLANNING → RENDERING → AUDIO → ASSEMBLING → VALIDATING → READY_TO_PUBLISH → PUBLISHED | FAILED`

Idempotency key: `amynest-{goldenScriptId}-{productionDate}`  
`MAX_PRODUCTION_ATTEMPTS = 1` (no automatic KIE re-spend)

---

## Character identity (hard lock)

Uses proven P0 identity stack:

- Canonical Amy / Girl / Boy bibles only  
- `resolveGenerationSeed()` — bible authority  
- Generated last-frame memory **local only** (KIE wire = 0)  
- Cross-character refs = 0  

Dry-run resolved hashes:

| Character | SHA-256 prefix |
|-----------|----------------|
| Amy AI | `6f65f19d2ac5…` |
| Amy Girl | `dc09bf858293…` |
| Amy Boy | `1cc38ca7b1f5…` |

---

## Production path

Live (when enabled): `operations/google-production-run.ts` with `AMYNEST_GOLDEN_NUM` from queue.

Gates before publish (existing launch validator + factory checks):

Golden integrity · identity · memory-on-wire=0 · audio completeness · A/V duration · diversity · thumbnail · YouTube metadata  

Critical FAIL → **do not publish** · status `FAILED` · preserve assets · no next-script consume.

---

## Cloud enablement

| Layer | Path |
|-------|------|
| Factory module | `content-engine/operations/content-factory/` |
| Dry-run CLI | `node --import tsx/esm ./operations/content-factory/cli.ts dry-run` |
| Scheduled tick | `…/cli.ts tick` |
| GH Actions | `.github/workflows/content-factory-every-3-days.yml` |
| Live kill-switch | repo variable `AMYNEST_CONTENT_FACTORY_LIVE=1` |
| Code ref (until merge) | repo variable `AMYNEST_CONTENT_FACTORY_REF=fix/p0-production-integrity` |

Secrets (env / GH secrets — never hardcoded):

`KIE_API_KEY`, `GEMINI_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

---

## Dry-run results (offline)

```
AUTOMATION DRY RUN = PASS
Next golden: golden-014
Next occurrences: 2026-09-02 | 2026-09-05 | 2026-09-08 | 2026-09-11 @ 17:00 IST
KIE video calls: 0
KIE video credits: 0
```

Proven checks: schedule Sep2 / not Sep3 / not before DTSTART · queue · idempotency · bibles · memory=0 · cross=0 · script-specific metadata · YouTube wiring · failure blocks publish · secrets env-based · cloud scheduler configured · no immediate spend.

Artifact: `content-engine/docs/operations/CONTENT_FACTORY_DRY_RUN.json`

---

## Ops snapshot

| Metric | Value |
|--------|--------|
| Queue position | next = **014** |
| Last successful (pre-factory) | golden-013 → https://youtube.com/shorts/_gLsFmfA888 |
| Next scheduled production | **2026-09-02 17:00 Asia/Kolkata** |
| Published via factory | 0 (LIVE off) |
| Failed via factory | 0 |
| Credits consumed (setup) | **0 video** |
| LIVE | **ON** (repo variable `AMYNEST_CONTENT_FACTORY_LIVE=1`) |

---

## Enable live production (after Sep 2 readiness)

1. Confirm dry-run still PASS on the deploy branch that includes identity locks (`fix/p0-production-integrity` or merged main).  
2. Set GitHub Actions variable `AMYNEST_CONTENT_FACTORY_LIVE=1`.  
3. Ensure YouTube + KIE secrets are present.  
4. Do **not** manually force a run before 2026-09-02 17:00 IST.  
5. First live tick at Sep 2 17:00 IST produces **golden-014** only if schedule + gates PASS.

QUALITY > SPEED · INTEGRITY > VOLUME — a failed run is preferred to a bad public Short.
