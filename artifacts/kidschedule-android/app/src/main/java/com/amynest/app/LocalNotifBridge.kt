package com.amynest.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject

/**
 * Schedules pre-signup re-engagement local notifications from the WebView.
 *
 * JS surface:
 *   window.AndroidLocalNotif.scheduleBatch(json)
 *   window.AndroidLocalNotif.cancelAll(json)   // array of int ids
 *   window.AndroidLocalNotif.cancelCampaign()
 */
class LocalNotifBridge private constructor(
    private val context: Context,
) {
    inner class AndroidLocalNotifInterface {
        @JavascriptInterface
        fun scheduleBatch(json: String) {
            try {
                val arr = JSONArray(json)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    scheduleOne(obj)
                }
            } catch (t: Throwable) {
                Log.w(TAG, "scheduleBatch failed", t)
            }
        }

        @JavascriptInterface
        fun cancelAll(json: String) {
            try {
                val arr = JSONArray(json)
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                for (i in 0 until arr.length()) {
                    val id = arr.getInt(i)
                    am.cancel(buildAlarmPendingIntent(id))
                }
            } catch (t: Throwable) {
                Log.w(TAG, "cancelAll failed", t)
            }
        }

        @JavascriptInterface
        fun cancelCampaign() {
            cancelAll(
                JSONArray(
                    listOf(910001, 910002, 910003, 910004, 910005),
                ).toString(),
            )
        }
    }

    private fun scheduleOne(obj: JSONObject) {
        val id = obj.getInt("id")
        val fireAtMs = obj.getLong("fireAtMs")
        if (fireAtMs <= System.currentTimeMillis()) return

        val intent = Intent(context, PreSignupNotifReceiver::class.java).apply {
            action = ACTION_SHOW
            putExtra(EXTRA_ID, id)
            putExtra(EXTRA_TITLE, obj.optString("title", "AmyNest"))
            putExtra(EXTRA_BODY, obj.optString("body", ""))
            putExtra(EXTRA_DEEP_LINK, obj.optString("deepLink", "/sign-up"))
            putExtra(EXTRA_MILESTONE, obj.optString("milestone", ""))
            putExtra(EXTRA_VARIANT, obj.optString("variant", ""))
            putExtra(EXTRA_CATEGORY, obj.optString("category", "pre_signup_reengagement"))
        }

        val pending = buildAlarmPendingIntent(id, intent)
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAtMs, pending)
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, fireAtMs, pending)
            }
            Log.d(TAG, "Scheduled pre-signup notification id=$id at=$fireAtMs")
        } catch (t: Throwable) {
            Log.w(TAG, "Alarm schedule failed id=$id", t)
        }
    }

    private fun buildAlarmPendingIntent(
        id: Int,
        intent: Intent = Intent(context, PreSignupNotifReceiver::class.java).apply {
            action = ACTION_SHOW
            putExtra(EXTRA_ID, id)
        },
    ): PendingIntent {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        return PendingIntent.getBroadcast(context, id, intent, flags)
    }

    companion object {
        private const val TAG = "LocalNotifBridge"
        const val JS_OBJECT_NAME = "AndroidLocalNotif"

        const val ACTION_SHOW = "com.amynest.app.PRESIGNUP_SHOW"
        const val EXTRA_ID = "presignup.id"
        const val EXTRA_TITLE = "presignup.title"
        const val EXTRA_BODY = "presignup.body"
        const val EXTRA_DEEP_LINK = "presignup.deepLink"
        const val EXTRA_MILESTONE = "presignup.milestone"
        const val EXTRA_VARIANT = "presignup.variant"
        const val EXTRA_CATEGORY = "presignup.category"

        fun installOn(webView: WebView, context: Context): LocalNotifBridge {
            val bridge = LocalNotifBridge(context.applicationContext)
            webView.addJavascriptInterface(
                bridge.AndroidLocalNotifInterface(),
                JS_OBJECT_NAME,
            )
            Log.d(TAG, "AndroidLocalNotif interface installed")
            return bridge
        }
    }
}
