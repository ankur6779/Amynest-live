# AmyNest Android — R8 / ProGuard
# Keep only WebView JS bridge entry points. Full-package keep defeats R8
# and triggers Play Console "Improve … with R8 optimisation".

-keepattributes JavascriptInterface
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# WebView @JavascriptInterface methods (must survive minify)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Bridge classes referenced from MainActivity / install sites
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
-keep class com.amynest.app.NotificationSounds { *; }
-keep class com.amynest.app.NotificationChannels { *; }
-keep class com.amynest.app.FirebaseSubscriptionAnalytics { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# WebKit message listener
-keep class androidx.webkit.** { *; }

# Google Sign-In
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# Facebook Login
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**

# RevenueCat
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.purchases.**
