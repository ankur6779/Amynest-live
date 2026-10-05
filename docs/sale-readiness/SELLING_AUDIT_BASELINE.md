# SELLING AUDIT BASELINE

**Audit date:** 24 September 2026  
**Previous selling-readiness baseline (seller-stated):** ~30/100  
**Previous acquisition memo:** 14 September 2026 (`docs/AMYNEST_ACQUISITION_EXECUTIVE_SUMMARY.md`) — $100k readiness 22/100  
**This pass does not treat $30,000 as a valuation.**

Authoritative sources used:

| Domain | Source of truth | Queried this pass? |
|--------|-----------------|-------------------|
| Product code | This git monorepo | Yes (inspection) |
| Production web | `https://www.amynest.in` | Not re-probed end-to-end |
| Billing | RevenueCat project `proj9c1919f0` | Yes — 24 Sep 2026 |
| India web cash | Razorpay | **No** — UNVERIFIED |
| Play / App Store proceeds | Store consoles | **No** — UNVERIFIED |
| Paid ads | Google Ads customer `6395859996` | Yes — last 90 days |
| Analytics SSOT | First-party Postgres | **No live query** — historical only |
| Patent | Application 202611059355 + `patent/` | Filing facts as documented; grant **not** claimed |
| Legal entity | `legal-entity.ts` vs IPO papers | Conflict remains |

---

## What was found (current)

AmyNest is a **production parenting product** (web + iOS Capacitor + Android WebView) with **almost no independently underwritable revenue**. Live RevenueCat on 24 Sep 2026 is unchanged in substance from 14 Sep 2026: **3 active paid subscriptions, $5 MRR, $26.14 lifetime gross**.

Google Ads last 90 days: **₹18,946.27** spend, **2,354** Google “conversions”, **₹103** conversion value. Those conversions are **not** paid subscriptions.

---

## What has changed since 14 Sep 2026

| Item | 14 Sep 2026 | 24 Sep 2026 |
|------|-------------|-------------|
| Indian patent | Draft / application number **not verified** | **Application 202611059355** filed 10 May 2026; complete specification stated filed 19 Sep 2026; Form 3/5 eSigned (seller-stated) |
| RC 28-day actives | 283 | **231** |
| RC new customers 28d | (not restated) | **97** |
| RC lifetime gross | $26.14 | **$26.14** (19 Apr–24 Sep) |
| RC paying | 3 / $5 MRR | **3 / $5 MRR** |
| Google Ads 90d | ₹18,929 / 2,354 conv / ₹103 value | **₹18,946 / 2,354 conv / ₹103 value** |
| LICENSE file | Missing | **Still missing** |
| AmyWorld assignment | Missing | **Still missing** |
| Landing “12,000+ Parents” | Present | **Still present** (`en.json`) |
| “Patent-pending” copy | Present without receipt | **Still present**; filing number now exists but copy was not updated |

---

## Now verified (this pass)

- RevenueCat project `proj9c1919f0` “AmyNest AI”
- Active paid subscriptions = 3; trials = 0; MRR = $5; 28d RC revenue = $2; 28d RC actives = 231
- Lifetime RC gross $26.14; proceeds $16.83 (19 Apr 2026–24 Sep 2026)
- 7-day convert-to-pay: **1 of 2,738 new RC customers (0.04%)**
- Google Ads account “Amynest AI” (`6395859996`), campaign `23986249354` ENABLED
- Root `package.json` `"license": "MIT"` with **no** `LICENSE` file
- Product legal copy names **AmyWorld**; IPO papers name **Ankur Raman** as applicant/inventor
- Patent application number **202611059355** exists in `patent/` records

---

## Still unresolved

- Who legally owns the source code and content (Ankur Raman vs AmyWorld vs MIT grant)
- Razorpay lifetime collections
- Play Console / App Store Connect units and proceeds
- Registrar / Cloudflare / Coolify / Firebase / GCS account title
- Form 9 publication status (seller: being prepared — treat as **not published** until a publication number exists)
- Operating cost / AI COGS invoices
- Whether “12,000+ parents” and “30+ research studies” will be stripped before any listing

---

## Requires external evidence (cannot be completed from git)

1. AmyWorld incorporation / GST / bank account
2. IP assignment (founder + contractors + AI-assisted work)
3. Razorpay settlement CSV
4. App Store Connect and Play Console financial reports
5. Domain WHOIS / registrar login proof
6. Cloud invoice last 90 days (OpenAI, ElevenLabs, Hetzner, Cloudflare, GCS)
7. IPO Form 9 publication receipt
8. Counsel decision: MIT vs proprietary for a sale

---

## This-pass documentation (repo only)

Created under `docs/sale-readiness/` (audit + handover + data-room). Root `README.md` added as an engineering entry point. **No** `/sale/` listing package (score < 90). **No** LICENSE file added. **No** production or i18n claim changes.
