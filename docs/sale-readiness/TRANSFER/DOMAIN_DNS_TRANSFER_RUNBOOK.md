# DOMAIN / DNS TRANSFER RUNBOOK

**Date:** 24 September 2026  
**Do not change DNS, nameservers, or registrar in this pass.**

| Host / record class | Production role | Evidence | Registrar | DNS | Status |
|---------------------|-----------------|----------|-----------|-----|--------|
| `amynest.in` | Apex allowlist / brand | `config.ts` | **UNKNOWN — OWNER ACTION REQUIRED** | **INFERRED** Cloudflare | UNKNOWN registrant |
| `www.amynest.in` | Canonical web + `/api/*` Worker | Config + deploy | Same | **INFERRED** CF | Same |
| `amynest-web.pages.dev` | Pages hostname / CI smoke | Workflow | Cloudflare | Cloudflare | Account title UNKNOWN |
| Coolify origin sslip.io | Direct API (CI smoke) | `AUDIO_GATE_API_URL` / workflow | N/A | Host DNS | Not the public brand |
| Mail (MX / SPF / DKIM / DMARC) | `support@amynest.in` | Address in product; **no zone file** | UNKNOWN | UNKNOWN | **UNKNOWN** |
| API on www | Worker routes `/api/*` | `infra/cloudflare/amynest-api-proxy/` | — | CF Worker | VERIFIED as design |
| CDN / SSL | Edge TLS | CF Pages + Worker | — | **INFERRED** Universal SSL | Not independently re-probed this pass |

Do **not** infer registrar from nameservers.

## Procedure (not executed)

1. **Registrar transfer:** owner unlocks `.in` domain, obtains EPP/auth code, buyer’s registrar accepts; WHOIS updates.  
2. **DNS transfer:** invite buyer as Cloudflare Super Admin **or** export zone and import; do not flip NS until buyer resolves a test TXT.  
3. **Nameserver transfer:** only after zone is cloned and verified.  
4. **DNS verification:** `www` A/AAAA/CNAME + Worker route unchanged from pre-cut export.  
5. **SSL verification:** browser padlock on `https://www.amynest.in`; Worker still same-origin API.  
6. **Email verification:** MX receives `support@`; SPF/DKIM/DMARC pass a mail-tester.  
7. **Rollback:** restore previous NS / unlock cancel within registrar window; keep CF old zone.

**Acceptance:** buyer controls registrar **and** DNS; HTTPS + mail work; founder CF/registrar revoked later (Phase 4).

**OPEN — OWNER ACTION REQUIRED** (registrar unknown).
