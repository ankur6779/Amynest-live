# BILLING FINAL TRANSFER GAP

**Date:** 2 October 2026  
**No production change. No invite sent. No keys printed.**  
Does **not** reopen May–August Play revenue or invent September Play.

Companion evidence: `EVIDENCE/11-REVENUECAT/RC_ACCOUNT_OWNERSHIP.md`.  
Operational keys: `REVENUECAT_*` names **ESCROWED** in SB-E01 (`SECRET_TYPE_INVENTORY.md`). Escrow of keys ≠ account transfer.

## What is proven

| Object | Evidence | Status |
|--------|----------|--------|
| RC project used in production | `proj9c1919f0` “AmyNest AI” | **VERIFIED** |
| RC project **owner** | Sole collaborator: Ankur Raman, `ankur6779@gmail.com`, role **owner**, MFA off | **VERIFIED** 2 Oct 2026 |
| Extra RC project on same key | `proj04992681` `project-G8jlulZm` | **VERIFIED** — disclose; not the live entitlement project |
| Play linkage inside RC | `app7b7fc89f20` ↔ `com.amynest.app`; Play SA credentials **configured** | **VERIFIED** |
| Apple linkage inside RC | `appa31011b39a` ↔ bundle `com.amynest.app`; ASC API key **and** subscription key **configured** | **VERIFIED** |
| Entitlement | `premium` | **VERIFIED** |
| Webhook | `https://www.amynest.in/api/subscription/webhook` | **VERIFIED** |
| Production RC API / webhook secrets | Names in Coolify export; **escrowed** SB-E01 | **VERIFIED** names; values not in Git |
| Razorpay | Code present; seller-stated unused; keys **NOT FOUND** in escrow | **SELLER-STATED** unused |
| Play / Apple **store account** transfer | Standard vendor process at closing | **BUYER-DEPENDENT** (not a current commercial P0) |

## What is **not** proven (do not invent)

| Claim | Finding |
|-------|---------|
| RevenueCat **organization / company** legal name | **UNKNOWN** — API shows a **person** as project owner |
| A documented **project-transfer** product (move `proj9c1919f0` to a buyer-owned RC org in one click) | **NOT VERIFIED** this pass. Do not write that RC “will transfer the project.” |
| Buyer can operate billing **without** a buyer RC login | **FALSE** — only one collaborator exists |
| Webhook HMAC value | Not returned by list API (by design) |

## Transfer vs replace (only these two paths)

**Path 1 — Collaborator handover (minimum documented RC mechanism)**  
1. **BUYER:** Create a RevenueCat account (buyer email, not `ankur6779@gmail.com`).  
2. **SELLER:** In project collaborators, invite that email as **Admin** (do **not** send until closing).  
3. **BUYER:** Accept invite; confirm Overview + `premium` entitlement.  
4. **SELLER:** After SPA, remove founder **or** transfer owner if/when the dashboard offers an owner change — **only if the UI actually shows it**; otherwise keep founder until buyer confirms Admin, then seller leaves.  
5. **BUYER + SELLER:** Issue **new** API keys; put them in buyer Coolify; **rotate** `REVENUECAT_WEBHOOK_SECRET`; confirm webhook 2xx. Old escrowed keys are for cutover, then revoke.  
6. After Play/Apple **app** transfers (closing, buyer store accounts): refresh **Play service-account JSON** in RC and **App Store Connect / subscription keys** (both currently configured under founder stores).

**Path 2 — Replace (if Path 1 is refused by vendor or buyer policy)**  
Buyer creates a **new** RC project, recreates Play + App Store apps, entitlement `premium`, products, webhook. Existing subscribers follow RevenueCat/store restoration — **not demonstrated** here. Treat as **higher operational risk**, not as a proven zero-downtime migrate.

Do **not** treat Path 2 as equivalent to Path 1.

## Founder-only dependencies (still)

- Sole RC owner = founder Gmail.  
- Play SA inside RC = founder Play.  
- ASC keys inside RC = founder Apple.  
- Webhook host = `www.amynest.in` (founder Cloudflare/domain until those transfer).  
- MFA **false** on owner — operational risk; **not** a transfer mechanism.

## Exact remaining actions

| Action | Who | When |
|--------|-----|------|
| Screenshot RC Project settings + Collaborators (redact keys) into `EVIDENCE/11-REVENUECAT/` | **SELLER** | Before listing / data room |
| Do **not** invite until buyer email exists | **SELLER** | Closing |
| Create RC account; accept Admin | **BUYER** | Closing |
| Confirm whether dashboard offers **owner/project transfer**; if not, Path 1 invite + Path 2 fallback in SPA | **SELLER** then **COUNSEL** | Before signing |
| After store transfers: re-upload Play SA + ASC keys | **BUYER** + **VENDOR** (RC) | Closing |
| Rotate RC keys + webhook secret on buyer infra | **BUYER** | After control |
| Optional: archive/disclose `proj04992681` | **SELLER** | Diligence |

**SB-L01 status:** Owner identity **VERIFIED**; **transfer not started**; buyer independence **FAIL** until Path 1 (or proven Path 2) completes.
