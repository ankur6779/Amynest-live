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
    const val EVENT_SIGN_UP = "sign_up"

    fun setUserId(context: Context, userId: String?) {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            analytics.setUserId(userId)
            Log.d(TAG, "Set analytics userId=${userId ?: "null"}")
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to set analytics userId", t)
        }
    }

    private fun ecommerceBundle(
        productId: String,
        currency: String,
        value: Double,
        source: String,
    ): Bundle {
        val item = Bundle().apply {
            putString(FirebaseAnalytics.Param.ITEM_ID, productId)
            putString(FirebaseAnalytics.Param.ITEM_NAME, productId)
            putString(FirebaseAnalytics.Param.ITEM_CATEGORY, "subscription")
            putDouble(FirebaseAnalytics.Param.PRICE, value)
            putLong(FirebaseAnalytics.Param.QUANTITY, 1)
        }
        return Bundle().apply {
            putString(FirebaseAnalytics.Param.CURRENCY, currency)
            putDouble(FirebaseAnalytics.Param.VALUE, value)
            putString(FirebaseAnalytics.Param.ITEM_ID, productId)
            putString(FirebaseAnalytics.Param.ITEM_NAME, productId)
            putParcelableArray(FirebaseAnalytics.Param.ITEMS, arrayOf(item))
            putString("source", source)
        }
    }

    fun logSubscriptionPurchase(
        context: Context,
        productId: String,
        currency: String,
        value: Double,
        source: String = "google_play",
    ) {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            val bundle = ecommerceBundle(productId, currency, value, source)
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
            val bundle = ecommerceBundle(productId, currency, value, source)
            analytics.logEvent(FirebaseAnalytics.Event.BEGIN_CHECKOUT, bundle)
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

    fun logSignUp(
        context: Context,
        method: String = "app",
        source: String = "growth",
    ) {
        try {
            val analytics = FirebaseAnalytics.getInstance(context.applicationContext)
            analytics.logEvent(
                FirebaseAnalytics.Event.SIGN_UP,
                Bundle().apply {
                    putString(FirebaseAnalytics.Param.METHOD, method)
                    putString("source", source)
                },
            )
            Log.d(TAG, "Logged sign_up method=$method source=$source")
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to log sign_up", t)
        }
    }
}
