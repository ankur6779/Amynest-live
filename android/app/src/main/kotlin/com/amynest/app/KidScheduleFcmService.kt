package com.amynest.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

private const val TAG = "KidScheduleFcmService"

/**
 * KidScheduleFcmService — handles Firebase Cloud Messaging events.
 *
 * **[onNewToken]**: Persists the fresh FCM registration token and delivers it
 * to any open WebView via [PushBridge.broadcastToken].
 *
 * **[onMessageReceived]**: Called when the app is in the foreground *or* when
 * FCM data-only messages arrive regardless of app state. Reads the `category`
 * field from the FCM data payload to:
 *   1. Select the appropriate notification channel (routine / nutrition /
 *      parenting / learning / milestone / default).
 *   2. Infer a smart deep-link path when the server does not supply one.
 *   3. Set the correct priority so routine reminders ring at high importance
 *      while engagement nudges stay quiet.
 *
 * The resulting notification tap starts [MainActivity] with:
 *   - `deepLink`     — path to open (e.g. "/routines", "/nutrition")
 *   - `notifCategory`— raw category string forwarded to the web page
 */
class KidScheduleFcmService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM registration token refreshed")
        PushBridge(applicationContext).saveToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM message from: ${remoteMessage.from}")

        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: getString(R.string.app_name)
        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: ""

        val rawCategory = remoteMessage.data["category"]
        val category = NotifCategory.from(rawCategory)
        val categoryStr = rawCategory?.takeIf { it.isNotBlank() }
            ?: category.name.lowercase()

        val deepLink = remoteMessage.data["deepLink"]
            ?.takeIf { it.isNotBlank() }
            ?: category.fallbackDeepLink

        Log.d(TAG, "Notification: category=$categoryStr deepLink=$deepLink channel=${category.channelId}")

        showNotification(title, body, deepLink, categoryStr, category)
    }

    // ── Notification helpers ──────────────────────────────────────────────────

    private fun showNotification(
        title: String,
        body: String,
        deepLink: String,
        categoryStr: String,
        category: NotifCategory,
    ) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("deepLink", deepLink)
            putExtra("notifCategory", categoryStr)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, category.channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(getColor(R.color.notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(category.priority)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
