# AmyNest iOS — App Store Review Checklist

Complete ALL items before submitting. Missing items = **rejection**.

---

## 🔴 CRITICAL — Will cause instant rejection

### 1. PrivacyInfo.xcprivacy (Privacy Manifest) — Required since May 2024
- [ ] File placed at `ios/App/App/PrivacyInfo.xcprivacy`
- [ ] Added to the Xcode **App** target (check "Target Membership" in File Inspector)
- [ ] Template: `ios-config/PrivacyInfo.xcprivacy` in this repo ✅

### 2. Privacy Policy URL
- [ ] You have a publicly accessible Privacy Policy URL
  (e.g. `https://amynest.in/privacy`)
- [ ] Entered in App Store Connect → App Information → Privacy Policy URL
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
- [ ] `ITSAppUsesNonExemptEncryption = NO` added to Info.plist
  (template: `ios-config/ExportCompliance.plist`) ✅
- [ ] In App Store Connect: "Does your app use encryption?" → **No** (or "Exempt")

---

## 🟡 IMPORTANT — May cause rejection or delay

### 6. Permission Strings (all must be accurate)
- [ ] Microphone — `NSMicrophoneUsageDescription`
- [ ] Camera — `NSCameraUsageDescription`
- [ ] Photo Library — `NSPhotoLibraryUsageDescription`
- [ ] Face ID — `NSFaceIDUsageDescription`
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
  - **Result: 4+** (suitable for all ages)

### 9. Sign-In with Apple (if using Google Sign-In)
- [ ] **IMPORTANT**: If the app offers any third-party login (Google), Apple
  requires you to ALSO offer "Sign in with Apple" as an option.
  - Add Sign in with Apple capability in Xcode → Signing & Capabilities
  - Add the Apple sign-in button in your auth flow
  - OR: Remove Google Sign-In entirely and use email/password only

### 10. In-App Purchases
- [ ] If using RevenueCat / Razorpay for iOS payments, all in-app purchases
  must be configured in App Store Connect before review
- [ ] Subscription plans must have clear descriptions and duration
- [ ] Restore Purchases button must be visible

---

## 🟢 GOOD PRACTICE — Avoids common rejections

### 11. Network Permissions
- [ ] App works gracefully when offline (shows offline screen)
- [ ] No crashes on poor network conditions

### 12. Background Modes
- [ ] Only declare background modes that the app ACTUALLY uses
  (audio → lullaby player; remote-notification → FCM push)

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
