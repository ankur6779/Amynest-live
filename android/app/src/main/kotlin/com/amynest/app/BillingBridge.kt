package com.amynest.app

import android.app.Activity
import android.net.Uri
import android.util.Log
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.getCustomerInfoWith
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.logInWith
import com.revenuecat.purchases.purchaseWith
import com.revenuecat.purchases.restorePurchasesWith
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallActivityLauncher
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResult
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Google Play Billing (via RevenueCat) bridge for the AmyNest WebView wrapper.
 *
 * Exposes `window.AmyNestBillingNative` to the web page running at
 * amynest.in / www.amynest.in only. Cross-origin iframes cannot reach this bridge.
 */
class BillingBridge(
    activity: Activity,
    webView: WebView,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)
    private var paywallLauncher: PaywallActivityLauncher? = null
    private var pendingPaywallReply: Pair<JavaScriptReplyProxy, String>? = null

    fun attachPaywallLauncher(launcher: PaywallActivityLauncher) {
        paywallLauncher = launcher
    }

    fun onPaywallResult(result: PaywallResult) {
        val pending = pendingPaywallReply ?: return
        pendingPaywallReply = null
        resolve(pending.first, pending.second, paywallResultToJson(result))
    }

    fun handleMessage(rawMessage: String, sourceOrigin: Uri, replyProxy: JavaScriptReplyProxy) {
        val src = sourceOrigin.toString().trimEnd('/')
        if (ALLOWED_ORIGINS.none { src.equals(it.trimEnd('/'), ignoreCase = true) }) {
            Log.w(TAG, "rejected message from untrusted origin: $sourceOrigin")
            return
        }

        val msg: JSONObject = try {
            JSONObject(rawMessage)
        } catch (_: JSONException) {
            Log.w(TAG, "malformed bridge message")
            return
        }

        val action = msg.optString("action")
        val cbId = msg.optString("cbId", "")
        when (action) {
            "isAvailable" -> resolve(replyProxy, cbId, JSONObject().put("available", isReady()))
            "setUserId" -> {
                val userId = msg.optString("userId")
                if (isReady() && userId.isNotBlank()) syncUserId(userId)
                resolve(replyProxy, cbId, JSONObject().put("ok", true))
            }
            "getOfferings" -> getOfferings(replyProxy, cbId)
            "purchase" -> purchase(replyProxy, cbId, msg.optString("packageId"))
            "presentPaywall" -> presentPaywall(
                replyProxy,
                cbId,
                msg.optBoolean("ifNeeded"),
                msg.optString("entitlementId", DEFAULT_ENTITLEMENT_ID),
            )
            "restore" -> restore(replyProxy, cbId)
            "getCustomerInfo" -> getCustomerInfo(replyProxy, cbId)
            else -> resolveError(replyProxy, cbId, "unknown_action:$action")
        }
    }

    private fun isReady(): Boolean = try {
        Purchases.isConfigured
    } catch (_: Throwable) {
        false
    }

    private fun syncUserId(userId: String) {
        try {
            Purchases.sharedInstance.logInWith(
                userId,
                onError = { err -> Log.w(TAG, "logIn error: ${err.message}") },
                onSuccess = { _, _ -> },
            )
        } catch (t: Throwable) {
            Log.w(TAG, "logIn threw", t)
        }
    }

    private fun getOfferings(replyProxy: JavaScriptReplyProxy, cbId: String) {
        if (!ensureReady(replyProxy, cbId)) return
        Purchases.sharedInstance.getOfferingsWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { offerings -> resolve(replyProxy, cbId, offeringsToJson(offerings)) },
        )
    }

    private fun purchase(replyProxy: JavaScriptReplyProxy, cbId: String, packageIdentifier: String) {
        if (!ensureReady(replyProxy, cbId)) return
        val activity = activityRef.get()
        if (activity == null) {
            resolveError(replyProxy, cbId, "activity_unavailable")
            return
        }
        if (packageIdentifier.isBlank()) {
            resolveError(replyProxy, cbId, "package_id_required")
            return
        }
        Purchases.sharedInstance.getOfferingsWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { offerings ->
                val pkg = findPackage(offerings, packageIdentifier)
                if (pkg == null) {
                    resolveError(replyProxy, cbId, "package_not_found:$packageIdentifier")
                    return@getOfferingsWith
                }
                Purchases.sharedInstance.purchaseWith(
                    com.revenuecat.purchases.PurchaseParams.Builder(activity, pkg).build(),
                    onError = { err, userCancelled ->
                        sendRaw(
                            replyProxy, cbId,
                            JSONObject()
                                .put("ok", false)
                                .put("userCancelled", userCancelled)
                                .put("error", err.message ?: "purchase_failed")
                                .put("code", err.code.code),
                        )
                    },
                    onSuccess = { _, customerInfo ->
                        sendRaw(
                            replyProxy, cbId,
                            JSONObject().put("ok", true).put("customerInfo", customerInfoToJson(customerInfo)),
                        )
                    },
                )
            },
        )
    }

    private fun presentPaywall(
        replyProxy: JavaScriptReplyProxy,
        cbId: String,
        ifNeeded: Boolean,
        entitlementId: String,
    ) {
        if (!ensureReady(replyProxy, cbId)) return
        val launcher = paywallLauncher
        if (launcher == null) {
            resolveError(replyProxy, cbId, "paywall_launcher_unavailable")
            return
        }
        if (pendingPaywallReply != null) {
            resolveError(replyProxy, cbId, "paywall_already_presenting")
            return
        }
        pendingPaywallReply = replyProxy to cbId
        try {
            if (ifNeeded && entitlementId.isNotBlank()) {
                launcher.launchIfNeeded(entitlementId)
            } else {
                launcher.launch()
            }
        } catch (t: Throwable) {
            pendingPaywallReply = null
            resolveError(replyProxy, cbId, t.message ?: "paywall_launch_failed")
        }
    }

    private fun restore(replyProxy: JavaScriptReplyProxy, cbId: String) {
        if (!ensureReady(replyProxy, cbId)) return
        Purchases.sharedInstance.restorePurchasesWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { info -> resolve(replyProxy, cbId, customerInfoToJson(info)) },
        )
    }

    private fun getCustomerInfo(replyProxy: JavaScriptReplyProxy, cbId: String) {
        if (!ensureReady(replyProxy, cbId)) return
        Purchases.sharedInstance.getCustomerInfoWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { info -> resolve(replyProxy, cbId, customerInfoToJson(info)) },
        )
    }

    private fun ensureReady(replyProxy: JavaScriptReplyProxy, cbId: String): Boolean {
        if (!isReady()) {
            resolveError(replyProxy, cbId, "billing_unavailable")
            return false
        }
        return true
    }

    private fun findPackage(offerings: Offerings, identifier: String): Package? {
        offerings.current?.availablePackages
            ?.firstOrNull { it.identifier == identifier }
            ?.let { return it }
        for ((_, off) in offerings.all) {
            off.availablePackages.firstOrNull { it.identifier == identifier }
                ?.let { return it }
        }
        return null
    }

    private fun offeringsToJson(offerings: Offerings): JSONObject {
        val arr = JSONArray()
        offerings.current?.availablePackages?.forEach { pkg -> arr.put(packageToJson(pkg)) }
        return JSONObject()
            .put("currentOfferingId", offerings.current?.identifier)
            .put("packages", arr)
    }

    private fun packageToJson(pkg: Package): JSONObject {
        val product = pkg.product
        return JSONObject()
            .put("identifier", pkg.identifier)
            .put("packageType", pkg.packageType.toString())
            .put("productId", product.id)
            .put("title", product.title)
            .put("description", product.description)
            .put("priceString", product.price.formatted)
            .put("priceAmountMicros", product.price.amountMicros)
            .put("currencyCode", product.price.currencyCode)
    }

    private fun customerInfoToJson(info: CustomerInfo): JSONObject {
        val activeArr = JSONArray()
        info.entitlements.active.keys.forEach { activeArr.put(it) }
        return JSONObject()
            .put("originalAppUserId", info.originalAppUserId)
            .put("activeEntitlements", activeArr)
            .put("isPremium", info.entitlements.active.isNotEmpty())
    }

    private fun paywallResultToJson(result: PaywallResult): JSONObject = when (result) {
        is PaywallResult.Purchased -> JSONObject().put("result", "PURCHASED")
        is PaywallResult.Restored -> JSONObject().put("result", "RESTORED")
        PaywallResult.Cancelled -> JSONObject().put("result", "CANCELLED")
        is PaywallResult.Error -> JSONObject()
            .put("result", "ERROR")
            .put("error", result.error.message ?: "paywall_error")
    }

    private fun resolve(replyProxy: JavaScriptReplyProxy, cbId: String, data: JSONObject) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", true).put("data", data))
    }

    private fun resolvePurchasesError(replyProxy: JavaScriptReplyProxy, cbId: String, err: PurchasesError) {
        sendRaw(
            replyProxy, cbId,
            JSONObject().put("ok", false).put("error", err.message ?: "unknown_error").put("code", err.code.code),
        )
    }

    private fun resolveError(replyProxy: JavaScriptReplyProxy, cbId: String, message: String) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", false).put("error", message))
    }

    private fun sendRaw(replyProxy: JavaScriptReplyProxy, cbId: String, payload: JSONObject) {
        if (!payload.has("cbId")) payload.put("cbId", cbId)
        val webView = webViewRef.get() ?: return
        webView.post {
            try {
                replyProxy.postMessage(payload.toString())
            } catch (t: Throwable) {
                Log.w(TAG, "postMessage failed", t)
            }
        }
    }

    companion object {
        private const val TAG = "BillingBridge"
        const val JS_OBJECT_NAME = "AmyNestBillingNative"
        const val DEFAULT_ENTITLEMENT_ID = "premium"

        const val RC_API_KEY = "goog_wswrltSsrqhqrsQrVvOPavTIzMA"

        private val ALLOWED_ORIGINS: Set<String> = setOf(
            "https://amynest.in",
            "https://www.amynest.in",
        )

        fun installOn(activity: Activity, webView: WebView): BillingBridge? {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                Log.w(TAG, "WebMessageListener unsupported — billing bridge disabled")
                return null
            }
            val bridge = BillingBridge(activity, webView)
            return try {
                WebViewCompat.addWebMessageListener(
                    webView,
                    JS_OBJECT_NAME,
                    ALLOWED_ORIGINS,
                ) { _: WebView, message: WebMessageCompat,
                    sourceOrigin: Uri, _: Boolean,
                    replyProxy: JavaScriptReplyProxy ->
                    val data = message.data ?: return@addWebMessageListener
                    bridge.handleMessage(data, sourceOrigin, replyProxy)
                }
                Log.d(TAG, "Billing bridge installed (origins=$ALLOWED_ORIGINS)")
                bridge
            } catch (t: Throwable) {
                Log.e(TAG, "addWebMessageListener failed", t)
                null
            }
        }
    }
}
