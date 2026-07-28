# Environment Variable Reference

Precedence: Defaults → JSON config → Environment variables → Runtime overrides.

| Variable | Purpose | Example |
|----------|---------|---------|
| `AMYNEST_ENV` | Runtime environment | `production` |
| `AMYNEST_CONFIG_PATH` | Optional JSON config path | `/etc/amynest/config.json` |
| `AMYNEST_TIMEZONE` | Scheduling timezone | `Asia/Kolkata` |
| `AMYNEST_UPLOAD_TIME` | Preferred upload clock time | `09:00` |
| `AMYNEST_DAILY_CRON` | 5-field cron | `0 9 * * *` |
| `AMYNEST_SCHEDULER_BACKEND` | `cron\|coolify\|docker\|systemd\|cloud` | `coolify` |
| `AMYNEST_DATA_DIR` | Persistent state root | `/data` |
| `AMYNEST_BACKUP_DIR` | Backup root | `/backups` |
| `AMYNEST_OUTPUT_DIR` | Render output | `/renders` |
| `AMYNEST_LOG_LEVEL` | `debug\|info\|warn\|error` | `info` |
| `AMYNEST_SECRET_VALIDATION_MODE` | `strict\|permissive` | `strict` |
| `AMYNEST_DAILY_VIDEO_COUNT` | Videos per daily job | `3` |
| `AMYNEST_WORKFLOW_CONCURRENCY` | Parallel units | `2` |
| `AMYNEST_SCRIPT_PROVIDER` | Script provider id | `openai` |
| `AMYNEST_RENDERER` | Renderer id | `ffmpeg` |
| `AMYNEST_PUBLISHING_PROVIDER` | Publishing provider | `youtube` |
| `AMYNEST_ANALYTICS_PROVIDER` | Analytics provider | `youtube` |
| `AMYNEST_TREND_PROVIDER` | Trend provider | `mock` |
| `AMYNEST_DEFAULT_VISIBILITY` | Upload visibility | `public` |
| `AMYNEST_HEALTHCHECK_ENABLED` | Enable health checks | `true` |
| `AMYNEST_MONITORING_ENABLED` | Enable metrics | `true` |
| `AMYNEST_BACKUP_ENABLED` | Enable backups | `true` |
| `GEMINI_API_KEY` | Google AI Studio key for Veo video generation | `AIza...` |
| `AMYNEST_VEO_ENABLED` | Prefer `google-veo` when key present | `true` |
| `AMYNEST_VEO_MODEL` | Veo model id | `veo-3.1-generate-preview` |
| `AMYNEST_VEO_OUTPUT_DIR` | Downloaded clip directory | `.amynest-assets/veo` |
| `AMYNEST_VEO_DURATION` | Requested seconds (`4\|6\|8`) | `8` |
| `AMYNEST_VEO_POLL_MS` | Poll interval | `5000` |
| `AMYNEST_VEO_TIMEOUT_MS` | Generation timeout | `600000` |

Secret variables are listed in [secrets.md](./secrets.md).

**Key separation:** `OPENAI_API_KEY` = GPT scripts. `GEMINI_API_KEY` = Gemini/Veo. Never overwrite one with the other.
