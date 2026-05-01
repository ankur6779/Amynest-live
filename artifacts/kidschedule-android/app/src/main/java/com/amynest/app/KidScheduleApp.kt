package com.amynest.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.google.android.material.color.DynamicColors
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class KidScheduleApp : Application() {
    override fun onCreate() {
        super.onCreate()
        DynamicColors.applyToActivitiesIfAvailable(this)
        createDefaultNotificationChannel()

        // Initialize RevenueCat (Google Play Billing) only when an API key is
        // baked in at build time (-PrevenueCatApiKey=goog_xxx). Without a key
        // the WebView falls back to the existing web payment flow — useful
        // for local dev / debug builds.
        val key = BuildConfig.REVENUECAT_API_KEY
        if (key.isNotBlank()) {
            try {
                Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.WARN
                Purchases.configure(
                    PurchasesConfiguration.Builder(this, key).build()
                )
            } catch (t: Throwable) {
                Log.e("KidScheduleApp", "RevenueCat init failed", t)
            }
        } else {
            Log.w(
                "KidScheduleApp",
                "REVENUECAT_API_KEY is empty — Google Play Billing bridge disabled."
            )
        }
    }

    /**
     * Register the default notification channel referenced by FCM payloads.
     * Channel creation is idempotent — safe to call on every cold start.
     * Only required on Android 8.0+ (API 26).
     */
    private fun createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            getString(R.string.notification_channel_default_id),
            getString(R.string.notification_channel_default_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = getString(R.string.notification_channel_default_description)
            enableLights(true)
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }
}
