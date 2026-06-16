package com.amynest.app

import android.Manifest
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * AlarmManager callback — shows a pre-signup local notification.
 * Tap extras are compatible with [MainActivity.extractNotificationTapFromIntent].
 */
class PreSignupNotifReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != LocalNotifBridge.ACTION_SHOW) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                Log.w(TAG, "Skipping notification — POST_NOTIFICATIONS not granted")
                return
            }
        }

        val id = intent.getIntExtra(LocalNotifBridge.EXTRA_ID, 0)
        val title = intent.getStringExtra(LocalNotifBridge.EXTRA_TITLE) ?: "AmyNest AI"
        val body = intent.getStringExtra(LocalNotifBridge.EXTRA_BODY) ?: ""
        val deepLink = intent.getStringExtra(LocalNotifBridge.EXTRA_DEEP_LINK) ?: "/sign-up"
        val milestone = intent.getStringExtra(LocalNotifBridge.EXTRA_MILESTONE) ?: ""
        val variant = intent.getStringExtra(LocalNotifBridge.EXTRA_VARIANT) ?: ""
        val category = intent.getStringExtra(LocalNotifBridge.EXTRA_CATEGORY)
            ?: LocalNotifBridge.CATEGORY

        Log.d(TAG, "Showing pre-signup notification id=$id milestone=$milestone")

        PreSignupAlarmStore.enqueueDelivery(
            context,
            PreSignupAlarmStore.DeliveryEvent(
                notificationId = id.toString(),
                milestone = milestone,
                variant = variant,
                deliveredAtMs = System.currentTimeMillis(),
            ),
        )

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(LocalNotifBridge.EXTRA_DEEP_LINK, deepLink)
            putExtra(LocalNotifBridge.EXTRA_CATEGORY, category)
            putExtra(LocalNotifBridge.EXTRA_NOTIFICATION_ID, id.toString())
            putExtra(LocalNotifBridge.EXTRA_MILESTONE, milestone)
            putExtra(LocalNotifBridge.EXTRA_VARIANT, variant)
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, id, tapIntent, pendingFlags)

        val notification = NotificationCompat.Builder(context, LocalNotifBridge.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(context, R.color.notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setDeleteIntent(
                buildDismissPendingIntent(context, id, milestone, variant, category),
            )
            .setContentIntent(pendingIntent)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(TAG, id, notification)
    }

    private fun buildDismissPendingIntent(
        context: Context,
        id: Int,
        milestone: String,
        variant: String,
        category: String,
    ): PendingIntent {
        val intent = Intent(context, PreSignupDismissReceiver::class.java).apply {
            action = PreSignupDismissReceiver.ACTION_DISMISS
            putExtra(LocalNotifBridge.EXTRA_ID, id)
            putExtra(LocalNotifBridge.EXTRA_MILESTONE, milestone)
            putExtra(LocalNotifBridge.EXTRA_VARIANT, variant)
            putExtra(LocalNotifBridge.EXTRA_CATEGORY, category)
        }
        return PendingIntent.getBroadcast(
            context,
            id + 100_000,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        private const val TAG = "PreSignupNotifRx"
    }
}
