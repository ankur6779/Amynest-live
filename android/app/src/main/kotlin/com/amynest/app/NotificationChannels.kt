package com.amynest.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.annotation.RawRes
import androidx.core.app.NotificationCompat

/**
 * NotificationChannels — per-category channel config for AmyNest notifications.
 *
 * Each [NotifCategory] maps to:
 *   - A [channelId] for the Android notification channel
 *   - A [priority] for NotificationCompat (pre-O compatibility)
 *   - A [fallbackDeepLink] path used when the FCM payload does not include one
 *
 * Categories mirror the server-side NotificationCategory enum in `@workspace/db`.
 */
enum class NotifCategory(
    val channelId: String,
    val priority: Int,
    val fallbackDeepLink: String,
) {
    ROUTINE(
        channelId = "routine",
        priority = androidx.core.app.NotificationCompat.PRIORITY_HIGH,
        fallbackDeepLink = "/routines",
    ),
    ROUTINE_ITEM(
        channelId = "routine",
        priority = androidx.core.app.NotificationCompat.PRIORITY_HIGH,
        fallbackDeepLink = "/routines",
    ),
    NUTRITION(
        channelId = "nutrition",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/nutrition",
    ),
    INSIGHTS(
        channelId = "parenting",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/assistant",
    ),
    WEEKLY(
        channelId = "parenting",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/progress",
    ),
    ENGAGEMENT(
        channelId = "parenting",
        priority = androidx.core.app.NotificationCompat.PRIORITY_LOW,
        fallbackDeepLink = "/dashboard",
    ),
    GOOD_NIGHT(
        channelId = "routine",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/routines",
    ),
    PARENTING_TIPS(
        channelId = "parenting",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/parenting-hub",
    ),
    STORY_TIME(
        channelId = "learning",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/parenting-hub",
    ),
    PHONICS(
        channelId = "learning",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/parenting-hub/speech-coach",
    ),
    LEARNING_ACTIVITY(
        channelId = "learning",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/study",
    ),
    MILESTONE(
        channelId = "milestone",
        priority = androidx.core.app.NotificationCompat.PRIORITY_HIGH,
        fallbackDeepLink = "/progress",
    ),
    INFANT_CARE(
        channelId = "parenting",
        priority = androidx.core.app.NotificationCompat.PRIORITY_DEFAULT,
        fallbackDeepLink = "/parenting-hub",
    );

    /** Bundled AmyNest notification sound in res/raw (ElevenLabs-generated). */
    @RawRes
    fun soundResId(): Int = when (this) {
        ROUTINE, ROUTINE_ITEM, GOOD_NIGHT -> NotificationSounds.NEST_CHIME
        MILESTONE, WEEKLY, ENGAGEMENT -> NotificationSounds.SPARKLE
        INSIGHTS, PARENTING_TIPS, INFANT_CARE -> NotificationSounds.SOFT_BELL
        STORY_TIME -> NotificationSounds.STORY_PING
        NUTRITION, PHONICS, LEARNING_ACTIVITY -> NotificationSounds.LEARNING_POP
    }

    companion object {
        /**
         * Parse a raw server-side category string (e.g. "routine_item") into a
         * [NotifCategory]. Falls back to [ROUTINE] for unknown values.
         */
        fun from(raw: String?): NotifCategory {
            if (raw.isNullOrBlank()) return ROUTINE
            val key = raw.trim().uppercase().replace('-', '_')
            return entries.firstOrNull { it.name == key } ?: ROUTINE
        }

        /**
         * Create all AmyNest notification channels. Safe to call multiple times —
         * no-ops for channels that already exist. Must be called before any
         * notification is shown (called from [AmyNestApp.onCreate]).
         */
        fun createAll(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            data class ChannelSpec(
                val id: String,
                val nameRes: Int,
                val importance: Int,
                @RawRes val soundRes: Int,
            )

            val specs = listOf(
                ChannelSpec("routine",   R.string.channel_routine,   NotificationManager.IMPORTANCE_HIGH,   NotificationSounds.NEST_CHIME),
                ChannelSpec("nutrition", R.string.channel_nutrition, NotificationManager.IMPORTANCE_DEFAULT, NotificationSounds.LEARNING_POP),
                ChannelSpec("parenting", R.string.channel_parenting, NotificationManager.IMPORTANCE_DEFAULT, NotificationSounds.SOFT_BELL),
                ChannelSpec("learning",  R.string.channel_learning,  NotificationManager.IMPORTANCE_DEFAULT, NotificationSounds.LEARNING_POP),
                ChannelSpec("milestone", R.string.channel_milestone, NotificationManager.IMPORTANCE_HIGH,   NotificationSounds.SPARKLE),
                ChannelSpec("pre_signup_reengagement", R.string.channel_pre_signup, NotificationManager.IMPORTANCE_DEFAULT, NotificationSounds.SOFT_BELL),
                ChannelSpec("default",   R.string.notification_channel_name, NotificationManager.IMPORTANCE_DEFAULT, NotificationSounds.NEST_CHIME),
            )

            val audioAttrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            for (spec in specs) {
                if (manager.getNotificationChannel(spec.id) != null) continue
                val soundUri = Uri.parse(
                    "android.resource://${context.packageName}/${spec.soundRes}",
                )
                val ch = NotificationChannel(
                    spec.id,
                    context.getString(spec.nameRes),
                    spec.importance,
                ).apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        enableLights(true)
                        lightColor = context.getColor(R.color.notification_accent)
                        setSound(soundUri, audioAttrs)
                    }
                }
                manager.createNotificationChannel(ch)
            }
        }
    }
}
