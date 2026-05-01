# KidSchedule Android — Push Notifications Setup

**App version:** 1.1.0 (versionCode 2)
**Package:** `com.amynest.app`
**Bridge:** native FCM via `window.AmyNestPushNative` (the WebView itself
has no Web Notification API).

---

## 1. Register the Android app in Firebase

1. Open the Firebase Console for the **same** project that powers the
   KidSchedule web app (the one whose VAPID key is already set as
   `VITE_FIREBASE_VAPID_KEY`).
2. Project settings → **Your apps** → **Add app** → Android.
3. Fill in:
   - **Android package name:** `com.amynest.app`
   - **App nickname:** `KidSchedule Android`
   - **SHA-1:** (optional for FCM; required only if you later want Google
     Sign-In or Dynamic Links). Get it via:
     ```bash
     keytool -list -v -keystore /path/to/release.jks -alias kidschedule
     ```
4. Click **Register app**.

## 2. Drop in `google-services.json`

1. Download the generated `google-services.json` from the Firebase Console.
2. Place it at:
   ```
   artifacts/kidschedule-android/app/google-services.json
   ```
3. **Do not commit it** — it is in `.gitignore` because it contains
   project-specific OAuth client IDs. Each developer / CI job should drop
   in its own copy.

That's it for the Firebase wiring. The `app/build.gradle.kts` only applies
the `google-services` plugin when the file is present, so missing it just
disables FCM (the build still succeeds — useful for local dev).

## 3. Verify FCM is enabled at build time

After dropping in `google-services.json`, run a build and check that
`BuildConfig.FCM_ENABLED = true`:

```bash
cd artifacts/kidschedule-android
./gradlew :app:assembleRelease
```

You should see the `:app:processReleaseGoogleServices` task run. If it
doesn't, double-check the file path and that the package name in
`google-services.json` matches `com.amynest.app` exactly.

## 4. Build & ship the APK / AAB

```bash
# Debug build for sideloading on test devices
./gradlew :app:assembleDebug

# Release AAB for Play Store
./gradlew :app:bundleRelease
```

The Play Store listing should call out:
> v1.1.0 — Routine reminders now arrive as push notifications even when the
> app is closed.

## 5. End-to-end smoke test

1. Install the new APK on an Android 13+ device.
2. Sign in.
3. The notification nudge banner should appear at the top of the
   dashboard (`/dashboard`).
4. Tap **Allow** → Android system permission dialog appears.
5. Tap **Allow** in the system dialog.
6. Within ~5 seconds the FCM token is POSTed to `/api/push/register` with
   `platform: "android"`. Verify in your server logs:
   ```bash
   rg "push/register.*android" /var/log/...
   ```
   or query the DB:
   ```sql
   SELECT user_id, platform, created_at FROM push_subscriptions
   WHERE platform = 'android' ORDER BY created_at DESC LIMIT 5;
   ```
7. Trigger a test notification (any AI nudge, routine reminder, or via the
   admin send-test endpoint).
8. The notification should appear in the system tray. Tapping it should
   open the app and navigate the WebView to the deep-link path embedded
   in the FCM payload's `data.deepLink` field (or the notification's
   `click_action`).

## 6. Known limitations

- **Pre-Android 13 devices** — `POST_NOTIFICATIONS` is granted by default;
  the bridge reports `"granted"` without prompting. The user may still
  disable notifications via system settings, which we cannot read.
- **No Google Play Services** — `FirebaseMessaging.getInstance().getToken()`
  fails silently. The bridge logs a warning and returns `null` from
  `getToken()`. Web Push is also unavailable in WebView, so these users
  simply do not receive push notifications.
- **Token rotation** — When FCM rotates the token, `onNewToken` in
  `KidScheduleFcmService` caches the new token in SharedPreferences and
  fires `amynest-push-token` on the WebView. `usePushRegistration`
  re-POSTs to `/api/push/register` automatically.

## 7. Files touched in this change

| File | Purpose |
|------|---------|
| `build.gradle.kts` (root) | google-services plugin classpath |
| `app/build.gradle.kts` | conditional plugin apply, Firebase BOM, versionCode bump, `BuildConfig.FCM_ENABLED` |
| `app/src/main/AndroidManifest.xml` | `POST_NOTIFICATIONS`, FCM service, default icon/color/channel meta-data |
| `app/src/main/res/drawable/ic_notification.xml` | white bell icon |
| `app/src/main/res/values/strings.xml` | notification channel strings |
| `app/src/main/java/.../KidScheduleApp.kt` | `createDefaultNotificationChannel()` |
| `app/src/main/java/.../KidScheduleFcmService.kt` | `onNewToken` + `onMessageReceived` |
| `app/src/main/java/.../PushBridge.kt` | `window.AmyNestPushNative` JS bridge |
| `app/src/main/java/.../MainActivity.kt` | install bridge, deep-link handling, permission callback |
