package com.amynest.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

private const val CHANNEL_ID = "default"

/**
 * Application class — creates the default notification channel at startup so
 * FCM messages received while the app is in the foreground (and shown by
 * [KidScheduleFcmService]) can post to it immediately without waiting for the
 * first [MainActivity] launch.
 *
 * channelId "default" matches what the backend sends in
 * `sendFcmAndroidPush()` → `android.notification.channelId`.
 */
class AmyNestApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createDefaultNotificationChannel()
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
