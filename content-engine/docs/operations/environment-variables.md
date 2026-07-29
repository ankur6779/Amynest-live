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
| `AMYNEST_COST_FIRST` | Offline → Cache → API Last provider selection (default on) | `true` |
| `AMYNEST_SCRIPT_PROVIDER` | Script provider id (`mock` default; paid LLM only if set) | `mock` |
| `AMYNEST_RENDERER` | Renderer id | `ffmpeg` |
| `AMYNEST_PUBLISHING_PROVIDER` | Publishing provider | `youtube` |
| `AMYNEST_ANALYTICS_PROVIDER` | Analytics provider | `youtube` |
| `AMYNEST_TREND_PROVIDER` | Trend provider | `mock` |
| `AMYNEST_DEFAULT_VISIBILITY` | Upload visibility | `public` |
| `AMYNEST_HEALTHCHECK_ENABLED` | Enable health checks | `true` |
| `AMYNEST_MONITORING_ENABLED` | Enable metrics | `true` |
| `AMYNEST_BACKUP_ENABLED` | Enable backups | `true` |
| `GEMINI_API_KEY` | Google AI Studio key for media stack (Imagen, Veo, TTS, Lyria) — not text by default | `AIza...` |
| `AMYNEST_GEMINI_ENABLED` | Enable Gemini **media** stack (does not force Gemini scripts) | `false` |
| `AMYNEST_GEMINI_SCRIPT_MODEL` | Default script model | `gemini-3.6-flash` |
| `AMYNEST_GEMINI_IMAGE_MODEL` | Default Imagen model | `imagen-4.0-fast-generate-001` |
| `AMYNEST_GEMINI_TTS_MODEL` | Default Gemini TTS model | `gemini-3.1-flash-tts-preview` |
| `AMYNEST_GEMINI_MUSIC_ENABLED` | Enable optional Lyria music | `false` |
| `AMYNEST_GEMINI_MAX_CONCURRENT` | Max concurrent Gemini media jobs | `2` |
| `AMYNEST_VEO_ENABLED` | Prefer `google-veo` when key present | `true` |
| `AMYNEST_VEO_TIER` | Veo tier (`daily\|premium\|budget`) | `daily` |
| `AMYNEST_VEO_MODEL` | Explicit Veo model override | `veo-3.1-fast-generate-preview` |
| `AMYNEST_VEO_OUTPUT_DIR` | Downloaded clip directory | `.amynest-assets/veo` |
| `AMYNEST_VEO_DURATION` | Requested seconds (`4\|6\|8`) | `8` |
| `AMYNEST_VEO_POLL_MS` | Poll interval | `5000` |
| `AMYNEST_VEO_TIMEOUT_MS` | Generation timeout | `600000` |
| `AMYNEST_VEO_RETRY_COUNT` | Veo retry count | `3` |

Secret variables are listed in [secrets.md](./secrets.md).

**Cost-first policy:** See [COST_EXECUTION_POLICY.md](./COST_EXECUTION_POLICY.md). Scripts default to `mock` (Golden Scripts / local templates). `AMYNEST_GEMINI_ENABLED` enables media only — set `AMYNEST_SCRIPT_PROVIDER=gemini` explicitly for paid script LLMs.

**Key separation:** `OPENAI_API_KEY` = optional GPT scripts (off under cost-first). `GEMINI_API_KEY` = media stack. Never overwrite one with the other.

**Validation CLI:** `pnpm amynest:test-gemini` runs script → Imagen → Veo → TTS → render → final MP4 and writes `content-engine/docs/operations/TEST_GEMINI_REPORT.md`.
