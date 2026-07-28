# Go-Live Checklist — AmyNest YouTube Content Engine

Use this checklist for a fresh production server. Check every box before switching visibility to `public`.

---

## 1. Environment variables

Copy `content-engine/deployment/.env.production.example` and set:

```bash
AMYNEST_ENV=production
AMYNEST_TIMEZONE=Asia/Kolkata
AMYNEST_DAILY_CRON=0 9 * * *
AMYNEST_SCHEDULER_BACKEND=coolify   # or docker|systemd|cron
AMYNEST_DATA_DIR=/data
AMYNEST_BACKUP_DIR=/backups
AMYNEST_OUTPUT_DIR=/renders
AMYNEST_LOG_LEVEL=info
AMYNEST_SECRET_VALIDATION_MODE=strict
AMYNEST_PROVIDER_FALLBACK_MODE=none
AMYNEST_DAILY_VIDEO_COUNT=3
AMYNEST_SCRIPT_PROVIDER=openai      # mock only if OpenAI unavailable
AMYNEST_RENDERER=ffmpeg
AMYNEST_PUBLISHING_PROVIDER=youtube
AMYNEST_ANALYTICS_PROVIDER=youtube
AMYNEST_TREND_PROVIDER=mock
AMYNEST_DEFAULT_VISIBILITY=unlisted # approval mode for launch
```

Validate:

```bash
pnpm amynest:doctor
pnpm amynest:health
```

---

## 2. Secrets

| Secret | Required for | Set? |
|--------|--------------|------|
| `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` | Real GPT scripts (not Gemini) | [ ] |
| `GEMINI_API_KEY` | Google AI Studio Veo video generation | [ ] |
| `AMYNEST_VEO_ENABLED=true` | Prefer `google-veo` in asset resolution | [ ] |
| `YOUTUBE_CLIENT_ID` | OAuth refresh | [ ] |
| `YOUTUBE_CLIENT_SECRET` | OAuth refresh | [ ] |
| `YOUTUBE_REFRESH_TOKEN` | OAuth refresh | [ ] |
| `YOUTUBE_ACCESS_TOKEN` | Optional if refresh works | [ ] |
| `YOUTUBE_CHANNEL_ID` | Optional diagnostics | [ ] |
| `WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN` | Ops alerts | [ ] |

Never commit secrets. Prefer Coolify/systemd environment injection.

---

## 3. OAuth setup

1. Enable YouTube Data API v3 (+ YouTube Analytics API) in Google Cloud  
2. Create OAuth Desktop client  
3. Run:

```bash
pnpm run youtube:oauth-setup
```

4. Ensure consented scopes include at least:

- `https://www.googleapis.com/auth/youtube.force-ssl` (preferred)  
  **or** `youtube.upload` + `youtube.readonly`  
- `https://www.googleapis.com/auth/yt-analytics.readonly` (for live Analytics)

5. Confirm refresh works:

```bash
pnpm amynest:production-run -- --count 1 --visibility unlisted
```

---

## 4. Scheduler

Pick one:

| Backend | Action |
|---------|--------|
| Coolify | Daily job → `node --import tsx/esm ./cli/amynest.ts production-run` at `0 9 * * *` |
| Docker Compose | Keep container + external cron invoking production-run |
| systemd | Enable `amynest-content-engine.timer` |
| Cron host | `0 9 * * * cd /opt/amynest && pnpm amynest:production-run` |

Holiday-aware scheduling is available via ops scheduler when using Phase 10 bootstrap.

---

## 5. Storage

Persist volumes/paths:

- `/data` — workflows, analytics, learning, campaigns, publishing history  
- `/backups` — backup manifests  
- `/renders` — MP4 outputs  

Permissions: process user must be able to write all three.

```bash
mkdir -p /data /backups /renders
chown -R <runtime-user> /data /backups /renders
```

---

## 6. Monitoring

```bash
pnpm amynest:health
pnpm amynest:metrics
pnpm amynest:workflow-status
```

Wire `WEBHOOK_URL` (and optional Telegram) for:

- startup / shutdown  
- workflow failure / recovery  
- publish success  
- daily summary  

Confirm `providerFallbackMode=none` so unhealthy YouTube/FFmpeg cannot silently mock-publish.

---

## 7. Notifications

- [ ] Webhook endpoint receives JSON events  
- [ ] Telegram bot token validated (if used)  
- [ ] On-call channel subscribed  
- [ ] Test failure notification by temporarily breaking a non-prod credential  

---

## 8. Backup

```bash
pnpm amynest:backup
```

- [ ] Backup directory on persistent volume  
- [ ] Weekly restore drill: `pnpm amynest:restore --backup <id>`  
- [ ] Retain ≥7 daily backups  

---

## 9. Recovery

- [ ] Document `pnpm amynest:resume` in runbook  
- [ ] Confirm checkpoints written under `$AMYNEST_DATA_DIR/workflows`  
- [ ] Confirm no duplicate uploads after resume (idempotency keys)  
- [ ] On OAuth/token failure: refresh via env, re-run doctor  

---

## 10. Acceptance criteria (must all pass)

Run:

```bash
pnpm amynest:production-run -- --count 3 --visibility unlisted
```

| Criterion | Pass? |
|-----------|-------|
| Report `"ok": true` | [ ] |
| `videosPublished == 3` | [ ] |
| Three Unlisted YouTube URLs open in browser | [ ] |
| `learningUpdated == true` | [ ] |
| `campaignPlanId` present | [ ] |
| No silent mock publishing (`publishing: "youtube"`) | [ ] |
| Warnings understood (OpenAI/Analytics scope if any) | [ ] |

Then enable daily schedule. Keep `AMYNEST_DEFAULT_VISIBILITY=unlisted` until editorial approval; switch to `public` when ready.

---

## Launch day sequence

1. `pnpm amynest:doctor`  
2. `pnpm amynest:production-run -- --count 3 --visibility unlisted`  
3. Human review of Unlisted Shorts  
4. Enable scheduler  
5. `pnpm amynest:backup`  
6. Monitor first 48h via health/metrics/notifications  
7. Promote visibility to `public` when approved  

---

## Rollback

1. Disable scheduler/timer  
2. Set `AMYNEST_PUBLISHING_PROVIDER=mock` only for dry-run diagnosis (never leave this in prod)  
3. Restore last backup if state corrupt  
4. Investigate with `pnpm amynest:logs` + `pnpm amynest:diagnostics`  
