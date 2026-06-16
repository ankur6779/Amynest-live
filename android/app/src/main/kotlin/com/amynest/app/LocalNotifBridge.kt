package com.amynest.app

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Schedules pre-signup re-engagement local notifications from the WebView.
 *
 * JS: window.AndroidLocalNotif.scheduleBatch(json) | cancelAll(json) | cancelCampaign()
 */
class LocalNotifBridge private constructor(
    private val context: Context,
) {
    inner class AndroidLocalNotifInterface {
        @JavascriptInterface
        fun scheduleBatch(json: String) {
            try {
                if (!hasPostNotificationsPermission()) {
                    Log.w(TAG, "scheduleBatch skipped — POST_NOTIFICATIONS not granted")
                    return
                }
                val arr = JSONArray(json)
                val specs = mutableListOf<PreSignupAlarmStore.AlarmSpec>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val spec = parseSpec(obj) ?: continue
                    if (scheduleOne(spec)) {
                        specs.add(spec)
                    }
                }
                PreSignupAlarmStore.replaceAll(context, specs)
                Log.d(TAG, "scheduleBatch persisted ${specs.size} alarm(s)")
            } catch (t: Throwable) {
                Log.e(TAG, "scheduleBatch failed", t)
            }
        }

        @JavascriptInterface
        fun cancelAll(json: String) {
            try {
                val arr = JSONArray(json)
                val am = alarmManager()
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
            cancelAll(JSONArray(MILESTONE_IDS).toString())
            PreSignupAlarmStore.clear(context)
        }

        /** Drain native delivery events queued while the app was killed. */
        @JavascriptInterface
        fun drainPendingDeliveries(): String {
            val events = PreSignupAlarmStore.drainPendingDeliveries(context)
            val arr = JSONArray()
            for (e in events) {
                arr.put(
                    JSONObject()
                        .put("notificationId", e.notificationId)
                        .put("milestone", e.milestone)
                        .put("variant", e.variant)
                        .put("deliveredAtMs", e.deliveredAtMs),
                )
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun drainPendingDismissals(): String {
            val prefs = context.getSharedPreferences(
                PreSignupDismissReceiver.PREFS,
                Context.MODE_PRIVATE,
            )
            val raw = prefs.getString(PreSignupDismissReceiver.KEY_PENDING, "[]") ?: "[]"
            prefs.edit().remove(PreSignupDismissReceiver.KEY_PENDING).apply()
            return raw
        }

        /** "granted" | "denied" — surfaced to JS for exact-alarm diagnostics. */
        @JavascriptInterface
        fun canScheduleExactAlarms(): String {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                return if (alarmManager().canScheduleExactAlarms()) "granted" else "denied"
            }
            return "granted"
        }
    }

    private fun parseSpec(obj: JSONObject): PreSignupAlarmStore.AlarmSpec? {
        return try {
            PreSignupAlarmStore.AlarmSpec(
                id = obj.getInt("id"),
                fireAtMs = obj.getLong("fireAtMs"),
                title = obj.optString("title", "AmyNest AI"),
                body = obj.optString("body", ""),
                deepLink = obj.optString("deepLink", "/sign-up"),
                milestone = obj.optString("milestone", ""),
                variant = obj.optString("variant", ""),
                category = obj.optString("category", CATEGORY),
            )
        } catch (_: Throwable) {
            null
        }
    }

    private fun scheduleOne(spec: PreSignupAlarmStore.AlarmSpec): Boolean {
        if (spec.fireAtMs <= System.currentTimeMillis()) return false

        val intent = Intent(context, PreSignupNotifReceiver::class.java).apply {
            action = ACTION_SHOW
            putExtra(EXTRA_ID, spec.id)
            putExtra(EXTRA_TITLE, spec.title)
            putExtra(EXTRA_BODY, spec.body)
            putExtra(EXTRA_DEEP_LINK, spec.deepLink)
            putExtra(EXTRA_MILESTONE, spec.milestone)
            putExtra(EXTRA_VARIANT, spec.variant)
            putExtra(EXTRA_CATEGORY, spec.category)
        }

        val pending = buildAlarmPendingIntent(spec.id, intent)
        val am = alarmManager()

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, spec.fireAtMs, pending)
                } else {
                    Log.w(TAG, "Exact alarms unavailable; using inexact schedule id=${spec.id}")
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, spec.fireAtMs, pending)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, spec.fireAtMs, pending)
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, spec.fireAtMs, pending)
            }
            Log.d(TAG, "Scheduled pre-signup id=${spec.id} at=${spec.fireAtMs}")
            true
        } catch (t: Throwable) {
            Log.e(TAG, "Alarm schedule failed id=${spec.id}", t)
            false
        }
    }

    private fun buildAlarmPendingIntent(
        id: Int,
        intent: Intent = Intent(context, PreSignupNotifReceiver::class.java).apply {
            action = ACTION_SHOW
            putExtra(EXTRA_ID, id)
        },
    ): PendingIntent {
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, id, intent, flags)
    }

    private fun alarmManager(): AlarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun hasPostNotificationsPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    companion object {
        private const val TAG = "LocalNotifBridge"
        const val JS_OBJECT_NAME = "AndroidLocalNotif"
        const val ACTION_SHOW = "com.amynest.app.PRESIGNUP_SHOW"
        const val CATEGORY = "pre_signup_reengagement"
        const val CHANNEL_ID = "pre_signup_reengagement"

        const val EXTRA_ID = "presignup.id"
        const val EXTRA_TITLE = "presignup.title"
        const val EXTRA_BODY = "presignup.body"
        const val EXTRA_DEEP_LINK = "deepLink"
        const val EXTRA_MILESTONE = "presignup.milestone"
        const val EXTRA_VARIANT = "presignup.variant"
        const val EXTRA_CATEGORY = "category"
        const val EXTRA_NOTIFICATION_ID = "notificationId"

        private val MILESTONE_IDS = intArrayOf(910001, 910002, 910003, 910004, 910005)

        fun installOn(webView: WebView, context: Context): LocalNotifBridge {
            val bridge = LocalNotifBridge(context.applicationContext)
            webView.addJavascriptInterface(bridge.AndroidLocalNotifInterface(), JS_OBJECT_NAME)
            Log.d(TAG, "AndroidLocalNotif interface installed")
            return bridge
        }

        /** Reschedule persisted alarms — called from [PreSignupBootReceiver]. */
        fun restorePersistedAlarms(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    Log.w(TAG, "restorePersistedAlarms skipped — notifications not granted")
                    return
                }
            }
            val bridge = LocalNotifBridge(context.applicationContext)
            val specs = PreSignupAlarmStore.readAll(context)
                .filter { it.fireAtMs > System.currentTimeMillis() }
            if (specs.isEmpty()) return
            val scheduled = specs.mapNotNull { spec ->
                if (bridge.scheduleOne(spec)) spec else null
            }
            PreSignupAlarmStore.replaceAll(context, scheduled)
            Log.d(TAG, "Restored ${scheduled.size} pre-signup alarm(s) after boot/update")
        }
    }
}
