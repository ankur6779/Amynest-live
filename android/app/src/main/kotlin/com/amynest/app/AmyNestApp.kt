package com.amynest.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

private const val CHANNEL_ID = "default"
private const val TAG = "AmyNestApp"

/**
 * Application class — creates the default notification channel at startup so
 * FCM messages received while the app is in the foreground (and shown by
 * [KidScheduleFcmService]) can post to it immediately without waiting for the
 * first [MainActivity] launch.
 *
 * Also initialises RevenueCat (Google Play Billing) so the [BillingBridge]
 * can serve `window.AmyNestBillingNative` calls from the WebView page.
 *
 * channelId "default" matches what the backend sends in
 * `sendFcmAndroidPush()` → `android.notification.channelId`.
 */
class AmyNestApp : Application() {

    override fun onCreate() {
        super.onCreate()
        initRevenueCat()
        createDefaultNotificationChannel()
    }

    private fun initRevenueCat() {
        try {
            Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.WARN
            Purchases.configure(
                PurchasesConfiguration.Builder(this, BillingBridge.RC_API_KEY).build()
            )
            Log.d(TAG, "RevenueCat initialised")
        } catch (t: Throwable) {
            Log.e(TAG, "RevenueCat init failed", t)
        }
    }

    private fun createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = getString(R.string.notification_channel_description)
                enableLights(true)
                lightColor = getColor(R.color.notification_accent)
            }
            manager.createNotificationChannel(channel)
        }
    }
}
