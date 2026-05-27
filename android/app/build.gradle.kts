import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.amynest.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.amynest.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 64
        versionName = "1.4.21"
    }

    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                val keystoreProperties = Properties()
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile != null) {
                signingConfig = releaseSigning
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // FULL → Play Console native-debug-symbols.zip + crash deobfuscation.
            ndk {
                debugSymbolLevel = "FULL"
            }
        }
        debug {
            applicationIdSuffix = ".debug"
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
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

// Play Console: upload outputs/native-debug-symbols/release/native-debug-symbols.zip
// (App bundle explorer → version → Downloads → Native debug symbols)
tasks.register<Zip>("packageReleaseNativeDebugSymbols") {
    group = "release"
    description = "Zip merged .so libs for Play Console native debug symbols upload"
    dependsOn("mergeReleaseNativeLibs")
    archiveFileName.set("native-debug-symbols.zip")
    val outDir = layout.buildDirectory.dir("outputs/native-debug-symbols/release")
    destinationDirectory.set(outDir)
    from(
        layout.buildDirectory.dir(
            "intermediates/merged_native_libs/release/mergeReleaseNativeLibs/out/lib",
        ),
    )
}

afterEvaluate {
    tasks.named("bundleRelease") {
        finalizedBy("packageReleaseNativeDebugSymbols")
    }
}

dependencies {
    // Core
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.1")
    implementation("com.google.android.material:material:1.12.0")

    // WebView (for AmyNestPushNative + AmyNestBillingNative message listeners)
    implementation("androidx.webkit:webkit:1.11.0")

    // Google Play Billing via RevenueCat. Handles purchase verification and
    // subscription state through the backend RevenueCat webhook.
    implementation("com.revenuecat.purchases:purchases:8.19.2")
    implementation("com.revenuecat.purchases:purchases-ui:8.19.2")

    // Firebase BOM — keeps all Firebase versions aligned
    implementation(platform("com.google.firebase:firebase-bom:33.3.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Native Google Sign-In (AuthBridge → Firebase idToken on web layer)
    implementation("com.google.android.gms:play-services-auth:21.2.0")

    // JSON parsing for the message bus
    implementation("org.json:json:20240303")
}
