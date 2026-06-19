import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

fun readGradleProperties(vararg paths: java.io.File): Map<String, String> {
    val merged = linkedMapOf<String, String>()
    for (path in paths) {
        if (!path.exists()) continue
        val props = Properties()
        path.inputStream().use { props.load(it) }
        for (key in props.stringPropertyNames()) {
            merged[key] = props.getProperty(key)?.trim().orEmpty()
        }
    }
    return merged
}

val localGradleProps = readGradleProperties(
    rootProject.file("local.properties"),
    rootProject.file("keystore.properties"),
)
val facebookClientToken =
    System.getenv("FACEBOOK_CLIENT_TOKEN")?.trim().orEmpty().ifBlank {
        localGradleProps["facebook.clientToken"].orEmpty()
    }

android {
    namespace = "com.amynest.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.amynest.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 88
        versionName = "1.4.45"
        resValue(
            "string",
            "facebook_client_token",
            facebookClientToken.ifBlank { "REPLACE_WITH_META_CLIENT_TOKEN" },
        )
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
        jniLibs {
            // AGP 8.5.1+ zip-aligns uncompressed .so at 16 KB for Play 16 KB page-size devices.
            useLegacyPackaging = false
        }
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

/** Bundle local phonics/spelling/coach clips for WebView (no network for /audio-pack/). */
tasks.register<Copy>("syncAudioPackAssets") {
    group = "release"
    description = "Copy kidschedule public/audio-pack into APK/AAB assets"
    from(rootProject.file("../artifacts/kidschedule/public/audio-pack"))
    into(layout.projectDirectory.dir("src/main/assets/audio-pack"))
}

/** Bundle infant sleep library MP3s for offline WebView playback. */
tasks.register<Copy>("syncInfantSleepAudioAssets") {
    group = "release"
    description = "Copy kidschedule public/infant-sleep-audio into APK/AAB assets"
    from(rootProject.file("../artifacts/kidschedule/public/infant-sleep-audio"))
    into(layout.projectDirectory.dir("src/main/assets/infant-sleep-audio"))
}

tasks.named("preBuild") {
    dependsOn("syncAudioPackAssets", "syncInfantSleepAudioAssets")
}

tasks.register<Copy>("copyReleaseArtifacts") {
    group = "release"
    description = "Copy signed AAB to android/releases/ for Play upload"
    dependsOn("bundleRelease")
    val versionCode = android.defaultConfig.versionCode
    val versionName = android.defaultConfig.versionName
    from(layout.buildDirectory.file("outputs/bundle/release/app-release.aab"))
    into(rootProject.layout.projectDirectory.dir("releases"))
    rename { "amynest-$versionName-$versionCode.aab" }
}

afterEvaluate {
    tasks.named("bundleRelease") {
        finalizedBy("packageReleaseNativeDebugSymbols", "copyReleaseArtifacts")
        dependsOn("validateGoogleSignInConfig", "validateFacebookLoginConfig")
    }
}

// Fail release bundles when google-services.json lacks Android OAuth SHA-1 for com.amynest.app.
tasks.register<Exec>("validateGoogleSignInConfig") {
    group = "verification"
    description =
        "Ensure google-services.json includes Android OAuth client (SHA-1) for native Google Sign-In"
    workingDir = rootProject.projectDir
    commandLine("node", "scripts/validate-google-services.mjs", "--strict")
    onlyIf { file("app/google-services.json").exists() }
    doFirst {
        logger.lifecycle("Validating google-services.json for native Google Sign-In (com.amynest.app SHA-1)")
    }
}

tasks.register<Exec>("validateFacebookLoginConfig") {
    group = "verification"
    description = "Ensure Meta client token is set for native Facebook Login"
    workingDir = rootProject.projectDir
    commandLine("node", "scripts/validate-facebook-config.mjs", "--strict")
    doFirst {
        logger.lifecycle("Validating Meta client token for native Facebook Login")
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
    implementation("com.revenuecat.purchases:purchases:8.20.0")
    implementation("com.revenuecat.purchases:purchases-ui:8.20.0")

    // Firebase BOM — keeps all Firebase versions aligned
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Native Google Sign-In (AuthBridge → Firebase idToken on web layer)
    implementation("com.google.android.gms:play-services-auth:21.2.0")

    // Native Facebook Login (AuthBridge → Firebase access token on web layer)
    implementation("com.facebook.android:facebook-login:18.0.3")

    // JSON parsing for the message bus
    implementation("org.json:json:20240303")

    // Google Play In-App Review + Install Referrer (ASO growth)
    implementation("com.google.android.play:review-ktx:2.0.2")
    implementation("com.android.installreferrer:installreferrer:2.2")
}
