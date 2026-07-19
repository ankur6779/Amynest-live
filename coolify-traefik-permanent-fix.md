# Coolify Traefik HTTPS — Permanent Fix

**Date:** 2026-07-13  
**Coolify host:** `188.245.208.126`  
**Application UUID:** `ik6ml2uhw6op765lo14wn5m3`  
**Public URL:** `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`  
**Coolify version:** 4.1.2

## Incident summary

After a Coolify redeploy, HTTPS requests returned **503** (`no available server`) while HTTP `/health` returned **200**. The app container was healthy on port 5000; Traefik had no HTTPS router for the backend host.

Manual edits to `/data/coolify/applications/ik6ml2uhw6op765lo14wn5m3/docker-compose.yaml` restored HTTPS temporarily, but the next native Coolify deploy removed the HTTPS labels again.

## Root cause

### 1. FQDN was stored as `http://`

Coolify generates Traefik router labels in `fqdnLabelsForTraefik()` (`bootstrap/helpers/docker.php`). HTTPS routers (`https-0-*`) are emitted **only when the domain scheme is `https://`**. With `http://`, only HTTP routers (`http-0-*`) are generated.

Before the fix:

```
fqdn = http://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io
is_force_https_enabled = true   (in application_settings)
```

`is_force_https_enabled` does **not** add HTTPS Traefik routers when the stored FQDN scheme is `http://`.

### 2. Stale labels are persisted and reused on every deploy

Coolify stores generated labels in `applications.custom_labels` (base64). On deploy, `ApplicationDeploymentJob::generate_compose_file()` does this:

- If `custom_labels` is set → **reuse DB labels** (after stripping `coolify.*` prefixes)
- Else if `is_container_label_readonly_enabled` → call `generateLabelsApplication()`

This app has `is_container_label_readonly_enabled = true`, so labels were written once (with HTTP-only routers) and then **replayed on every redeploy**.

### 3. What overwrites the labels

| Layer | Overwrites labels? | Role |
|-------|-------------------|------|
| **Coolify UI** | Indirectly | Domain/FQDN edits can regenerate labels via API controllers when saved through UI/API |
| **Docker Compose generation** | **Yes** | `ApplicationDeploymentJob` writes `docker-compose.yaml` from DB `custom_labels` on each native deploy |
| **Application configuration** | **Yes** | `applications.fqdn` + `applications.custom_labels` are the source of truth |
| **Template regeneration** | **Yes** | `generateLabelsApplication()` runs when labels are empty or via explicit regen; stored result is reused thereafter |

Manual edits to `docker-compose.yaml` on disk are **not** durable — the next Coolify native deploy regenerates the file from `custom_labels`.

## Permanent fix

### Configuration changes (applied on server)

1. Set `applications.fqdn` to `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io`
2. Regenerate `applications.custom_labels` with `generateLabelsApplication()` so `https-0-*` routers, TLS, and services are stored in DB
3. Run a **Coolify-native redeploy** (`queue_application_deployment`) so `docker-compose.yaml` is regenerated from the corrected DB state

### Repo enforcement script

```bash
# Regenerate labels + verify (no redeploy)
bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh

# Regenerate labels, redeploy via Coolify queue, verify
bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh --redeploy

# Verify only (after a deploy)
bash scripts/render-to-coolify/19-ensure-coolify-traefik-https.sh --verify-only
```

**Run this script before any Coolify backend redeploy** (including scheduler presync / env patch flows). Do not rely on post-deploy manual compose edits.

### Expected Traefik labels after fix

```
traefik.http.routers.http-0-...entryPoints=http
traefik.http.routers.http-0-...middlewares=redirect-to-https
traefik.http.routers.https-0-...entryPoints=https
traefik.http.routers.https-0-...tls=true
traefik.http.routers.https-0-...tls.certresolver=letsencrypt
traefik.http.services.https-0-...loadbalancer.server.port=5000
```

## Verification (fresh native redeploy — 2026-07-13)

Deployment UUID: `i10w82zevsfu98fpmv2m6qu7` — status **finished**.

| Check | Result |
|-------|--------|
| `docker-compose.yaml` contains `https-0-*` labels | **PASS** (7 lines) |
| `applications.custom_labels` contains `https-0-*` | **PASS** (7 lines) |
| HTTP `/health` | **302** → HTTPS (expected with `https://` FQDN + redirect middleware) |
| HTTPS `/health` | **200** `{"ok":true,...}` |
| HTTPS `/api/healthz` | **200** `{"status":"ok"}` |
| HTTPS `/api/healthz/audio` | **200** `{"ok":true,"status":"PASS",...}` |

Verified externally from the operator workstation as well.

## Canary status

**Canary remains disabled.** `CANARY_PERCENT = "0"` in `infra/cloudflare/amynest-api-proxy/wrangler.toml`. Do not advance canary until this verification passes in your environment (it has passed as of this report).

## Operational guidance

1. **Always set Coolify domains with `https://`** when creating or editing the application in Coolify UI.
2. **Before redeploying the Coolify backend**, run `19-ensure-coolify-traefik-https.sh`.
3. Prefer **Coolify-native deploy** (`queue_application_deployment` / UI Deploy button) over raw `docker compose up --force-recreate` so compose is regenerated from DB labels.
4. If HTTPS breaks again after a domain change, re-run the ensure script — do not patch `docker-compose.yaml` by hand.
5. Monitors should probe **HTTPS** URLs (`COOLIFY_API_URL`); HTTP may return 302 redirect.

## References

- Coolify label generation: `bootstrap/helpers/docker.php` → `fqdnLabelsForTraefik()`, `generateLabelsApplication()`
- Deploy compose path: `app/Jobs/ApplicationDeploymentJob.php` → `generate_compose_file()`
- Related incident report: `coolify-recovery-report.md`
- Known upstream discussion: Coolify Traefik label regressions (e.g. GitHub issue #10546)
