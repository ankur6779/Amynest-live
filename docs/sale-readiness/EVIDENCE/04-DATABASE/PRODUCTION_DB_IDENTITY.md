# PRODUCTION DATABASE IDENTITY (SB-G01)

**Date:** 25 September 2026  
**Verification timestamp (UTC):** 2026-09-25T16:15:18Z  
**SB-G01:** CLOSED  
No credentials, `DATABASE_URL`, usernames, or passwords are recorded in this file.

| Field | Value |
|-------|--------|
| Provider | Coolify-managed PostgreSQL on Hetzner VPS |
| VPS / public host (API plane) | `188.245.208.126` |
| Production DB hostname | `tcl9udyxcuq2zu598ebj0pfu` |
| Database engine | PostgreSQL (`postgresql` scheme; live minor version **not** confirmed this pass) |
| Database name (from URL path only) | `postgres` |
| Port | 5432 |
| Production status | **PRODUCTION** (`AMYNEST_ENV=production`, `NODE_ENV=production` in the current Coolify backend export) |
| Reachability from this laptop | Internal Docker/Coolify hostname — **does not resolve** off-host |
| Public Postgres port on VPS | TCP `188.245.208.126:5432` **not open** |
| Redis | **Separate** service |
| Redis hostname | `g7jotufnm43n4au4e8n6x946` |
| Redis port | 6379 |
| Historic (retired) DB host | `dpg-d85k80jtqb8s7382m7lg-a` (older export; Render-style; **not** current) |

## Evidence source

| Source | What it established | Type |
|--------|---------------------|------|
| Current Coolify backend export (`Amynest-backend-dykj.env`, 5 Aug 2026) | Host, engine scheme, production flags; credentials **not** copied here | VERIFIED (names/host only) |
| Live API health | `https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io/health` → HTTP 200; `https://www.amynest.in/api/health` → HTTP 200 | VERIFIED runtime |
| Prior Coolify cutover certs | Same DB hostname on this VPS; Redis separate | CORROBORATING (July 2026) |

## Production vs non-production

- Current export: production profile.
- Older export pointed at a different host (`dpg-…`) and is **not** treated as live.
- Local Homebrew Postgres on `127.0.0.1:5432` is **scratch/dev only**.

## What this does **not** prove

- Live PostgreSQL minor version.
- That a current encrypted dump exists (SB-G02).
- Off-host TCP access to Postgres (none from this machine).
