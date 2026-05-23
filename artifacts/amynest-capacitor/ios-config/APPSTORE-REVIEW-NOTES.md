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

The app is a parenting assistant for routines, learning, behavior logs, and child development guidance. It does not track users across third-party apps or websites for advertising. The Privacy Manifest is included at `ios/App/App/PrivacyInfo.xcprivacy`.
