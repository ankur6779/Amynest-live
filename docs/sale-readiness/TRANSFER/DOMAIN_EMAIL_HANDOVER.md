# DOMAIN + EMAIL HANDOVER

**Date:** 24 September 2026

## Domains

| Host | Production use | Registrar | DNS provider | Account owner | SSL/TLS | Status |
|------|----------------|-----------|--------------|---------------|---------|--------|
| `amynest.in` | Apex / production host allowlist | **UNKNOWN** | **INFERRED** Cloudflare (Pages custom domain + Worker) | **UNKNOWN** | **INFERRED** Cloudflare Universal / edge cert | **UNKNOWN — OWNER ACTION REQUIRED** |
| `www.amynest.in` | Canonical web + API same-origin | Same | Same | **UNKNOWN** | Same | **UNKNOWN — OWNER ACTION REQUIRED** |
| `amynest-web.pages.dev` | Cloudflare Pages hostname; CI smoke target | Cloudflare | Cloudflare | **UNKNOWN** CF account | Cloudflare | Hosting **VERIFIED**; account title **UNKNOWN** |

Do **not** infer registrar from DNS. WHOIS was not independently verified this pass.

## Email

| Address | Role | Mail provider | Evidence | Status |
|---------|------|---------------|----------|--------|
| `support@amynest.in` | Public support / privacy contact | **UNKNOWN** | `support.tsx`, privacy/terms | **UNKNOWN — OWNER ACTION REQUIRED** |
| `ankur6779@gmail.com` | Example `ADMIN_ALERT_EMAIL` | Google personal | `.env.production.example` | **VERIFIED** as example founder mailbox — **must not** remain post-close |
| `demo@amynest.in` | Privileged QA | **UNKNOWN** mailbox | Code allowlists | Product identity; not a transfer of title |

## DNS hygiene (SPF / DKIM / DMARC / MX)

**UNKNOWN — OWNER ACTION REQUIRED.** No zone export in the repository. Presence of `support@amynest.in` does not prove MX/SPF/DKIM/DMARC.

## Transfer operations

1. **Account transfer:** registrar unlock + auth code → buyer registrar account; Cloudflare zone invite or transfer.  
2. **Credential rotation:** new Cloudflare API token; new mailbox passwords; change `ADMIN_ALERT_EMAIL`.  
3. **Service migration:** if registrar cannot transfer `.in` on the required timeline, buyer must be added as contact **and** DNS must already be on a transferable CF zone.

Renewal: **UNKNOWN** expiry and who pays.

## Acceptance

Buyer controls registrar **and** DNS and can keep HTTPS + production email working with founder accounts revoked.

**OPEN — OWNER ACTION REQUIRED**
