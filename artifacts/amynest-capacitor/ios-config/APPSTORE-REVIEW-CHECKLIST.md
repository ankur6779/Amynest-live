# AmyNest iOS — App Store Review Checklist

Complete ALL items before submitting. Missing items = **rejection**.

---

## 🔴 CRITICAL — Will cause instant rejection

### 1. PrivacyInfo.xcprivacy (Privacy Manifest) — Required since May 2024
- [x] File placed at `ios/App/App/PrivacyInfo.xcprivacy`
- [ ] Added to the Xcode **App** target (check "Target Membership" in File Inspector)
- [ ] Template: `ios-config/PrivacyInfo.xcprivacy` in this repo ✅

### 2. Privacy Policy URL
- [x] Public URLs: `https://amynest.in/privacy`, `https://amynest.in/terms`
- [x] In-app links on sign-in, sign-up, and pricing (`/privacy`, `/terms`)
- [ ] Entered in App Store Connect → App Information → Privacy Policy URL
- [ ] App Description includes functional Terms (EULA) link (see `APPSTORE-REVIEW-NOTES.md`)
- [ ] The policy mentions: data collected, children's data handling, deletion rights

### 3. App Icons — all sizes
- [ ] All required PNG sizes generated (see `AppIcons-guide.md`)
- [ ] 1024×1024 App Store icon — NO transparency, NO alpha channel
- [ ] Icons added to `Assets.xcassets/AppIcon.appiconset/Contents.json`

### 4. Launch Screen
- [ ] A LaunchScreen.storyboard exists (Capacitor generates one — verify in Xcode)
- [ ] Background color matches app dark theme (`#0a061a`)
- [ ] No text that needs translation in the launch screen

### 5. Export Compliance
- [x] `ITSAppUsesNonExemptEncryption = NO` added to Info.plist
  (template: `ios-config/ExportCompliance.plist`) ✅
- [ ] In App Store Connect: "Does your app use encryption?" → **No** (or "Exempt")

---

## 🟡 IMPORTANT — May cause rejection or delay

### 6. Permission Strings (all must be accurate)
- [x] Microphone — `NSMicrophoneUsageDescription`
- [x] Camera — `NSCameraUsageDescription`
- [x] Photo Library — `NSPhotoLibraryUsageDescription`
- [x] Face ID — `NSFaceIDUsageDescription`
- [ ] All strings are in the **same language as the app's primary language**
- [ ] Template: `ios-config/Info-permissions.plist` ✅

### 7. App Store Connect Metadata
- [ ] App Name: "AmyNest - AI Parenting Coach"
- [ ] Subtitle (30 chars max): "Smart routines for your child"
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max): "parenting,routine,child,schedule,ai,baby,toddler"
- [ ] Support URL: `https://amynest.in/support`
- [ ] Marketing URL: `https://amynest.in`
- [ ] Screenshots: iPhone 6.7" and iPad 12.9" (minimum required)

### 8. Age Rating
- [ ] In App Store Connect → set Age Rating questionnaire
- [ ] Recommended answers for AmyNest:
  - Cartoon or fantasy violence: **None**
  - Realistic violence: **None**
  - Sexual content: **None**
  - Profanity: **None**
  - Alcohol/tobacco/drugs: **None**
  - Simulated gambling: **None**
  - Horror/fear themes: **None**
  - Mature/suggestive themes: **None**
  - **Parental Controls: None** (Kids Control Center is a coming-soon preview, not active controls)
  - **Age Assurance: None** (no age-verification gate in the app)
  - **Result: 4+** (suitable for all ages)

### 9. Sign-In with Apple (required — Google + Facebook are enabled)
- [x] Sign in with Apple capability in `App.entitlements` (`com.apple.developer.applesignin`)
- [x] Apple button shown **first** on sign-in and sign-up (Guideline 4.8)
- [x] Capacitor `SignInWithApple` plugin + `apple-auth.ts` native flow
- [ ] Xcode → App target → **Signing & Capabilities** → confirm **Sign in with Apple** toggle is on
- [ ] Apple Developer → App ID `com.amynest.app` → Sign In with Apple enabled
- [ ] Firebase Console → Authentication → Apple provider configured
- [ ] Test on a **real iPhone** (Simulator often fails Apple Sign-In)

### 10. In-App Purchases
- [x] iOS app uses RevenueCat + Apple In-App Purchase only; Razorpay is blocked inside iOS
- [ ] Products/subscriptions must be configured in App Store Connect and RevenueCat before review
- [x] Subscription plans have clear descriptions and duration in the paywall
- [x] Restore Purchases button is visible

---

## 🟢 GOOD PRACTICE — Avoids common rejections

### 11. Network Permissions
- [ ] App works gracefully when offline (shows offline screen)
- [ ] No crashes on poor network conditions

### 12. Background Modes
- [ ] Only declare background modes that the app ACTUALLY uses
- [ ] **Do NOT** include `audio` — lullabies/infant sounds play in the foreground only
- [ ] Required: `remote-notification` (FCM push), `fetch` (background fetch)
- [ ] Rejection 2.5.4 (May 2026): build 12 had `audio` without background playback; removed in repo

### 12b. App Privacy — Tracking (Guideline 5.1.2)
- [ ] App Store Connect → App Privacy → “Do you or your third-party partners use data for tracking?” → **No**
- [ ] For **every** collected data type, **Used for Tracking** = **unchecked**
- [ ] `PrivacyInfo.xcprivacy` has `NSPrivacyTracking` = **false** (matches Connect labels)
- [ ] Do **not** add App Tracking Transparency unless you truly cross-app track for ads
- [ ] iOS uses Firebase/Messaging only (not Firebase Analytics); RevenueCat is for IAP only

### 13. WebView Content
- [ ] The WebView loads HTTPS only (no mixed content)
- [ ] `WKAppBoundDomains` in Info.plist lists all domains the WebView navigates to
- [ ] External links (e.g. WhatsApp share) open in `SFSafariViewController`,
  not navigating away from the WKWebView

### 14. Data Deletion
- [ ] Your Privacy Policy explains how users can request account/data deletion
- [ ] App or website has a way to delete account (Apple requires this since 2022)
  — Add a "Delete Account" option in your app's settings

### 15. Screenshots
- [ ] 3–10 screenshots per device size
- [ ] iPhone 6.7" (1290×2796 px) — required
- [ ] iPhone 6.5" (1242×2688 px) — required
- [ ] iPad 12.9" (2048×2732 px) — required if iPad supported
- [ ] Screenshots show actual app UI (no mockups that mislead reviewers)
- [ ] No Apple device images in screenshots (not allowed)

---

## 📋 App Store Connect Setup — Step by Step

1. Login to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → **+** → New App
   - Platform: iOS
   - Name: AmyNest - AI Parenting Coach
   - Primary Language: English (or Hindi if targeting India first)
   - Bundle ID: `com.amynest.app` ← must match your Xcode project
   - SKU: `amynest-ios-001`
3. App Information → fill Privacy Policy URL
4. Pricing → Free (or set subscription pricing)
5. App Privacy → fill the Data Collection questionnaire
   (matches what's in PrivacyInfo.xcprivacy)
6. Build → upload via Xcode Organizer
7. Submit for Review

---

## 🇮🇳 India-Specific Notes

- **Primary market is India** → set Primary Territory as India in pricing
- **Hindi content**: Apple supports Hindi (`hi`) locale — add Hindi App Store description
- **Razorpay payments**: Apple does NOT allow Razorpay for in-app purchases on iOS.
  You MUST use Apple's In-App Purchase (via RevenueCat) for any subscription/payment
  that happens inside the iOS app. Razorpay can only be used for web payments.
- **RevenueCat + IAP**: Already configured in the project. Make sure products
  are created in App Store Connect and RevenueCat dashboard before review.
