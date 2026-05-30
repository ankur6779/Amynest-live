package com.amynest.app

import android.app.Application
import android.util.Log
import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger
import com.facebook.login.LoginBehavior
import com.facebook.login.LoginManager
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

private const val TAG = "AmyNestApp"

/**
 * Application class — creates all notification channels at startup so FCM
 * messages can post immediately regardless of when [MainActivity] first opens.
 *
 * Also initialises RevenueCat (Google Play Billing) so [BillingBridge] can
 * serve `window.AmyNestBillingNative` calls from the WebView.
 *
 * Channels are created via [NotifCategory.createAll] which covers all
 * server-side categories (routine, nutrition, parenting, learning, milestone)
 * plus the legacy "default" channel for backward compat.
 */
class AmyNestApp : Application() {

    override fun onCreate() {
        super.onCreate()
        initFacebookSdk()
        initRevenueCat()
        NotifCategory.createAll(this)
    }

    private fun initFacebookSdk() {
        try {
            FacebookSdk.fullyInitialize()
            // In-app dialog only — never Custom Tab / external Chrome (matches Google picker UX).
            LoginManager.getInstance().setLoginBehavior(LoginBehavior.DIALOG_ONLY)
            AppEventsLogger.activateApp(this)
            Log.d(TAG, "Facebook SDK initialised appId=${FacebookSdk.getApplicationId()} loginBehavior=DIALOG_ONLY")
        } catch (t: Throwable) {
            Log.e(TAG, "Facebook SDK init failed", t)
        }
    }

    private fun initRevenueCat() {
        try {
            Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.WARN
            Purchases.configure(
                PurchasesConfiguration.Builder(this, BillingBridge.RC_API_KEY).build()
            )
            Log.d(TAG, "RevenueCat initialised")
        } catch (t: Throwable) {
            Log.e(TAG, "RevenueCat init failed", t)
        }
    }
}
