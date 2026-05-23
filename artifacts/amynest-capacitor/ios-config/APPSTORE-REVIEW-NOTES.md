# AmyNest iOS App Review Notes

Use this text in App Store Connect Review Notes for the Capacitor iOS build.

## Reviewer Access

AmyNest supports email/password, Google Sign-In, and Sign in with Apple. If a reviewer account is needed, provide a temporary test account with a seeded child profile before submission.

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

## Permissions Explanation

- Notifications: routine reminders, bedtime alerts, parenting tips, and notification test delivery.
- Microphone: Speech Coach pronunciation practice and read-aloud exercises.
- Location: local weather-aware routines and regional recommendations.
- Photo Library / Camera: optional child profile or milestone photos selected by the user.

The app remains usable if a user denies any optional permission. Denied permissions show a Settings recovery path.

## Billing

The iOS app uses Apple In-App Purchase through RevenueCat for all subscriptions. Razorpay is not shown inside Capacitor iOS. Restore Purchases is visible on the paywall.

Normal web/PWA users in India may use Razorpay. Android native wrappers use the Google Play Billing bridge when available.

## Over-The-Air (OTA) Web Updates

The iOS build may download **small web-only patches** (JavaScript/CSS bug fixes) from our HTTPS API using the Capacitor Updater plugin. This does **not** install native code. **Major features, billing changes, and permission changes** still require a new App Store version. OTA updates are limited to **patch-level** semver bumps (e.g. 1.0.4 → 1.0.5).

## Privacy And Safety

The app is a parenting assistant for routines, learning, behavior logs, and child development guidance. It does not track users across third-party apps or websites for advertising. The Privacy Manifest is included at `ios/App/App/PrivacyInfo.xcprivacy` with `NSPrivacyTracking` set to `false`.

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

1. **App Store Connect → App Privacy** — “Do you or your third-party partners use data for tracking?” → **No**. For every data type, **Used for Tracking** must be **unchecked** (purposes: App Functionality and/or Analytics only).
2. **App Store Connect → App Information → Age Rating** — **Parental Controls: None**, **Age Assurance: None**.
3. **Xcode → Info.plist** — `UIBackgroundModes` must contain only `remote-notification` and `fetch` (no `audio`). Repo template: `ios-config/Info-permissions.plist`.
4. **Increment build number** (e.g. 3.0.4 build **13**), archive, upload, attach to the version, submit with the notes above.
