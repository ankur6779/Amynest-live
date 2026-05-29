# Learning Zone Content Bank (v1.0.0)

Permanent, pre-generated curriculum JSON for progressive unlock in GCS. **Not** runtime AI output.

## Regenerate

```bash
pnpm run generate:content-bank
```

## Layout

| Path | Items |
|------|-------|
| `smart-study/items.json` | 500 lessons |
| `life-skills/items.json` | 300 lessons |
| `event-prep/items.json` | 200 activities |
| `math-progression/items.json` | 100 packs |
| `manifest.json` | Version, counts, shard paths |
| `stats.json` | Distribution + size estimates |

Each category has a `.json.gz` sibling for CDN upload.

## GCS upload

```bash
pnpm run upload:content-bank
```

Uses `DEFAULT_OBJECT_STORAGE_BUCKET_ID` and `GCS_SERVICE_ACCOUNT_JSON` from `.env` / `Amynest-backend-dykj.env`.

## API (authenticated)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/content-bank/manifest` | Version + shard paths |
| `GET /api/content-bank/status?childId=` | Unlock counts per category |
| `GET /api/content-bank/:category/feed?childId=&limit=&offset=` | Daily unlocked slice |
| `GET /api/content-bank/:category/:itemId?childId=` | Single item (403 if locked) |

Categories: `smart-study`, `life-skills`, `event-prep`, `math-progression`.

Unlock uses child age, `learning_progress` (`learningLevel`, `masteryScore`, `journeyDay`, completed `cb:*` activity ids).

Progress completion: `POST /api/learning-progress/complete-activity` with `activityId: cb:life-skills:{id}`.

The API loads from GCS first, then falls back to repo `content-bank/` for local dev.

## Static audio (Amy voice)

446 unique `audioText` phrases are in the static-audio corpus (`content_bank` source).

```bash
# Regenerate TTS + item→hash map (uses OPENAI_API_KEY + GCS from env)
pnpm run generate:content-bank-audio

# Or step by step:
pnpm run scan:speakable-phrases
pnpm --filter @workspace/scripts run generate-static-audio -- --content-bank-only
pnpm --filter @workspace/scripts run build:content-bank-audio-map
pnpm run upload:content-bank
```

Outputs:

- `content-bank/audio-map.json` — each item id → `hash`, `staticAudioUrl`
- `artifacts/kidschedule/src/data/content-bank-audio-map.json` (web)
- `artifacts/api-server/src/data/content-bank-audio-map.json` (API)

Playback uses `/api/static-audio/{hash}.mp3` via `AudioPlayButton` + learning-zone prewarm.
