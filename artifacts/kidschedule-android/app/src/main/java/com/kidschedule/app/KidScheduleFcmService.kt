package com.kidschedule.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Receives push notifications from Firebase Cloud Messaging and renders
 * them as system notifications. Also handles fresh-token broadcasts so
 * we can re-register the device with the backend if the FCM token rotates.
 *
 * Payload contract (matches the server-side FCM Admin SDK payload built in
 * notificationDispatchService.ts):
 *   notification.title / notification.body  → standard Android display
 *   data.deepLink                           → in-app route to open on tap
 *                                             (passed back into the WebView
 *                                             via MainActivity.handleDeepLink)
 *   data.category                           → analytics-only, ignored here
 */
class KidScheduleFcmService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "KidScheduleFcm"
        const val EXTRA_DEEP_LINK = "kidschedule.deepLink"
    }

    /**
     * Called automatically by the FCM SDK whenever a new registration token
     * is generated (fresh install, app data clear, token rotation, etc.).
     *
     * The web app picks this up next time it foregrounds via PushBridge —
     * no need to push it server-side from native code. We just log here.
     */
    override fun onNewToken(token: String) {
        Log.i(TAG, "FCM token rotated (length=${token.length})")
        // Best-effort: persist so PushBridge can hand it out synchronously
        // before the async getToken() task completes after process restart.
        try {
            getSharedPreferences("kidschedule_push", Context.MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply()
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to cache fresh FCM token", t)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // FCM has two payload styles:
        //   1) "notification" payload — Android auto-displays when app is in
        //      background. onMessageReceived only fires here for foreground.
        //   2) "data" payload — always delivered to onMessageReceived; we
        //      must build the notification ourselves.
        // The server sends BOTH (notification + data), so:
        //   - Background: system shows it, this method may not fire.
        //   - Foreground: we receive notification.title/body here AND data.
        // To avoid double-display when a "notification" payload arrives in
        // foreground, we still render via NotificationCompat — Android will
        // not duplicate because the system handler only runs in background.

        val notif = message.notification
        val data = message.data

        val title = notif?.title ?: data["title"] ?: "KidSchedule"
        val body = notif?.body ?: data["body"] ?: ""
        val deepLink = data["deepLink"]?.takeIf { it.isNotBlank() } ?: "/"

        showNotification(title, body, deepLink, message.messageId ?: deepLink)
    }

    private fun showNotification(
        title: String,
        body: String,
        deepLink: String,
        tag: String,
    ) {
        val ctx = applicationContext

        // Tap intent → relaunch MainActivity with the deepLink extra so
        // MainActivity can navigate the WebView to the right route.
        val tapIntent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = Uri.parse("kidschedule://deepLink").buildUpon()
                .appendQueryParameter("path", deepLink)
                .build()
            putExtra(EXTRA_DEEP_LINK, deepLink)
        }
        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(
            ctx,
            tag.hashCode(),
            tapIntent,
            pendingFlags,
        )

        val channelId = ctx.getString(R.string.notification_channel_default_id)
        val builder = NotificationCompat.Builder(ctx, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(ctx, R.color.brand_primary))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // Use the message id (or deepLink) as a stable tag so duplicate
        // deliveries replace rather than stack.
        nm.notify(tag, 0, builder.build())
    }
}
