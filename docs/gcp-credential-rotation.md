# GCP credential rotation runbook

Use after leaked keys were found in `attached_assets/*.json` (purged from git history).

## Prerequisites

1. **GCP Console access** as Project Owner on `amynest-836ff`
2. Enable **Identity and Access Management (IAM) API**  
   https://console.cloud.google.com/apis/library/iam.googleapis.com?project=amynest-836ff
3. Local: `Amynest-backend-dykj.env` (gitignored) or `gcloud auth login`

## Service accounts to rotate

| Purpose | Email | Render env var |
|---------|-------|----------------|
| Firebase Admin | `firebase-adminsdk-fbsvc@amynest-836ff.iam.gserviceaccount.com` | `FIREBASE_SERVICE_ACCOUNT_JSON` |
| GCS / TTS storage | `amynest-storage@amynest-836ff.iam.gserviceaccount.com` | `GCS_SERVICE_ACCOUNT_JSON` |

Also revoke these **leaked** key IDs (already in git history before purge):

- `8bbf2dc0d431e66dee3cec34605debae0c852a5c`
- `b8d1f279e14e883809ddd8f6ffbeba8b725b8bda`

## Automated rotation (after IAM API enabled)

```bash
# 1. Create new keys (writes to /tmp/amynest-key-rotation/, does NOT revoke yet)
python3 scripts/rotate-gcp-keys.py create

# 2. Push new JSON to Render (backend + worker)
python3 scripts/rotate-gcp-keys.py render-update

# 3. Verify production (see below)

# 4. Revoke old + leaked keys
python3 scripts/rotate-gcp-keys.py revoke
```

## Manual rotation (GCP Console)

1. IAM → Service Accounts → select account → **Keys** → **Add key** → JSON
2. Render Dashboard → `Amynest-backend-dykj` + `amynest-ai-worker-dykj` → Environment  
   Update `FIREBASE_SERVICE_ACCOUNT_JSON` and `GCS_SERVICE_ACCOUNT_JSON` (single-line JSON)
3. **Manual Deploy** both services (env change does not always hot-reload)
4. Delete old keys in GCP Console
5. Update local `Amynest-backend-dykj.env` to match

## Verify production

```bash
curl -sS https://amynest-backend-dykj.onrender.com/health
curl -sS https://amynest-backend-dykj.onrender.com/api/healthz/env | jq '.services.firebase, .services.gcs'
curl -sS https://amynest-backend-dykj.onrender.com/api/healthz/audio | jq '.gcs, .ok'
```

Expect `ok: true`, Firebase `configured: true`, GCS `configured: true`.

## Git history purge (done once per clone)

```bash
git filter-repo --force \
  --path attached_assets/amynest-836ff-8bbf2dc0d431_1776939767342.json \
  --path attached_assets/amynest-836ff-firebase-adminsdk-fbsvc-b8d1f279e1_1776939896747.json \
  --path attached_assets/google-services_1777659379780.json \
  --invert-paths

git push --force origin main   # coordinate with team; invalidates old clones
```

`.gitignore` includes `attached_assets/*.json`.

## Android `google-services.json`

Download fresh from Firebase Console → place at `android/app/google-services.json` (already gitignored).  
Do **not** commit to `attached_assets/`.
