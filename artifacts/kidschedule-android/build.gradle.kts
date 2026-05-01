plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
    // Google Services plugin processes google-services.json into resource
    // values that the Firebase SDKs read at runtime. Applied conditionally
    // in :app (only when google-services.json is present) so dev builds
    // without Firebase still compile.
    id("com.google.gms.google-services") version "4.4.2" apply false
}
