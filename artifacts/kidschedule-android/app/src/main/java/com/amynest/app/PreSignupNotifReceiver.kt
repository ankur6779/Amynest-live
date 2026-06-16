package com.amynest.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/**
 * AlarmManager callback — shows a pre-signup local notification and opens
 * the WebView at the deep link on tap.
 */
class PreSignupNotifReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != LocalNotifBridge.ACTION_SHOW) return

        val id = intent.getIntExtra(LocalNotifBridge.EXTRA_ID, 0)
        val title = intent.getStringExtra(LocalNotifBridge.EXTRA_TITLE) ?: "AmyNest"
        val body = intent.getStringExtra(LocalNotifBridge.EXTRA_BODY) ?: ""
        val deepLink = intent.getStringExtra(LocalNotifBridge.EXTRA_DEEP_LINK) ?: "/sign-up"
        val milestone = intent.getStringExtra(LocalNotifBridge.EXTRA_MILESTONE) ?: ""
        val variant = intent.getStringExtra(LocalNotifBridge.EXTRA_VARIANT) ?: ""

        Log.d(TAG, "Showing pre-signup notification id=$id milestone=$milestone")

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = Uri.parse("kidschedule://deepLink").buildUpon()
                .appendQueryParameter("path", deepLink)
                .build()
            putExtra(KidScheduleFcmService.EXTRA_DEEP_LINK, deepLink)
            putExtra("presignup.notificationId", id.toString())
            putExtra("presignup.milestone", milestone)
            putExtra("presignup.variant", variant)
            putExtra("presignup.category", "pre_signup_reengagement")
        }

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            id,
            tapIntent,
            pendingFlags,
        )

        val channelId = context.getString(R.string.notification_channel_default_id)
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(context, R.color.brand_primary))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify("presignup_$id", id, notification)
    }

    companion object {
        private const val TAG = "PreSignupNotifRx"
    }
}
