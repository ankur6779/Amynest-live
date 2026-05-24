package com.amynest.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ServiceWorkerController
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallActivityLauncher
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResult
import com.revenuecat.purchases.ui.revenuecatui.activity.PaywallResultHandler
import org.json.JSONObject

private const val TAG = "MainActivity"
private const val BASE_URL = "https://www.amynest.in"

/**
 * MainActivity — full-screen WebView wrapper for https://amynest.in.
 *
 * Key responsibilities:
 *  1. Renders the PWA in a full-screen [WebView] (no address bar, no Chrome UI).
 *
 *  2. Installs [PushBridge] so the web page can request/receive FCM tokens.
 *
 *  3. Handles FCM deep-link taps (cold start + warm start via [onNewIntent]):
 *       - Navigates the WebView to the correct SPA route.
 *       - Calls `window.onNotificationTap(deepLink, category)` after the page
 *         loads so the web layer can show a "Opened from notification" toast
 *         and fire analytics.
 *
 *  4. Requests POST_NOTIFICATIONS, location, and microphone on cold start
 *     (Android system dialogs), and re-requests when the web page calls
 *     geolocation / getUserMedia via [WebChromeClient].
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var pushBridge: PushBridge
    private var billingBridge: BillingBridge? = null
    private var paywallLauncher: PaywallActivityLauncher? = null

    /** Notification tap payload waiting for onPageFinished to deliver to the web page. */
    private var pendingNotifDeepLink: String? = null
    private var pendingNotifCategory: String? = null

    /** Pending WebView permission callbacks (mic / geolocation). */
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null

    // ── Permission launchers ─────────────────────────────────────────────────

    private val notifPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            Log.d(TAG, "Notification permission result: $granted")
            pushBridge.setPermission(granted)
            askLocationAndMicPermission()
        }

    /** Reactive mic / geolocation prompts from WebChromeClient. */
    private val webPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            val req = pendingPermissionRequest
            val geoCb = pendingGeoCallback
            val geoOrigin = pendingGeoOrigin
            pendingPermissionRequest = null
            pendingGeoCallback = null
            pendingGeoOrigin = null

            if (req != null) {
                val allGranted = granted.values.all { it }
                if (allGranted) req.grant(req.resources) else req.deny()
            }
            if (geoCb != null && geoOrigin != null) {
                val allowed = granted[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                    granted[Manifest.permission.ACCESS_COARSE_LOCATION] == true
                geoCb.invoke(geoOrigin, allowed, false)
            }
        }

    /** Proactive startup location + microphone (system dialog on first install). */
    private val startupPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ ->
            /* WebChromeClient handles follow-up when web features run. */
        }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        hideSystemChrome()

        // Capture notification tap extras BEFORE building the WebView so the
        // document-start JS injection and URL construction can use them.
        pendingNotifDeepLink = intent?.getStringExtra("deepLink")
        pendingNotifCategory = intent?.getStringExtra("notifCategory")

        webView = WebView(this).also { wv ->
            wv.id = View.generateViewId()
            wv.overScrollMode = View.OVER_SCROLL_NEVER
            wv.isVerticalScrollBarEnabled = false
            wv.isHorizontalScrollBarEnabled = false

            configureWebView(wv)
        }
        setContentView(webView)

        billingBridge = BillingBridge.installOn(this, webView)
        if (billingBridge != null) {
            paywallLauncher = PaywallActivityLauncher(
                this,
                object : PaywallResultHandler {
                    override fun onActivityResult(result: PaywallResult) {
                        billingBridge?.onPaywallResult(result)
                    }
                },
            )
            billingBridge?.attachPaywallLauncher(paywallLauncher!!)
        } else {
            Log.w(TAG, "Billing bridge not installed — in-app purchases unavailable")
        }

        pushBridge = PushBridge(
            context = this,
            permissionRequester = { askNotificationPermission() },
        )
        pushBridge.install(webView)

        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token != null && pushBridge.getToken() == null) {
                pushBridge.saveToken(token)
                Log.d(TAG, "FCM token bootstrapped from FirebaseMessaging API")
            }
        }

        askNotificationPermission()

        val launchUrl = buildLaunchUrl(intent)
        webView.loadUrl(launchUrl)
        Log.d(TAG, "Loading: $launchUrl (wrapper version=${PushBridge.WRAPPER_VERSION})")
    }

    override fun onResume() {
        super.onResume()
        if (!::pushBridge.isInitialized) return
        val granted = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            true
        } else {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        }
        pushBridge.setPermission(granted)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        val viewUrl = intentViewUrl(intent)
        if (viewUrl != null) {
            Log.d(TAG, "App link navigation (onNewIntent) → $viewUrl")
            webView.post { webView.loadUrl(viewUrl) }
            return
        }

        val deepLink = intent.getStringExtra("deepLink") ?: return
        if (deepLink.isBlank()) return

        val category = intent.getStringExtra("notifCategory") ?: "routine"
        val url = deepLinkToUrl(deepLink)
        Log.d(TAG, "Deep link navigation (onNewIntent) → $url category=$category")

        // App is already running — call onNotificationTap directly
        val js = buildNotifTapJs(deepLink, category)
        webView.post {
            // Navigate first, then signal the web page
            webView.loadUrl(url)
            webView.postDelayed({ webView.evaluateJavascript(js, null) }, 400)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    // ── WebView configuration ────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(wv: WebView) {
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            allowContentAccess = true
            loadsImagesAutomatically = true
            allowFileAccess = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            userAgentString = (userAgentString ?: "") + " AmyNestAndroid/1.0"

            // Optimal PWA scroll settings
            useWideViewPort = true
            loadWithOverviewMode = true
            displayZoomControls = false
            builtInZoomControls = false
            setSupportZoom(false)
            textZoom = 100
            setGeolocationEnabled(true)
            
            // Performance
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                mediaPlaybackRequiresUserGesture = false
            }
        }

        CookieManager.getInstance().setAcceptThirdPartyCookies(wv, true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController.getInstance()
                .serviceWorkerWebSettings
                .cacheMode = WebSettings.LOAD_NO_CACHE
        }
        
        wv.overScrollMode = View.OVER_SCROLL_NEVER
        wv.isVerticalScrollBarEnabled = false
        wv.isHorizontalScrollBarEnabled = false

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url ?: return false
                val scheme = url.scheme?.lowercase() ?: return false
                // Pure WebView — keep all http(s) navigation inside the app.
                if (scheme == "http" || scheme == "https") {
                    view.loadUrl(url.toString())
                    return true
                }
                if (scheme == "mailto" || scheme == "tel" || scheme == "sms") {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: ActivityNotFoundException) { /* ignore */ }
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }

            /**
             * Once the page finishes loading, deliver the pending notification tap
             * signal to the web app. This covers the cold-start case where the web
             * page was not mounted when the notification was tapped.
             */
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)

                view.evaluateJavascript(
                    "window.dispatchEvent(new Event('amynest-billing-bridge-ready'));",
                    null,
                )

                val dl = pendingNotifDeepLink ?: return
                val cat = pendingNotifCategory ?: "routine"
                // Clear so subsequent page loads don't re-fire.
                pendingNotifDeepLink = null
                pendingNotifCategory = null
                val js = buildNotifTapJs(dl, cat)
                view.evaluateJavascript(js, null)
                Log.d(TAG, "Delivered onNotificationTap → deepLink=$dl category=$cat")
            }
        }

        wv.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val androidPerms = mutableListOf<String>()
                for (resource in request.resources) {
                    when (resource) {
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                            androidPerms.add(Manifest.permission.CAMERA)
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                            androidPerms.add(Manifest.permission.RECORD_AUDIO)
                    }
                }
                if (androidPerms.isEmpty()) {
                    request.grant(request.resources)
                    return
                }
                val missing = androidPerms.filter {
                    ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        it,
                    ) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    request.grant(request.resources)
                } else {
                    pendingPermissionRequest = request
                    webPermissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                val needed = arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                )
                val missing = needed.filter {
                    ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        it,
                    ) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    webPermissionLauncher.launch(missing.toTypedArray())
                }
            }
        }

        WebView.setWebContentsDebuggingEnabled(true)
    }

    // ── URL construction ─────────────────────────────────────────────────────

    private fun buildLaunchUrl(intent: Intent?): String {
        val deepLink = intent?.getStringExtra("deepLink")
        if (!deepLink.isNullOrBlank()) return deepLinkToUrl(deepLink)
        val viewUrl = intentViewUrl(intent)
        if (viewUrl != null) return viewUrl
        return "$BASE_URL?v=${System.currentTimeMillis()}"
    }

    /** https://www.amynest.in/... or https://amynest.in/... from email / App Links. */
    private fun intentViewUrl(intent: Intent?): String? {
        val data = intent?.data ?: return null
        if (!isAllowedAmyNestHttps(data)) return null
        return data.toString()
    }

    private fun isAllowedAmyNestHttps(uri: Uri): Boolean {
        if (uri.scheme?.lowercase() != "https") return false
        val host = uri.host?.lowercase() ?: return false
        return host == "www.amynest.in" || host == "amynest.in"
    }

    /**
     * Convert a server-side deepLink path (e.g. "/routine/3", "/meals") to a
     * full URL. Uses hash-fragment routing so the WebView doesn't make an HTTP
     * request for the path — the SPA router handles it client-side.
     */
    private fun deepLinkToUrl(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val fragment = if (path.startsWith("/")) path else "/$path"
        return "$BASE_URL/#$fragment"
    }

    /**
     * Build a JS snippet that calls `window.onNotificationTap(deepLink, category)`
     * if the function is defined (i.e. the web app has mounted).
     */
    private fun buildNotifTapJs(deepLink: String, category: String): String =
        "if(typeof window.onNotificationTap==='function'){" +
            "window.onNotificationTap(${JSONObject.quote(deepLink)},${JSONObject.quote(category)});" +
        "}"

    // ── System chrome ────────────────────────────────────────────────────────

    private fun hideSystemChrome() {
        supportActionBar?.hide()
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
    }

    // ── Notification permission ──────────────────────────────────────────────

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            pushBridge.setPermission(true)
            askLocationAndMicPermission()
            return
        }
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            pushBridge.setPermission(true)
            askLocationAndMicPermission()
            return
        }
        notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    /** Request location + microphone on cold start (system dialogs). */
    private fun askLocationAndMicPermission() {
        val needed = buildList {
            if (ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                add(Manifest.permission.ACCESS_FINE_LOCATION)
            }
            if (ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO,
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                add(Manifest.permission.RECORD_AUDIO)
            }
        }
        if (needed.isNotEmpty()) {
            startupPermissionLauncher.launch(needed.toTypedArray())
        }
    }
}
