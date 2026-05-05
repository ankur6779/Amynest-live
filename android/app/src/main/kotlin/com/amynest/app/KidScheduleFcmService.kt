package com.amynest.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

private const val TAG = "KidScheduleFcmService"
private const val CHANNEL_ID = "default"

/**
 * KidScheduleFcmService — handles Firebase Cloud Messaging events.
 *
 * **[onNewToken]**: Persists the fresh FCM registration token via [PushBridge]
 * and pushes the out-of-band `{ type:"token" }` event to any open WebView
 * through [PushBridge.broadcastEvent]. The backend learns about the token
 * when the web page calls `/api/push/register` after receiving the event.
 *
 * **[onMessageReceived]**: Called when the app is in the foreground *or* when
 * FCM data-only messages arrive regardless of state. For notification messages
 * in the background, the FCM SDK displays the notification automatically using
 * the `android.notification` config sent by `sendFcmAndroidPush()` on the
 * backend. We construct our own notification here for data-only payloads and
 * for the foreground case (where the system would otherwise suppress it).
 *
 * `channelId = "default"` matches:
 *   - `AmyNestApp.createDefaultNotificationChannel()`
 *   - Backend: `sendFcmAndroidPush() → android.notification.channelId`
 */
class KidScheduleFcmService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM registration token refreshed")
        // Persist in SharedPreferences. PushBridge.broadcastEvent() is called
        // inside saveToken() using the companion-object activeProxy — so if
        // MainActivity's WebView is open the web page gets the token immediately.
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
        val deepLink = remoteMessage.data["deepLink"]?.takeIf { it.isNotBlank() }

        ensureNotificationChannel()
        showNotification(title, body, deepLink)
    }

    // ── Notification helpers ──────────────────────────────────────────────────

    private fun ensureNotificationChannel() {
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

    private fun showNotification(title: String, body: String, deepLink: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (deepLink != null) putExtra("deepLink", deepLink)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(getColor(R.color.notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
