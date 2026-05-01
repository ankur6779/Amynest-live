import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

// Apply google-services plugin only if google-services.json is present.
// This keeps `./gradlew assembleDebug` working in CI / fresh checkouts
// before the Firebase config has been added. When the file is missing,
// FCM is silently disabled (PushBridge.getToken() returns null), and the
// rest of the app works normally.
val googleServicesJson = file("google-services.json")
val firebaseEnabled = googleServicesJson.exists()
if (firebaseEnabled) {
    apply(plugin = "com.google.gms.google-services")
} else {
    logger.warn(
        "[KidSchedule] google-services.json missing — building WITHOUT FCM. " +
            "Push notifications will be disabled in this APK. See PUSH_SETUP.md."
    )
}

android {
    namespace = "com.amynest.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.amynest.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "1.1.0"

        // Surface the Firebase / FCM availability to runtime code. PushBridge
        // checks this before attempting to fetch an FCM token, and the WebView
        // uses it to expose / hide window.AmyNestPushNative.fcmEnabled.
        buildConfigField("boolean", "FCM_ENABLED", "$firebaseEnabled")

        // Override at build time: -PwrapperUrl=https://your-deployed-site.example
        val wrapperUrl: String = (project.findProperty("wrapperUrl") as String?)
            ?: "https://kidschedule.replit.app"
        buildConfigField("String", "WRAPPER_URL", "\"$wrapperUrl\"")

        // RevenueCat public Android SDK key (starts with `goog_`). Pass at
        // build time: -PrevenueCatApiKey=goog_xxxxxxxxxxxxxxx
        // If empty, the in-app billing bridge stays disabled and the WebView
        // falls back to the existing web payment flow.
        val rcKey: String = (project.findProperty("revenueCatApiKey") as String?) ?: ""
        buildConfigField("String", "REVENUECAT_API_KEY", "\"$rcKey\"")
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            // Intentionally NO applicationIdSuffix — google-services.json
            // only contains com.amynest.app (production package). If you
            // need a parallel debug install, add `com.amynest.app.debug`
            // as a separate Android app in Firebase Console first, then
            // re-add `applicationIdSuffix = ".debug"` here.
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Google Play Billing via RevenueCat (handles purchase verification +
    // subscription state through our existing backend RevenueCat webhook).
    implementation("com.revenuecat.purchases:purchases:8.10.4")

    // Firebase Cloud Messaging — receives native push notifications. The web
    // app inside the WebView cannot use Web Push (Notification API is absent
    // in Android WebView), so we register the device's native FCM token via
    // PushBridge.kt instead. The same backend `/api/push/register` endpoint
    // and FCM Admin SDK send pipeline is reused.
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging-ktx")
}
