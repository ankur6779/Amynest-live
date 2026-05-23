# AmyNest AI — Store Build Guide

## Prerequisites

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Link project: `eas init` (or `eas init --id YOUR_PROJECT_ID` if already created)
4. Set secrets in EAS: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_DOMAIN`

## Android — Google Services

The `google-services.json` placeholder is required for Firebase/push notifications.
`app.json` already references it via `android.googleServicesFile`.
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Add your Android app with package `com.amynest.ai`
3. Download `google-services.json` and replace the placeholder at `artifacts/amynest-mobile/google-services.json`

## iOS — GoogleService-Info.plist

`app.json` already references it via `ios.googleServicesFile`.
1. In Firebase Console, add your iOS app with bundle ID `com.amynest.ai`
2. Download `GoogleService-Info.plist` and replace the placeholder at `artifacts/amynest-mobile/GoogleService-Info.plist`

## Build Commands

```bash
# Navigate to the mobile artifact
cd artifacts/amynest-mobile

# Development build (runs on device via Expo Dev Client, not Expo Go)
eas build --profile development --platform all

# Preview build (for TestFlight / internal testing)
eas build --profile preview --platform all

# Production build (App Store + Google Play)
eas build --profile production --platform all
```

## Submit Commands

```bash
# Submit iOS to App Store Connect (requires apple credentials in eas.json)
eas submit --platform ios --profile production

# Submit Android to Google Play (requires google-play-service-account.json)
eas submit --platform android --profile production
```

## Before Submitting

- Update `app.json`:
  - `version` — increment for every release
  - `ios.buildNumber` — increment for every iOS build
  - `android.versionCode` — increment for every Android build
- Ensure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set to the **production** Clerk key
- Ensure `EXPO_PUBLIC_DOMAIN` points to the production API server
- Replace placeholder Apple and Google Play credentials in `eas.json`

## App Metadata

- **App Name**: AmyNest AI
- **Bundle ID (iOS)**: com.amynest.ai
- **Package (Android)**: com.amynest.ai
- **Category**: Education / Parenting
- **Minimum iOS**: 15.1
- **Minimum Android**: API 23 (Android 6.0)
