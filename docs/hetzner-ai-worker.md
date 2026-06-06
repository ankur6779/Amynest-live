# Hetzner AI worker (Redis on Render)

Production layout:

- **Amynest-backend** — Render (unchanged)
- **amynest-redis** — Render Key Value (unchanged)
- **amynest-ai-worker** — Hetzner CX33 (`167.233.39.146`)

## One-time setup

### 1. SSH access

Server must accept your Hetzner SSH key. If deploy fails with `Permission denied`:

```bash
# Load passphrase-protected key into agent (once per Mac reboot)
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_hetzner

# Or install key using root password from Hetzner email
bash scripts/hetzner/add-ssh-key-via-password.sh
```

Verify:

```bash
ssh root@167.233.39.146
```

### 2. Render Redis external access

1. Render Dashboard → **amynest-redis-dykj** → **Networking**
2. Add IP allow rule: `167.233.39.146/32`
3. **Connect** tab → copy **External** URL (`rediss://…`)

Optional (API key):

```bash
export RENDER_API_KEY=rnd_...
bash scripts/hetzner/render-redis-external.sh
```

### 3. Deploy worker

```bash
export HETZNER_HOST=167.233.39.146
export REDIS_URL_EXTERNAL='rediss://...'   # from Render Connect tab

bash scripts/hetzner/preflight.sh
bash scripts/hetzner/deploy-worker.sh
```

`DATABASE_URL` is auto-derived to Render Postgres **external** host from `Amynest-backend-dykj.env`.

## Cutover

1. Confirm Hetzner logs: `BullMQ worker started`
2. Render → **amynest-ai-worker-dykj** → **Suspend**
3. Test AI in app (chat / TTS)
4. Hetzner: `docker logs -f amynest-worker` → `Processing job:`

API env **does not change** — internal `REDIS_URL` stays on Render.

## Operations

```bash
# Logs
ssh root@167.233.39.146 docker logs -f amynest-worker

# Health
ssh root@167.233.39.146 curl -s http://127.0.0.1:9090/health

# Redeploy after code change
bash scripts/hetzner/deploy-worker.sh
```

## Files

| Script | Purpose |
|--------|---------|
| `scripts/hetzner/preflight.sh` | Pre-deploy checks |
| `scripts/hetzner/deploy-worker.sh` | Full remote deploy |
| `scripts/hetzner/build-worker-env.sh` | Build `.hetzner-worker.env` |
| `scripts/hetzner/render-redis-external.sh` | Render API: IP allowlist + external URL |
| `.env.hetzner-worker.example` | Env template |
