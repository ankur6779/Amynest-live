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
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ServiceWorkerController
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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
    private var authBridge: AuthBridge? = null
    private var paywallLauncher: PaywallActivityLauncher? = null

    /** Notification tap payload waiting for onPageFinished to deliver to the web page. */
    private var pendingNotifDeepLink: String? = null
    private var pendingNotifCategory: String? = null

    /** After a wrapper upgrade, purge web caches once the first page loads. */
    private var pendingWebCachePurge = false

    /** Pending WebView permission callbacks (mic / geolocation). */
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingMicPermissionCallbackId: String? = null

    private val micPermissionPrefs by lazy {
        getSharedPreferences("amynest_permissions", MODE_PRIVATE)
    }

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

            recordMicrophonePermissionResultIfPresent(granted)
            if (req != null) {
                val requiredPerms = androidPermissionsForWebResources(req.resources)
                val allGranted = requiredPerms.all { isPermissionGranted(it) }
                Log.d(
                    TAG,
                    "Web permission result resources=${req.resources.joinToString()} " +
                        "requested=${requiredPerms.joinToString()} result=$granted realAllGranted=$allGranted",
                )
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
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            /* WebChromeClient handles follow-up when web features run. */
            recordMicrophonePermissionResultIfPresent(granted)
            Log.d(TAG, "Startup permission result mic=${microphonePermissionStatus()}")
            broadcastMicrophonePermissionStatus("startup")
        }

    /** Explicit microphone requests from the web app before Speech Coach starts recording. */
    private val micPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            recordMicrophonePermissionResult(granted)
            val callbackId = pendingMicPermissionCallbackId
            pendingMicPermissionCallbackId = null
            val realGranted = hasRecordAudioPermission()
            val status = microphonePermissionStatus()
            Log.d(
                TAG,
                "Native mic permission callback granted=$granted realGranted=$realGranted status=$status callbackId=$callbackId",
            )
            dispatchMicrophonePermissionResult(callbackId, status, "native-request")
        }

    /** Native Google account picker — result forwarded to [AuthBridge]. */
    private val googleSignInLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            authBridge?.onGoogleSignInResult(result.resultCode, result.data)
        }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)

        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        // Capture notification tap extras BEFORE building the WebView so the
        // document-start JS injection and URL construction can use them.
        val (deepLink, category) = extractNotificationTapFromIntent(intent)
        pendingNotifDeepLink = deepLink
        pendingNotifCategory = category

        webView = WebView(this).also { wv ->
            wv.id = View.generateViewId()
            wv.overScrollMode = View.OVER_SCROLL_NEVER
            wv.isVerticalScrollBarEnabled = false
            wv.isHorizontalScrollBarEnabled = false

            configureWebView(wv)
        }
        setContentView(webView)

        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            applyWebSafeAreaInsets(insets)
            insets
        }
        ViewCompat.requestApplyInsets(webView)

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

        authBridge = AuthBridge.installOn(this, webView).also { bridge ->
            bridge.attachSignInLauncher { intent -> googleSignInLauncher.launch(intent) }
        }
        Log.d(TAG, "AuthBridge installed for Google Sign-In (see logcat GoogleSignInConfig on first sign-in)")

        pushBridge = PushBridge(
            context = this,
            permissionRequester = { askNotificationPermission() },
        )
        pushBridge.install(webView)
        installMicrophoneBridge(webView)

        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            if (token != null && pushBridge.getToken() == null) {
                pushBridge.saveToken(token)
                Log.d(TAG, "FCM token bootstrapped from FirebaseMessaging API")
            }
        }

        askNotificationPermission()

        clearStaleWebCacheIfNeeded(webView)

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
        val micStatus = microphonePermissionStatus()
        Log.d(TAG, "onResume permission sync notifications=$granted microphone=$micStatus")
        broadcastMicrophonePermissionStatus("resume")
        authBridge?.deliverPendingGoogleAuthIfAny()
        authBridge?.deliverPendingFacebookAuthIfAny()
        webView.postDelayed({ authBridge?.deliverPendingGoogleAuthIfAny() }, 200)
        webView.postDelayed({ authBridge?.deliverPendingFacebookAuthIfAny() }, 200)
        webView.postDelayed({ authBridge?.deliverPendingGoogleAuthIfAny() }, 600)
        webView.postDelayed({ authBridge?.deliverPendingFacebookAuthIfAny() }, 600)
        webView.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('amynest-oauth-resume'));",
                null,
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        authBridge?.onFacebookActivityResult(requestCode, resultCode, data)
        super.onActivityResult(requestCode, resultCode, data)
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

        val (deepLink, category) = extractNotificationTapFromIntent(intent)
        if (deepLink.isNullOrBlank() && category.isNullOrBlank()) return

        val resolvedDeepLink = deepLink?.takeIf { it.isNotBlank() } ?: ""
        val resolvedCategory = category?.takeIf { it.isNotBlank() } ?: "routine"
        val url = deepLinkToUrl(resolvedDeepLink, resolvedCategory)
        Log.d(TAG, "Deep link navigation (onNewIntent) → $url category=$resolvedCategory")

        // App is already running — call onNotificationTap directly
        val js = buildNotifTapJs(resolvedDeepLink, resolvedCategory)
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

                ViewCompat.getRootWindowInsets(view)?.let { applyWebSafeAreaInsets(it) }

                view.evaluateJavascript(
                    "window.dispatchEvent(new Event('amynest-billing-bridge-ready'));" +
                        "window.dispatchEvent(new Event('amynest-auth-bridge-ready'));",
                    null,
                )
                if (pendingWebCachePurge) {
                    pendingWebCachePurge = false
                    purgeWebCachesInPage(view)
                }
                authBridge?.deliverPendingGoogleAuthIfAny()
                authBridge?.deliverPendingFacebookAuthIfAny()

                val dl = pendingNotifDeepLink
                val cat = pendingNotifCategory ?: "routine"
                // Clear so subsequent page loads don't re-fire.
                pendingNotifDeepLink = null
                pendingNotifCategory = null
                if (dl.isNullOrBlank() && cat.isBlank()) return
                val js = buildNotifTapJs(dl ?: "", cat)
                view.evaluateJavascript(js, null)
                Log.d(TAG, "Delivered onNotificationTap → deepLink=${dl ?: ""} category=$cat")
            }
        }

        wv.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val androidPerms = androidPermissionsForWebResources(request.resources)
                Log.d(
                    TAG,
                    "WebView permission request resources=${request.resources.joinToString()} " +
                        "androidPerms=${androidPerms.joinToString()} mic=${microphonePermissionStatus()}",
                )
                if (androidPerms.isEmpty()) {
                    request.grant(request.resources)
                    return
                }
                val missing = androidPerms.filter {
                    !isPermissionGranted(it)
                }
                if (missing.isEmpty()) {
                    Log.d(TAG, "WebView permission request granted immediately from real runtime state")
                    request.grant(request.resources)
                } else {
                    if (pendingPermissionRequest != null || pendingGeoCallback != null) {
                        Log.w(TAG, "Denying overlapping WebView permission request; another request is pending")
                        request.deny()
                        return
                    }
                    pendingPermissionRequest = request
                    Log.d(TAG, "Launching WebView runtime permission request missing=${missing.joinToString()}")
                    webPermissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (pendingPermissionRequest === request) pendingPermissionRequest = null
                Log.d(TAG, "WebView permission request canceled resources=${request.resources.joinToString()}")
                request.deny()
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
        val (deepLink, category) = extractNotificationTapFromIntent(intent)
        if (!deepLink.isNullOrBlank() || !category.isNullOrBlank()) {
            return deepLinkToUrl(
                deepLink?.takeIf { it.isNotBlank() } ?: "",
                category?.takeIf { it.isNotBlank() },
            )
        }
        val viewUrl = intentViewUrl(intent)
        if (viewUrl != null) return viewUrl
        return "$BASE_URL?v=${PushBridge.WRAPPER_VERSION}-${System.currentTimeMillis()}"
    }

    /**
     * Play Store WebView loads live https://www.amynest.in — not bundled JS.
     * After a wrapper upgrade, clear native + in-page caches so users pick up
     * the latest onboarding and other web deploys instead of stale chunks.
     */
    private fun clearStaleWebCacheIfNeeded(wv: WebView) {
        val prefs = getSharedPreferences("amynest_webview", MODE_PRIVATE)
        val lastVersion = prefs.getString("wrapper_version", null)
        if (lastVersion == PushBridge.WRAPPER_VERSION) return

        wv.clearCache(true)
        wv.clearHistory()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        prefs.edit().putString("wrapper_version", PushBridge.WRAPPER_VERSION).apply()
        pendingWebCachePurge = true
        Log.d(
            TAG,
            "Cleared WebView cache for wrapper upgrade ($lastVersion → ${PushBridge.WRAPPER_VERSION})",
        )
    }

    private fun purgeWebCachesInPage(view: WebView) {
        view.evaluateJavascript(
            "(function(){" +
                "try{" +
                "if('serviceWorker'in navigator){" +
                "navigator.serviceWorker.getRegistrations().then(function(r){" +
                "r.forEach(function(x){x.unregister();});" +
                "});" +
                "}" +
                "if(window.caches){" +
                "caches.keys().then(function(k){k.forEach(function(n){caches.delete(n);});});" +
                "}" +
                "}catch(e){}" +
            "})();",
            null,
        )
        Log.d(TAG, "Requested in-page SW/cache purge after wrapper upgrade")
    }

    /**
     * Read deep-link + category from our PendingIntent extras or from FCM data
     * payload keys when the system tray notification was auto-displayed by FCM.
     */
    private fun extractNotificationTapFromIntent(intent: Intent?): Pair<String?, String?> {
        if (intent == null) return null to null
        var deepLink = intent.getStringExtra("deepLink")
        var category = intent.getStringExtra("notifCategory") ?: intent.getStringExtra("category")
        val extras = intent.extras
        if (extras != null) {
            if (deepLink.isNullOrBlank()) {
                deepLink = extras.getString("deepLink") ?: extras.getString("url")
            }
            if (category.isNullOrBlank()) {
                category = extras.getString("category") ?: extras.getString("notifCategory")
            }
        }
        return deepLink to category
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
     * Convert a server-side deepLink path (e.g. "/routines/3", "/meals") to a
     * full URL. Uses path-based routing so wouter handles navigation client-side.
     */
    private fun deepLinkToUrl(path: String, category: String? = null): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val normalized = when {
            path.startsWith("/") -> path
            path.isNotBlank() -> "/$path"
            else -> NotifCategory.from(category).fallbackDeepLink
        }
        return "$BASE_URL$normalized"
    }

    /**
     * Build a JS snippet that calls `window.onNotificationTap(deepLink, category)`
     * if the function is defined (i.e. the web app has mounted).
     */
    private fun buildNotifTapJs(deepLink: String, category: String): String =
        "if(typeof window.onNotificationTap==='function'){" +
            "window.onNotificationTap(${JSONObject.quote(deepLink)},${JSONObject.quote(category)});" +
        "}"

    // ── Microphone permission bridge ─────────────────────────────────────────

    @SuppressLint("JavascriptInterface")
    private fun installMicrophoneBridge(wv: WebView) {
        wv.addJavascriptInterface(AndroidMicrophoneInterface(), MIC_JS_OBJECT_NAME)
        wv.evaluateJavascript(
            "window.__AMYNEST_WRAPPER='android';" +
                "window.dispatchEvent(new Event('amynest-microphone-bridge-ready'));",
            null,
        )
        Log.d(TAG, "Android microphone permission bridge installed")
    }

    inner class AndroidMicrophoneInterface {
        @JavascriptInterface
        fun getPermissionStatus(): String {
            val status = microphonePermissionStatus()
            Log.d(TAG, "JS getPermissionStatus microphone=$status")
            return status
        }

        @JavascriptInterface
        fun requestPermission(callbackId: String?): String {
            val status = microphonePermissionStatus()
            Log.d(TAG, "JS requestPermission callbackId=$callbackId current=$status")
            if (status == MIC_STATUS_GRANTED || status == MIC_STATUS_BLOCKED) {
                return status
            }
            if (pendingMicPermissionCallbackId != null) {
                Log.w(TAG, "JS requestPermission ignored because request is already pending")
                return MIC_STATUS_BUSY
            }
            pendingMicPermissionCallbackId = callbackId?.takeIf { it.isNotBlank() }
            runOnUiThread {
                Log.d(TAG, "Launching native RECORD_AUDIO permission request")
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
            return MIC_STATUS_REQUESTED
        }

        @JavascriptInterface
        fun openSettings() {
            Log.d(TAG, "JS openSettings for microphone")
            runOnUiThread { openAppSettings() }
        }
    }

    private fun androidPermissionsForWebResources(resources: Array<String>): List<String> {
        val perms = linkedSetOf<String>()
        for (resource in resources) {
            when (resource) {
                PermissionRequest.RESOURCE_VIDEO_CAPTURE -> perms.add(Manifest.permission.CAMERA)
                PermissionRequest.RESOURCE_AUDIO_CAPTURE -> perms.add(Manifest.permission.RECORD_AUDIO)
            }
        }
        return perms.toList()
    }

    private fun isPermissionGranted(permission: String): Boolean =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun hasRecordAudioPermission(): Boolean = isPermissionGranted(Manifest.permission.RECORD_AUDIO)

    private fun microphonePermissionStatus(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || hasRecordAudioPermission()) {
            clearMicrophoneDeniedState()
            return MIC_STATUS_GRANTED
        }
        if (micPermissionPrefs.getBoolean(MIC_PERMISSION_BLOCKED_KEY, false)) {
            return MIC_STATUS_BLOCKED
        }
        val requestedBefore = micPermissionPrefs.getBoolean(MIC_PERMISSION_REQUESTED_KEY, false)
        val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
            this,
            Manifest.permission.RECORD_AUDIO,
        )
        return when {
            shouldShowRationale -> MIC_STATUS_DENIED
            requestedBefore -> MIC_STATUS_DENIED
            else -> MIC_STATUS_PROMPT
        }
    }

    private fun recordMicrophonePermissionResultIfPresent(granted: Map<String, Boolean>) {
        if (!granted.containsKey(Manifest.permission.RECORD_AUDIO)) return
        recordMicrophonePermissionResult(hasRecordAudioPermission())
    }

    private fun recordMicrophonePermissionResult(granted: Boolean) {
        if (granted || hasRecordAudioPermission()) {
            clearMicrophoneDeniedState()
            return
        }
        val previousDenials = micPermissionPrefs.getInt(MIC_PERMISSION_DENIAL_COUNT_KEY, 0)
        val denialCount = previousDenials + 1
        val shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
            this,
            Manifest.permission.RECORD_AUDIO,
        )
        val blocked = denialCount >= 2 && !shouldShowRationale
        micPermissionPrefs.edit()
            .putBoolean(MIC_PERMISSION_REQUESTED_KEY, true)
            .putInt(MIC_PERMISSION_DENIAL_COUNT_KEY, denialCount)
            .putBoolean(MIC_PERMISSION_BLOCKED_KEY, blocked)
            .apply()
        Log.d(
            TAG,
            "Recorded mic denial count=$denialCount shouldShowRationale=$shouldShowRationale blocked=$blocked",
        )
    }

    private fun clearMicrophoneDeniedState() {
        micPermissionPrefs.edit()
            .putBoolean(MIC_PERMISSION_REQUESTED_KEY, true)
            .putInt(MIC_PERMISSION_DENIAL_COUNT_KEY, 0)
            .putBoolean(MIC_PERMISSION_BLOCKED_KEY, false)
            .apply()
    }

    private fun dispatchMicrophonePermissionResult(
        callbackId: String?,
        status: String,
        source: String,
    ) {
        val js =
            "(function(){" +
                "var detail={callbackId:${JSONObject.quote(callbackId ?: "")}," +
                "status:${JSONObject.quote(status)},source:${JSONObject.quote(source)}};" +
                "window.dispatchEvent(new CustomEvent('amynest-microphone-permission-result',{detail:detail}));" +
                "window.dispatchEvent(new CustomEvent('amynest-microphone-permission-changed',{detail:detail}));" +
            "})();"
        webView.post { webView.evaluateJavascript(js, null) }
    }

    private fun broadcastMicrophonePermissionStatus(source: String) {
        if (!::webView.isInitialized) return
        dispatchMicrophonePermissionResult(null, microphonePermissionStatus(), source)
    }

    private fun openAppSettings() {
        val uri = Uri.fromParts("package", packageName, null)
        val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri)
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            Log.w(TAG, "Unable to open app settings: ${e.message}")
        }
    }

    // ── System chrome ────────────────────────────────────────────────────────

    /** Keyboard inset + shell class only (no status/nav safe-area padding). */
    private fun applyWebSafeAreaInsets(insets: WindowInsetsCompat) {
        if (!::webView.isInitialized) return
        val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
        val imeBottomPx = ime.bottom.coerceAtLeast(0)
        val webViewHeight = webView.height.coerceAtLeast(0)
        val visibleHeightPx =
            if (imeBottomPx > 0 && webViewHeight > imeBottomPx) {
                webViewHeight - imeBottomPx
            } else if (webViewHeight > 0) {
                webViewHeight
            } else {
                0
            }
        val js =
            "(function(){" +
                "var r=document.documentElement;" +
                "r.style.setProperty('--auth-keyboard-inset-native','${imeBottomPx}px');" +
                (if (imeBottomPx > 0) {
                    "r.style.setProperty('--auth-keyboard-inset','${imeBottomPx}px');" +
                        (if (visibleHeightPx > 0) "r.style.setProperty('--vv-height','${visibleHeightPx}px');" else "")
                } else {
                    "r.style.removeProperty('--auth-keyboard-inset');" +
                        "r.style.removeProperty('--auth-keyboard-inset-native');" +
                        "r.style.removeProperty('--vv-height');"
                }) +
                "r.classList.add('amynest-android-shell','amynest-native-shell');" +
                "window.dispatchEvent(new CustomEvent('amynest-keyboard-inset'," +
                "{detail:{inset:${imeBottomPx},visibleHeight:${visibleHeightPx}}}));" +
            "})();"
        webView.post { webView.evaluateJavascript(js, null) }
    }

    private fun applyImmersiveFullscreen() {
        supportActionBar?.hide()
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyImmersiveFullscreen()
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
            if (needed.contains(Manifest.permission.RECORD_AUDIO)) {
                micPermissionPrefs.edit().putBoolean(MIC_PERMISSION_REQUESTED_KEY, true).apply()
            }
            Log.d(TAG, "Launching startup permissions: ${needed.joinToString()}")
            startupPermissionLauncher.launch(needed.toTypedArray())
        }
    }

    companion object {
        private const val MIC_JS_OBJECT_NAME = "AndroidMicrophone"
        private const val MIC_PERMISSION_REQUESTED_KEY = "record_audio_requested"
        private const val MIC_PERMISSION_DENIAL_COUNT_KEY = "record_audio_denial_count"
        private const val MIC_PERMISSION_BLOCKED_KEY = "record_audio_blocked"
        private const val MIC_STATUS_GRANTED = "granted"
        private const val MIC_STATUS_PROMPT = "prompt"
        private const val MIC_STATUS_DENIED = "denied"
        private const val MIC_STATUS_BLOCKED = "blocked"
        private const val MIC_STATUS_BUSY = "busy"
        private const val MIC_STATUS_REQUESTED = "requested"
    }
}
