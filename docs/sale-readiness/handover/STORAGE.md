# STORAGE

| Store | Purpose | Title |
|-------|---------|-------|
| Postgres | App + analytics | UNVERIFIED cloud project |
| Redis | Queues / DLQ | UNVERIFIED |
| GCS | TTS cache when `TTS_USE_GCS=true`; historical audio/media | **Bucket IAM UNVERIFIED** |
| Cloudflare | Static SPA | UNVERIFIED |
| Firebase | Auth users | UNVERIFIED |

Signed URL policy, public bucket risk, and retention: **PARTIAL** — see `SECURITY_PRIVACY_BUYER_AUDIT.md`.

Buyer must transfer the GCP project or copy objects + rotate keys. Do not leave founder SA keys active after close.
