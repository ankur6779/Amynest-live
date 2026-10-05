# GOOGLE ADS REVENUE ATTRIBUTION

**Account:** 6395859996  
**Campaign:** 23986249354 “App promotion-Android (purchases · metros)”  
**Queried:** 24 September 2026  
**Not paused. Historical data not altered.**

| Field | Value |
|-------|-------|
| Status | **ENABLED** |
| Daily budget | 400 (account currency) |
| Bidding | **TARGET_CPA** |
| App goal | **OPTIMIZE_IN_APP_CONVERSIONS_TARGET_INSTALL_COST** |
| 90d cost | INR 18,946.27 |
| 90d conversions (UI total) | 2,354 |
| 90d conversion value | INR 103 |

## What the 2,354 conversions actually are

GAQL `segments.conversion_action_name` for 2026-06-26–2026-09-24:

| Conversion action | Conversions | Value (INR) |
|-------------------|------------:|------------:|
| `com.amynest.app (Android) installs 2026-06-15T23:45:06.981` | **2,251** | 0 |
| `amynest-836ff - com.amynest.app (Android) First open` | **103** | 103 |
| Purchase / subscription_convert / in_app_purchase | **0 in this split** | 0 |

2,251 + 103 = **2,354**. These are **installs and first opens**, not RevenueCat purchases.

Primary goals on the account also include Play **DOWNLOAD**, Firebase **purchase** (primary but not appearing in this campaign split), and **YouTube** follow-on views / channel subscriptions.

RC verified paid: **3**. Ads “purchase” actions are **not** proven mapped to those 3.

**OWNER ACTION REQUIRED:** keep ENABLED, pause, or change bidding off install-cost. Not decided here.
