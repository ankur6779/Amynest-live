package com.amynest.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persists pre-signup local notification alarms so [PreSignupBootReceiver]
 * can restore schedules after reboot or app update.
 */
object PreSignupAlarmStore {
    private const val PREFS = "amynest_presignup_alarms"
    private const val KEY_ALARMS = "alarms_json"
    private const val KEY_PENDING_DELIVERY = "pending_delivery_json"

    data class AlarmSpec(
        val id: Int,
        val fireAtMs: Long,
        val title: String,
        val body: String,
        val deepLink: String,
        val milestone: String,
        val variant: String,
        val category: String,
    )

    data class DeliveryEvent(
        val notificationId: String,
        val milestone: String,
        val variant: String,
        val deliveredAtMs: Long,
    )

    fun replaceAll(context: Context, specs: List<AlarmSpec>) {
        val arr = JSONArray()
        for (s in specs) {
            arr.put(
                JSONObject()
                    .put("id", s.id)
                    .put("fireAtMs", s.fireAtMs)
                    .put("title", s.title)
                    .put("body", s.body)
                    .put("deepLink", s.deepLink)
                    .put("milestone", s.milestone)
                    .put("variant", s.variant)
                    .put("category", s.category),
            )
        }
        prefs(context).edit().putString(KEY_ALARMS, arr.toString()).apply()
    }

    fun readAll(context: Context): List<AlarmSpec> {
        val raw = prefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        AlarmSpec(
                            id = o.getInt("id"),
                            fireAtMs = o.getLong("fireAtMs"),
                            title = o.optString("title", "AmyNest AI"),
                            body = o.optString("body", ""),
                            deepLink = o.optString("deepLink", "/sign-up"),
                            milestone = o.optString("milestone", ""),
                            variant = o.optString("variant", ""),
                            category = o.optString("category", "pre_signup_reengagement"),
                        ),
                    )
                }
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_ALARMS).apply()
    }

    fun enqueueDelivery(context: Context, event: DeliveryEvent) {
        val existing = readPendingDeliveries(context).toMutableList()
        existing.add(event)
        val arr = JSONArray()
        for (e in existing.takeLast(20)) {
            arr.put(
                JSONObject()
                    .put("notificationId", e.notificationId)
                    .put("milestone", e.milestone)
                    .put("variant", e.variant)
                    .put("deliveredAtMs", e.deliveredAtMs),
            )
        }
        prefs(context).edit().putString(KEY_PENDING_DELIVERY, arr.toString()).apply()
    }

    fun drainPendingDeliveries(context: Context): List<DeliveryEvent> {
        val events = readPendingDeliveries(context)
        prefs(context).edit().remove(KEY_PENDING_DELIVERY).apply()
        return events
    }

    private fun readPendingDeliveries(context: Context): List<DeliveryEvent> {
        val raw = prefs(context).getString(KEY_PENDING_DELIVERY, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        DeliveryEvent(
                            notificationId = o.getString("notificationId"),
                            milestone = o.optString("milestone", ""),
                            variant = o.optString("variant", ""),
                            deliveredAtMs = o.optLong("deliveredAtMs", System.currentTimeMillis()),
                        ),
                    )
                }
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
