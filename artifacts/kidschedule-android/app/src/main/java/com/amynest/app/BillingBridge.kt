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
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference

/**
 * Google Play Billing (via RevenueCat) bridge for the kidschedule WebView.
 *
 * SECURITY: This bridge is installed via [WebViewCompat.addWebMessageListener]
 * with a strict allowed-origin rule pinned to our wrapper URL — so even if a
 * third-party iframe is loaded inside the WebView, it CANNOT call these
 * methods. Each invocation also re-validates `sourceOrigin` against the
 * trusted origin as defense-in-depth.
 *
 * On the JS side this surfaces as `window.AmyNestBillingNative` with
 * `postMessage(json)` and an `onmessage` listener. The web app uses a
 * promise/callbackId registry (see `src/lib/native-billing.ts`).
 */
class BillingBridge(
    activity: Activity,
    webView: WebView,
    private val trustedOrigin: String,
) {
    private val activityRef = WeakReference(activity)
    private val webViewRef = WeakReference(webView)

    fun handleMessage(rawMessage: String, sourceOrigin: Uri, replyProxy: JavaScriptReplyProxy) {
        // Defense-in-depth: even though addWebMessageListener already enforces
        // allowedOriginRules, re-check the sourceOrigin per message.
        if (!originMatches(sourceOrigin)) {
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

    private fun originMatches(sourceOrigin: Uri): Boolean {
        val src = sourceOrigin.toString().trimEnd('/')
        val trusted = trustedOrigin.trimEnd('/')
        return src.equals(trusted, ignoreCase = true)
    }

    private fun syncUserId(userId: String) {
        try {
            Purchases.sharedInstance.logInWith(
                userId,
                onError = { err -> Log.w(TAG, "logIn error: ${err.message}") },
                onSuccess = { _, _ -> /* ok */ },
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
                        val payload = JSONObject()
                            .put("ok", false)
                            .put("userCancelled", userCancelled)
                            .put("error", err.message ?: "purchase_failed")
                            .put("code", err.code.code)
                        sendRaw(replyProxy, cbId, payload)
                    },
                    onSuccess = { _, customerInfo ->
                        val payload = JSONObject()
                            .put("ok", true)
                            .put("customerInfo", customerInfoToJson(customerInfo))
                        sendRaw(replyProxy, cbId, payload)
                    },
                )
            },
        )
    }

    private fun restore(replyProxy: JavaScriptReplyProxy, cbId: String) {
        if (!ensureReady(replyProxy, cbId)) return
        Purchases.sharedInstance.restorePurchasesWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { customerInfo -> resolve(replyProxy, cbId, customerInfoToJson(customerInfo)) },
        )
    }

    private fun getCustomerInfo(replyProxy: JavaScriptReplyProxy, cbId: String) {
        if (!ensureReady(replyProxy, cbId)) return
        Purchases.sharedInstance.getCustomerInfoWith(
            onError = { err -> resolvePurchasesError(replyProxy, cbId, err) },
            onSuccess = { customerInfo -> resolve(replyProxy, cbId, customerInfoToJson(customerInfo)) },
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
        val packagesJson = JSONArray()
        offerings.current?.availablePackages?.forEach { pkg ->
            packagesJson.put(packageToJson(pkg))
        }
        return JSONObject()
            .put("currentOfferingId", offerings.current?.identifier)
            .put("packages", packagesJson)
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

    private fun resolve(replyProxy: JavaScriptReplyProxy, cbId: String, data: JSONObject) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", true).put("data", data))
    }

    private fun resolvePurchasesError(replyProxy: JavaScriptReplyProxy, cbId: String, err: PurchasesError) {
        sendRaw(
            replyProxy,
            cbId,
            JSONObject()
                .put("ok", false)
                .put("error", err.message ?: "unknown_error")
                .put("code", err.code.code),
        )
    }

    private fun resolveError(replyProxy: JavaScriptReplyProxy, cbId: String, message: String) {
        sendRaw(replyProxy, cbId, JSONObject().put("ok", false).put("error", message))
    }

    private fun sendRaw(replyProxy: JavaScriptReplyProxy, cbId: String, payload: JSONObject) {
        // Ensure the cbId is always echoed so the JS side can resolve the
        // right pending promise even if the worker thread reorders responses.
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

        /**
         * Install the bridge with a strict allowed-origin rule. Returns true
         * if the listener was installed, false if the WebView runtime on the
         * device does not support [WebViewFeature.WEB_MESSAGE_LISTENER]
         * (Android System WebView pre-2020) — in that case the bridge stays
         * uninstalled and the web app falls back to its non-wrapper UI.
         */
        fun installOn(
            activity: Activity,
            webView: WebView,
            trustedOriginUrl: String,
        ): Boolean {
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                Log.w(TAG, "WebMessageListener unsupported — bridge disabled")
                return false
            }
            val originRule = toOriginRule(trustedOriginUrl) ?: run {
                Log.w(TAG, "could not derive origin from $trustedOriginUrl — bridge disabled")
                return false
            }
            val bridge = BillingBridge(activity, webView, originRule)
            return try {
                WebViewCompat.addWebMessageListener(
                    webView,
                    JS_OBJECT_NAME,
                    setOf(originRule),
                ) { _: WebView, message: WebMessageCompat,
                    sourceOrigin: Uri, _: Boolean,
                    replyProxy: JavaScriptReplyProxy ->
                    val data = message.data ?: return@addWebMessageListener
                    bridge.handleMessage(data, sourceOrigin, replyProxy)
                }
                true
            } catch (t: Throwable) {
                Log.e(TAG, "addWebMessageListener failed", t)
                false
            }
        }

        /** Strip path/query/fragment so the rule is `scheme://host[:port]`. */
        private fun toOriginRule(url: String): String? {
            val uri = try {
                Uri.parse(url)
            } catch (_: Throwable) {
                return null
            }
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host ?: return null
            val portPart = if (uri.port == -1) "" else ":${uri.port}"
            return "$scheme://$host$portPart"
        }
    }
}
