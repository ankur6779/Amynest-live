# DATABASE ACCESS DEPENDENCY (SB-G02)

**Date:** 25 September 2026  
**Verification timestamp (UTC):** 2026-09-25T16:25:00Z  
**SB-G02:** OPEN  
No credentials, cookies, or tokens are recorded in this file. Production was not changed. No backup was created.

## Finding

**E. COOLIFY ACCESS EXISTS BUT CURRENT CURSOR TOOLING CANNOT USE IT**

An authenticated Coolify **Chrome** session is live on this machine. The Cursor-owned browser and Coolify API used by this agent are **not** authenticated. Coolify VPS SSH is **not** available.

## Access matrix (this pass)

| Path | Authenticated | What was verified |
|------|---------------|-------------------|
| Google Chrome UI session | **YES** | Dashboard, AmyNest project resources, Postgres resource, Backups page, Servers page all returned Coolify app titles (not `/login`) |
| Cursor IDE browser | **NO** | Same URLs redirect to `/login` |
| Coolify API Bearer token | **NO** | `/api/v1/databases` still 401; no `COOLIFY_TOKEN` / `COOLIFY_API_TOKEN` in process env or local env **names** |
| Coolify VPS SSH `188.245.208.126` | **NO** | Existing Hetzner keys denied for root/ubuntu/coolify/deploy/admin/amynest |
| Worker VPS SSH `167.233.39.146` | **YES** (worker only) | Cannot reach Coolify Postgres |
| `hcloud` CLI | **NO** active context | Installed, not logged in |

## Resources visible in the Chrome session (titles / paths only)

| Resource | Visible now |
|----------|-------------|
| Production project (AmyNest) | **YES** — Resources page title |
| Production server list | **YES** — Servers page title |
| Production PostgreSQL `tcl9udyxcuq2zu598ebj0pfu` | **YES** — Configuration page title |
| Coolify Backups UI for that database | **YES** — Backups page title |
| Database terminal UI (historic visits) | Seen in Chrome history; **not** exercised this pass |

Chrome history also shows a Backups page and a database terminal route for this Postgres resource. That is **UI existence**, not a completed dump.

## Why the prior “no token” conclusion was incomplete

No API token was found. That does **not** mean there is no Coolify access. The owner already has a logged-in Chrome control-plane session. This agent cannot attach that session to the Cursor browser (separate cookie jar) and cannot run page JavaScript in Chrome (Apple Events JS is off). No cookies or tokens were copied.

## Database operation access from this agent

**UNKNOWN / NOT USABLE.** The Backups page is reachable in Chrome. This pass did **not** start a backup, open a terminal, or change Coolify settings.

## Safe next step (still no dump in this file)

Owner, in the already-authenticated Chrome tab on the Postgres **Backups** page, starts Coolify’s native backup **or** pastes a Coolify API token into the local environment (name `COOLIFY_TOKEN`) **or** logs into Coolify inside the Cursor browser. Then a later pass can create/encrypt the dump and scratch-restore. Do not open 5432. Do not add SSH keys from the agent.

## Actions not taken

No dump, firewall change, port open, SSH key add, credential rotation, deploy, restart, schema change, or Coolify configuration change.
