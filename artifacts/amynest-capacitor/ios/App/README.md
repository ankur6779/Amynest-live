# AmyNest iOS — Xcode

## Open the workspace (required)

CocoaPods dependencies (Facebook SDK, Capacitor, Firebase, RevenueCat) are **not** linked when you open the bare project file.

**Always open:**

```
App.xcworkspace
```

**Never open for builds:**

```
App.xcodeproj
```

Opening `App.xcodeproj` causes errors like:

- `No such module 'FBSDKCoreKit'`
- `No such module 'Capacitor'`
- `No such module 'FirebaseCore'`

## Commands

From `artifacts/amynest-capacitor/`:

```bash
npm run sync:ios    # cap sync + pod install patches
npm run open:ios    # opens App.xcworkspace in Xcode
```

Or manually:

```bash
cd ios/App && pod install && open App.xcworkspace
```

After switching branches or updating `Podfile`, run `pod install` again before building.
