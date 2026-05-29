# AmyNest iOS App Review Notes

Use this text in App Store Connect Review Notes for the Capacitor iOS build.

---

## Resubmission steps (May 29, 2026 rejection — v3.0.10 build 20)

Do these **in order**. Items 1–2 are in **App Store Connect** (no code). Item 3 is **Xcode** (new binary). Item 4 is **submit + reply**.

### Step 1 — App Store Connect → Support URL (Guideline 1.5)

**Where:** **App Information → Support URL**

Change Support URL from `https://amynest.in/` to:

```
https://amynest.in/support
```

This page includes support@amynest.in, response-time expectations, subscription help, and links to billing dispute / account deletion.

### Step 2 — App Store Connect → App Review Information (Guideline 1.1.6)

**Where:** **App Review Information → Notes**

Paste this in your reply / review notes:

```
Guideline 1.1.6 — We removed Apple Pay-style labeling from In-App Purchase flows. iOS subscriptions now use "Subscribe in App Store" copy and standard AmyNest styling (not Apple Pay branding). AmyNest does not use Apple Pay; all digital subscriptions are In-App Purchases via the App Store.

Guideline 1.5 — Support URL updated to https://amynest.in/support with contact email support@amynest.in and self-service help links.
```

### Step 3 — Xcode → new build

1. Pull latest repo (includes IAP label fixes + /support page).
2. Build and upload a new iOS binary (increment build number).
3. Submit for review.

---

## Resubmission steps (May 25, 2026 rejection — v3.0.6 build 14)

Do these **in order**. Items 1–2 are in **App Store Connect** (no code). Item 3 is **Xcode** (new binary). Item 4 is **submit + reply**.

### Step 1 — App Store Connect → App Description / EULA (Guideline 3.1.2(c))

**Where:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **AmyNest** → **App Information** or the version’s **Description**

Add a **functional Terms of Use (EULA) link** to the App Description (required when using Apple’s standard EULA):

```
Terms of Use (EULA): https://amynest.in/terms
Privacy Policy: https://amynest.in/privacy
```

Also confirm **App Information → Privacy Policy URL** = `https://amynest.in/privacy`.

Optional: upload a custom EULA under **App Information → EULA** instead of linking in the description.

### Step 2 — App Store Connect → App Review Information (Guideline 5.1.1(v))

**Where:** **App Review Information → Notes**

Paste the updated **Review Notes** block below. Attach a **screen recording** (physical device) showing:

1. Sign in (demo account below)
2. Menu → **My Profile** → scroll to **Delete Account**
3. Complete the two-step confirmation through success

### Step 3 — Xcode → new build (Guideline 5.1.1(iv) + in-app fixes)

**Where:** Mac → `artifacts/amynest-capacitor/` → Xcode

1. Pull latest repo (includes location button fix, account deletion, iOS paywall legal links).
2. Rebuild web + sync:
   ```bash
   cd artifacts/amynest-capacitor
   pnpm run build:web
   pnpm run sync:ios
   ```
3. Bump **build number** (e.g. 15), **Product → Archive**, upload to App Store Connect.

**Code changes in this submission:**

- Onboarding location pre-prompt button text changed from “Allow Location” to **“Continue”** (Apple 5.1.1(iv)).
- **Delete Account** added to **Parent Profile** (`/parent-profile`) with two-step confirmation; calls `DELETE /api/account`.
- iOS uses the **custom paywall / Pricing** screen (plan title, duration, price, Privacy Policy + Terms of Use links) instead of RevenueCat’s fullscreen UI.

### Step 4 — App Store Connect → submit + reply

**Where:** Resolution Center — reply to rejection **f2e8ff55-18d8-44c0-8525-55b3650608f6** using the **Reply to App Review** block below.

---

## Resubmission steps (May 23, 2026 rejection — v3.0.4 build 12)

Do these **in order**. Items 1–2 are in **App Store Connect** (no code). Item 3 is **Xcode** (new binary). Item 4 is **submit + reply**.

### Step 1 — App Store Connect → App Privacy (Guideline 5.1.2)

**Where:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **AmyNest** → left sidebar **App Privacy**

1. Open **App Privacy** → **Edit** (Account Holder or Admin required).
2. Question: *“Do you or your third-party partners use data for tracking?”* → **No**.
3. For **every** collected data type (Name, Email, User ID, etc.):
   - **Used for Tracking** = **unchecked**
   - Purposes = **App Functionality** and/or **Analytics** only (as applicable)
4. **Save** and **Publish** the privacy label.

AmyNest does **not** cross-app advertise or share data with data brokers. Do **not** add App Tracking Transparency (ATT) — that is only for apps that actually track. Our `PrivacyInfo.xcprivacy` already has `NSPrivacyTracking = false`.

### Step 2 — App Store Connect → Age Rating (Guideline 2.3.6)

**Where:** **App Information** → **Age Rating** → **Edit**

1. **Parental Controls** → **None**
2. **Age Assurance** → **None**
3. Save. Result should remain **4+**.

The “Kids Control Center” screen is a coming-soon preview (interest survey), not Apple’s “In-App Controls.” Premium gating is a subscription paywall, not parental controls.

### Step 3 — Xcode → new build (Guideline 2.5.4)

**Where:** Mac → `artifacts/amynest-capacitor/` → Xcode

1. Pull latest repo (build **13** is set in `project.pbxproj`; version stays **3.0.4**).
2. Open `ios/App/App.xcworkspace` in Xcode.
3. **App target → Signing & Capabilities → Background Modes**
   - ✅ Remote notifications
   - ✅ Background fetch
   - ❌ **Audio** must be **unchecked**
4. **App target → Info** (or open `Info.plist`) → **UIBackgroundModes** must be only:
   - `remote-notification`
   - `fetch`
   - (no `audio` — already fixed in repo)
5. Rebuild web + sync:
   ```bash
   cd artifacts/amynest-capacitor
   pnpm run build:web
   pnpm run sync:ios
   ```
6. **Product → Clean Build Folder**, then **Product → Archive**.
7. **Distribute App → App Store Connect → Upload** (build **13**).

### Step 4 — App Store Connect → submit + reply

**Where:** **App Store Connect** → your **3.0.4** version

1. **App Review Information → Notes** — paste the **Review Notes** block below (includes OTA disclosure).
2. Attach the new build (**13**).
3. **Resolution Center** — reply to rejection **f2e8ff55-18d8-44c0-8525-55b3650608f6** using the **Reply to App Review** block below.
4. **Submit for Review**.

---

## Reviewer Access

AmyNest supports email/password, **Sign in with Apple** (shown first), Google Sign-In, and Facebook Login on iOS. Phone OTP is not offered on iOS. Auth screens include links to our Terms of Service and Privacy Policy. If a reviewer account is needed, provide a temporary test account with a seeded child profile before submission.

Suggested test account (paste into App Store Connect → App Review Information):

- **Username:** `apple.review@amynest.in`
- **Password:** `AmyNestReview2025!`
- Email verification is skipped for this inbox — sign in goes straight to the app.
- Region: India

## What To Test

1. Sign in and open Dashboard.
2. Tap the permission prompt and allow Notifications, Microphone, and Location.
3. Open Speech Coach to verify the microphone prompt and read-aloud flow.
4. Open Notifications settings and send a test notification.
5. Open any premium feature or Pricing, select a plan, and verify Apple In-App Purchase opens through RevenueCat.
6. Tap Restore Purchases from the paywall.
7. Open **My Profile** → scroll to **Delete Account** to verify account deletion is available.

## Permissions Explanation

- Notifications: routine reminders, bedtime alerts, parenting tips, and notification test delivery.
- Microphone: Speech Coach pronunciation practice and read-aloud exercises.
- Location: local weather-aware routines and regional recommendations.
- Photo Library / Camera: optional child profile or milestone photos selected by the user.

The app remains usable if a user denies any optional permission. Denied permissions show a Settings recovery path.

## Billing

The iOS app uses Apple In-App Purchase through RevenueCat for all subscriptions. Razorpay is not shown inside Capacitor iOS. Restore Purchases is visible on the paywall.

Normal web/PWA users in India may use Razorpay. Android native wrappers use the Google Play Billing bridge when available.

## Over-The-Air (OTA) Web Updates — Apple Guideline 2.5.2

The iOS build may download **small web-only patches** (JavaScript/CSS bug fixes) from our HTTPS API using the Capacitor Updater plugin (`@capgo/capacitor-updater`). This:

- Updates **only** the bundled WKWebView assets (HTML/JS/CSS)
- Does **not** install native code, new SDKs, or change Info.plist permissions
- Is limited to **patch-level** semver bumps (e.g. `1.0.4` → `1.0.5`)
- **Minor/major** version changes and new native capabilities still require a new App Store binary

Check endpoint: `POST https://amynest-backend-dykj.onrender.com/api/app/ota/check`

**Paste into App Review Information → Notes:**

```
OTA: This app may apply small web-only bug-fix bundles at launch via HTTPS (Capacitor Updater). No native code is downloaded. Major features, billing, and permission changes require App Store updates. Patch-only (e.g. 1.0.x) updates only.
```

See also `artifacts/amynest-capacitor/SETUP.md` (OTA section) and `artifacts/api-server/ota/README.md`.

## Privacy And Safety

The app is a parenting assistant for routines, learning, behavior logs, and child development guidance. It does not track users across third-party apps or websites for advertising. The Privacy Manifest is included at `ios/App/App/PrivacyInfo.xcprivacy` with `NSPrivacyTracking` set to `false`.

---

## Responding to rejection (May 25, 2026 — v3.0.6 build 14)

Paste the block below into **App Store Connect → Resolution Center** when you resubmit. Apply App Store Connect metadata fixes in Step 1 above.

### Reply to App Review (copy/paste)

```
Thank you for the detailed feedback. We have addressed all three items:

1) Guideline 5.1.1(iv) — Location permission pre-prompt
The onboarding location screen now uses a neutral “Continue” button instead of “Allow Location.” The explanatory text remains on the pre-prompt; the system location dialog appears only after the user taps Continue.

2) Guideline 3.1.2(c) — Subscription disclosures
We updated App Store metadata to include functional links to our Terms of Use (EULA) at https://amynest.in/terms and Privacy Policy at https://amynest.in/privacy. In the app, the Pricing page and premium paywall show subscription title, duration, price, and the same Privacy Policy and Terms of Use (EULA) links before purchase. iOS purchases use Apple In-App Purchase via RevenueCat/StoreKit.

3) Guideline 5.1.1(v) — Account deletion
Account deletion is available in-app: Menu → My Profile → Delete Account (two-step confirmation). This permanently deletes the account and associated data via our API. A screen recording of the full flow is attached in App Review Information → Notes.

Test account (unchanged):
- apple.review@amynest.in / AmyNestReview2025!
Sign in with email/password or Sign in with Apple. Email verification is skipped for this inbox.
```

---

## Responding to rejection (May 23, 2026 — v3.0.4 build 12)

Paste the block below into **App Store Connect → Resolution Center** when you resubmit. Also apply the App Store Connect metadata fixes in the checklist (tracking labels, age rating).

### Reply to App Review (copy/paste)

```
Thank you for the detailed feedback. We have corrected all three items:

1) Guideline 5.1.2(i) — Tracking / ATT
AmyNest does NOT track users across apps or websites owned by other companies for advertising or data-broker purposes. We updated App Privacy in App Store Connect so no collected data type is marked “Used for Tracking,” and “Do you or your third-party partners use data for tracking?” is set to No. Our Privacy Manifest (PrivacyInfo.xcprivacy) declares NSPrivacyTracking = false. We do not use the AppTrackingTransparency framework because we do not perform tracking as Apple defines it. First-party referral codes and subscription analytics (RevenueCat, Firebase Cloud Messaging only — no Firebase Analytics) are used solely for app functionality, not cross-app advertising.

2) Guideline 2.5.4 — Background audio
We removed the unused “audio” UIBackgroundModes entry. The lullaby/sound features play only while the app is in the foreground. UIBackgroundModes now contains only remote-notification and fetch (push + background fetch). This change is in the new binary attached to this submission.

3) Guideline 2.3.6 — Age Rating / In-App Controls
We updated Age Rating selections so Parental Controls and Age Assurance are both “None.” The “Kids Control Center” screen is a coming-soon product preview (interest survey only) — it does not implement parental controls, age assurance, or device-level restrictions. Premium content gating is a subscription paywall, not an Apple Age Rating “Parental Controls” mechanism.

Test account (unchanged):
- apple.review@amynest.in / AmyNestReview2025!
Sign in with email/password or Sign in with Apple. Email verification is skipped for this inbox.
```

### Before you archive the next build

1. **App Store Connect → App Privacy** — tracking question **No**; every data type **Used for Tracking** unchecked.
2. **App Store Connect → Age Rating** — **Parental Controls: None**, **Age Assurance: None**.
3. **Xcode → Background Modes** — Audio **off**; **Info.plist** `UIBackgroundModes` = `remote-notification` + `fetch` only.
4. **Build number** — use **13** (or higher); archive, upload, attach, submit with notes above.
