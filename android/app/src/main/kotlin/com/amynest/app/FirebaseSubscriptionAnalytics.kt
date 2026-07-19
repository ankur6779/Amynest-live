package com.amynest.app

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Logs Google Ads / Firebase subscription conversion events from native Play Billing.
 * Event names match the linked conversion actions in Google Ads
 * (app_store_subscription_convert, purchase, begin_checkout).
 */
object FirebaseSubscriptionAnalytics {
    private const val TAG = "FirebaseSubAnalytics"
    const val EVENT_SUBSCRIPTION_CONVERT = "app_store_subscription_convert"
    const val EVENT_BEGIN_CHECKOUT = "begin_checkout"

    fun logSubscriptionPurchase(
        context: Context,
        productId: String,
        currency: String,
        value: Double,
        source: String = "google_play",
    ) {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            val bundle = Bundle().apply {
                putString(FirebaseAnalytics.Param.CURRENCY, currency)
                putDouble(FirebaseAnalytics.Param.VALUE, value)
                putString(FirebaseAnalytics.Param.ITEM_ID, productId)
                putString(FirebaseAnalytics.Param.ITEM_NAME, productId)
                putString("source", source)
            }
            analytics.logEvent(FirebaseAnalytics.Event.PURCHASE, bundle)
            analytics.logEvent(EVENT_SUBSCRIPTION_CONVERT, bundle)
            Log.d(TAG, "Logged subscription purchase productId=$productId value=$value $currency")
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to log subscription purchase", t)
        }
    }

    fun logBeginCheckout(
        context: Context,
        productId: String,
        currency: String,
        value: Double,
        source: String = "google_play",
    ) {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            val bundle = Bundle().apply {
                putString(FirebaseAnalytics.Param.CURRENCY, currency)
                putDouble(FirebaseAnalytics.Param.VALUE, value)
                putString(FirebaseAnalytics.Param.ITEM_ID, productId)
                putString("source", source)
            }
            analytics.logEvent(EVENT_BEGIN_CHECKOUT, bundle)
            Log.d(TAG, "Logged begin_checkout productId=$productId value=$value $currency")
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to log begin_checkout", t)
        }
    }

    fun logSubscriptionConvert(context: Context, source: String = "google_play") {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            analytics.logEvent(
                EVENT_SUBSCRIPTION_CONVERT,
                Bundle().apply { putString("source", source) },
            )
            Log.d(TAG, "Logged subscription convert source=$source")
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to log subscription convert", t)
        }
    }
}
