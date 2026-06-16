package com.amynest.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject

/**
 * Swipe-dismiss analytics bridge — queues event for web layer on next app open.
 */
class PreSignupDismissReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ACTION_DISMISS) return
        val id = intent.getIntExtra(LocalNotifBridge.EXTRA_ID, 0)
        val milestone = intent.getStringExtra(LocalNotifBridge.EXTRA_MILESTONE) ?: ""
        val variant = intent.getStringExtra(LocalNotifBridge.EXTRA_VARIANT) ?: ""
        Log.d(TAG, "Pre-signup notification dismissed id=$id")
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = try {
            org.json.JSONArray(prefs.getString(KEY_PENDING, "[]"))
        } catch (_: Throwable) {
            org.json.JSONArray()
        }
        arr.put(
            JSONObject()
                .put("notificationId", id.toString())
                .put("milestone", milestone)
                .put("variant", variant)
                .put("dismissedAtMs", System.currentTimeMillis()),
        )
        prefs.edit().putString(KEY_PENDING, arr.toString()).apply()
    }

    companion object {
        const val ACTION_DISMISS = "com.amynest.app.PRESIGNUP_DISMISS"
        private const val TAG = "PreSignupDismissRx"
        const val PREFS = "amynest_presignup_dismiss"
        const val KEY_PENDING = "pending_dismiss_json"
    }
}
