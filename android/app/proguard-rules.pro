-keep class com.amynest.app.** { *; }
-keepclassmembers class com.amynest.app.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# WebKit message listener
-keep class androidx.webkit.** { *; }
