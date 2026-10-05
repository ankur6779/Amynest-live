# PLAY TRANSFER ELIGIBILITY (SB-H02)

**Date / time (UTC):** 2026-10-02T16:59:11Z  
**SB-H02:** **OPEN**  
**Transfer initiated:** **NO**  
No passwords, payment credentials, API keys, or private signing material are recorded.

Inspection used the owner’s authenticated Google Chrome Play Console session (profile Ankur). Cursor’s built-in browser was **not** signed in to Play Console (Google sign-in wall). No AAB was uploaded. App transfers form was **not** submitted. Account ownership was **not** changed. Buyer was **not** invited.

## Distinction (do not collapse)

| ID | Control | This pass |
|----|---------|-----------|
| **A** | AmyWorld seller / transaction identity (Path A sole prop of Ankur Raman) | **OWNER-CONFIRMED** in sale docs — not proved by Play alone |
| **B** | Google Play **developer account** ownership | **VERIFIED in Console:** display name **AmyWorld**, type **Organisation account**, Account ID **8521950598112974454** |
| **C** | AmyNest **app** ownership inside that Console | **VERIFIED:** `AmyNest AI: Smart Parenting` / `com.amynest.app` / Console app ID **4972454135983854770** listed on that account, Production |
| **D** | Google Play **App Signing** (Google-held app-signing key) | **VERIFIED enrolled:** App signing page shows **App signing key — In use — 100.0% install base**. This is **not** the upload keystore escrowed in SB-H01 |
| **E** | **Transfer eligibility** | **NOT EXPLICITLY SHOWN.** Settings lists an **App transfers** process. No Console page returned a yes/no “eligible” status. Buyer/target Play account is absent |
| **F** | **Completed transfer** | **NO** — not started |

Evidence of B/C/D does **not** prove E or F. SB-H01 upload-key escrow does **not** prove D’s Google-held key control beyond Console enrollment, and does **not** prove E.

## Verified Console facts (text copied from on-screen pages; no screenshots of Console — OS window capture blocked)

| Fact | Value | Source page (title / URL path) |
|------|-------|--------------------------------|
| Console session | Authenticated; Chrome window “Google Chrome – Ankur” | App list / Home |
| Developer display name | AmyWorld | Home |
| Account type | Organisation account | Home |
| Developer Account ID | `8521950598112974454` | Home; all Console URLs |
| Apps on account | **1** | Home |
| App name | AmyNest AI: Smart Parenting | Home; Dashboard; Production; App signing |
| Package name | `com.amynest.app` | Home; App signing Digital Asset Links snippet |
| Console app ID | `4972454135983854770` | `/app/4972454135983854770/app-dashboard` |
| Release status | **Production**; latest **106 (1.4.63)**; 178 countries/regions; ~746–749 installs shown | Production track; Home row dated 25 Sept 2026 |
| Play App Signing | **App signing key In use, 100.0% install base** | `.../app/4972454135983854770/keymanagement` title **App signing** |
| Upload-key cert SHA-1 (public) | `91:50:85:54:F5:AB:1D:47:32:3F:3A:CD:37:04:73:0C:D3:E6:9A:F6` | App signing → Upload key certificate — **matches SB-H01 escrowed PKCS12 cert** |
| Upload-key cert SHA-256 (public) | `FE:49:49:EA:C0:2C:B4:79:EB:EF:39:4C:F7:B7:14:79:9A:57:53:65:34:E0:53:35:D6:31:62:8C:17:D2:77:45` | Same — **matches SB-H01** |
| App-signing-key SHA-256 used in Digital Asset Links JSON (public; Play Store installs) | `96:02:45:1D:30:6E:81:B1:90:8D:AC:45:11:65:DF:92:C8:32:AF:08:02:6B:31:5C:B4:B7:28:5C:96:DC:AE:E5` | App signing Digital Asset Links snippet — **different from upload key** |
| Console users (names/emails as shown; not secrets) | Ankur raman (`ankur6779@gmail.com`) Active; `revenuecat-service@amynest-836ff.iam.gserviceaccount.com` Active | Users and permissions (2 users) |
| Settings → App transfers | Feature listed: “Transfer your apps to another developer account” | Settings (`.../settings`) |
| Policy / standing | No warning text on Home copy | Policy status page **not opened** |
| Registration transaction ID (original account) | **NOT captured** (Payments profile not opened — payment credentials out of scope) | — |
| Target (buyer) Play developer account | **NOT PRESENT** | No buyer enrolled in this deal |

## Public listing (not Console; does not prove eligibility)

Public store listing: [AmyNest AI: Smart Parenting](https://play.google.com/store/apps/details?id=com.amynest.app)  
Developer name on listing: **AmyWorld**. Shows **In-app purchases**, **Install** (published).  
Screenshot: `play-listing-com.amynest.app.png` (this folder).

Listing seller string ≠ Console legal enrollment ≠ transfer eligibility.

## Transfer eligibility — why SB-H02 stays OPEN

Play Console **did not** display an explicit eligibility status such as “Eligible to transfer” / “Not eligible” for `com.amynest.app`.

Google’s documented app-transfer process ([Play Console Help — Transfer apps](https://support.google.com/googleplay/android-developer/answer/6230247)) requires **both** a registered original account **and** a registered **target** developer account, plus **both** registration transaction IDs, before a transfer request can be submitted. Apps with in-app products additionally require an **active payments profile on the target account**.

This deal has **no buyer Play developer account**. Therefore eligibility **cannot** be confirmed, even though the original account is signed-in and the app is in Production.

The in-Console **App transfers** settings item was **seen as a menu row only**. Direct URLs (`/app-transfers`, `/settings/app-transfers`, `/app/…/transfer`) redirected to Home. The form was **not** opened and **not** submitted (to avoid starting a transfer).

## Google prerequisites (from Help + this Console pass)

| Prerequisite | Status this pass |
|--------------|------------------|
| Original account registered and owner can sign in | **MET** (this session) |
| App exists on original account; Production listing | **MET** (`com.amynest.app`, release 106 / 1.4.63) |
| Original + target accounts policy-compliant / active | Original: **INFERRED** (signed in, Production; Policy status page not opened). Target: **NOT MET** |
| Target Play developer account registered (Account ID + registration transaction ID) | **NOT MET** — no buyer account |
| Original registration transaction ID | **NOT CAPTURED** (would be needed at request time; do not copy payment details into Git) |
| Target payments profile (required because listing shows in-app purchases) | **NOT MET** — no target account |
| Play App Signing enrolled | **MET** (Google-held key in use 100%) — key **transfers with the app** per Help; distinct from upload key |
| No transfer request in flight | **INFERRED** (no transfer UI/state observed; not proven) |
| Explicit Console eligibility badge | **NOT EXPOSED** |

## Exact owner action required (do not transfer yet)

1. Keep SB-H02 **OPEN** until a **buyer Play developer account** exists (Account ID + registration transaction ID) **or** counsel documents a different Google-accepted path.
2. When the buyer account exists: open **Settings → App transfers** (do **not** submit). Screenshot whether `com.amynest.app` can be added and any unmet checklist items Google shows.
3. Optional for standing: screenshot **Policy status** (no change).
4. Do **not** click Transfer / invite buyer / change legal entity / change payments profile / rotate keys / upload AAB.

## What was not done

- Transfer **not** started  
- Buyer **not** invited  
- Payments profile **not** opened  
- Upload key **not** reset (`Request upload key reset` was visible and **not** clicked)  
- Production / signing configuration **not** changed  

SB-H01 remains **CLOSED** (upload keystore escrow). This pass does not reopen it.
