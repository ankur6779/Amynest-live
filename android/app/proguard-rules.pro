# AmyNest Android — R8 / ProGuard
# Keep only WebView JS bridge entry points. Full-package keep defeats R8
# and triggers Play Console "Improve … with R8 optimisation".
# Libraries ship their own consumer rules (Firebase, RevenueCat, Facebook, GMS).

-keepattributes JavascriptInterface
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# WebView @JavascriptInterface methods (must survive minify)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Bridge classes referenced from MainActivity / install sites.
# AGP 9 strict full-mode does not keep default constructors from `-keep class X`.
-keep class com.amynest.app.PushBridge { *; }
-keep class com.amynest.app.PushBridge$* { *; }
-keep class com.amynest.app.AuthBridge { *; }
-keep class com.amynest.app.AuthBridge$* { *; }
-keep class com.amynest.app.BillingBridge { *; }
-keep class com.amynest.app.BillingBridge$* { *; }
-keep class com.amynest.app.LocalNotifBridge { *; }
-keep class com.amynest.app.LocalNotifBridge$* { *; }
-keep class com.amynest.app.ReviewBridge { *; }
-keep class com.amynest.app.ReviewBridge$* { *; }
-keep class com.amynest.app.MainActivity { *; }
-keep class com.amynest.app.MainActivity$* { *; }
-keep class com.amynest.app.AmyNestApp { *; }
-keep class com.amynest.app.KidScheduleFcmService { *; }
-keep class com.amynest.app.PreSignupNotifReceiver { *; }
-keep class com.amynest.app.PreSignupDismissReceiver { *; }
-keep class com.amynest.app.PreSignupBootReceiver { *; }
-keep class com.amynest.app.NotificationSounds { *; }
-keep class com.amynest.app.NotificationChannels { *; }
-keep class com.amynest.app.FirebaseSubscriptionAnalytics { *; }
