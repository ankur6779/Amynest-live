-keep class com.amynest.app.** { *; }
-keepclassmembers class com.amynest.app.** { *; }

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
