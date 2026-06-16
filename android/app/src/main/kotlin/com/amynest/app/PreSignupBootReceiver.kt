package com.amynest.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Restores pre-signup AlarmManager schedules after device reboot or app update.
 */
class PreSignupBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            -> {
                Log.d(TAG, "Restoring pre-signup alarms after ${intent.action}")
                LocalNotifBridge.restorePersistedAlarms(context.applicationContext)
            }
        }
    }

    companion object {
        private const val TAG = "PreSignupBootRx"
    }
}
