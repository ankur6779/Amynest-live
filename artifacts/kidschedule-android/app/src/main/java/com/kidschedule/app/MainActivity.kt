package com.kidschedule.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.kidschedule.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var webView: WebView
    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var pushBridge: PushBridge

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null
    private var pendingGeoOrigin: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    // Deep-link queued from a notification tap that arrived before the
    // WebView finished loading. Drained in onPageFinished.
    private var pendingDeepLink: String? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        fileUploadCallback?.onReceiveValue(uris)
        fileUploadCallback = null
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { granted ->
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

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setTheme(R.style.Theme_KidSchedule)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        webView = binding.webview
        swipe = binding.swipeRefresh

        // Stash any deep-link from the notification tap that launched us so
        // we can route the WebView to it after the initial page loads.
        pendingDeepLink = extractDeepLink(intent)

        configureWebView()

        swipe.setOnRefreshListener { webView.reload() }

        binding.offlineRetry.setOnClickListener {
            if (isOnline()) {
                showWebView()
                webView.reload()
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.offlineLayout.visibility == View.VISIBLE && isOnline()) {
                    showWebView()
                    webView.reload()
                    return
                }
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            loadInitialUrl()
        }
    }

    private fun loadInitialUrl() {
        if (isOnline()) {
            showWebView()
            webView.loadUrl(BuildConfig.WRAPPER_URL)
        } else {
            showOffline()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        // Expose Google Play Billing (via RevenueCat) to the WebView using
        // WebViewCompat.addWebMessageListener with a strict allowed-origin
        // rule pinned to BuildConfig.WRAPPER_URL — so cross-origin iframes
        // CANNOT call the bridge. The web app probes
        // `window.AmyNestBillingNative` and uses postMessage / onmessage.
        BillingBridge.installOn(this, webView, BuildConfig.WRAPPER_URL)

        // Native FCM bridge — the web app inside the WebView cannot use the
        // Web Notification / PushManager APIs, so we expose the device's
        // native FCM token and Android 13+ POST_NOTIFICATIONS permission
        // helpers on `window.AmyNestPushNative`.
        pushBridge = PushBridge(this, webView)
        pushBridge.install()

        val s = webView.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.setSupportZoom(true)
        s.builtInZoomControls = true
        s.displayZoomControls = false
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.mediaPlaybackRequiresUserGesture = false
        s.allowFileAccess = false
        s.allowContentAccess = false
        s.javaScriptCanOpenWindowsAutomatically = true
        s.setGeolocationEnabled(true)
        s.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.userAgentString = "${s.userAgentString} KidScheduleAndroid/${BuildConfig.VERSION_NAME}"

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.setDownloadListener { url, _, contentDisposition, mimetype, _ ->
            try {
                val request = DownloadManager.Request(Uri.parse(url))
                request.setMimeType(mimetype)
                val fileName = URLUtil.guessFileName(url, contentDisposition, mimetype)
                request.addRequestHeader("cookie", CookieManager.getInstance().getCookie(url) ?: "")
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
            } catch (_: Exception) {
                openExternal(Uri.parse(url))
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val scheme = url.scheme?.lowercase() ?: return false
                if (scheme == "http" || scheme == "https") {
                    val wrapperHost = Uri.parse(BuildConfig.WRAPPER_URL).host
                    val targetHost = url.host
                    val sameOrigin = wrapperHost != null && targetHost != null &&
                        (targetHost.equals(wrapperHost, ignoreCase = true) ||
                            targetHost.endsWith(".$wrapperHost", ignoreCase = true))
                    if (sameOrigin) return false
                    openExternal(url)
                    return true
                }
                if (scheme == "intent") {
                    return handleIntentScheme(url.toString())
                }
                if (scheme == "mailto" || scheme == "tel" || scheme == "sms" ||
                    scheme == "market" || scheme == "whatsapp" ||
                    scheme == "geo" || scheme == "maps") {
                    openExternal(url)
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipe.isRefreshing = false
                drainPendingDeepLink()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    swipe.isRefreshing = false
                    showOffline()
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
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
                    ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    request.grant(request.resources)
                } else {
                    pendingPermissionRequest = request
                    permissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                val needed = arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
                val missing = needed.filter {
                    ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    permissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent() ?: return false
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    fileUploadCallback = null
                    false
                }
            }
        }
    }

    private fun openExternal(uri: Uri) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            // No app installed to handle this URI; silently ignore.
        }
    }

    /**
     * Handle Android `intent://` URIs (Chrome intent scheme).
     *
     * Parses the intent, tries to resolve and launch it. If no activity can
     * handle the parsed intent and the URI specifies a `S.browser_fallback_url`
     * extra, opens that fallback URL externally instead.
     *
     * Returns true if the navigation has been consumed (handled or fallback
     * launched); false if the WebView should handle the URL itself.
     */
    private fun handleIntentScheme(url: String): Boolean {
        val intent: Intent = try {
            Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
        } catch (_: Exception) {
            return false
        }

        // Strip selector to avoid leaking app-internal targets.
        intent.selector = null
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        val resolved = intent.resolveActivity(packageManager)
        if (resolved != null) {
            return try {
                startActivity(intent)
                true
            } catch (_: Exception) {
                openFallback(intent)
            }
        }
        return openFallback(intent)
    }

    private fun openFallback(intent: Intent): Boolean {
        val fallback = intent.getStringExtra("browser_fallback_url")
        if (!fallback.isNullOrBlank()) {
            openExternal(Uri.parse(fallback))
            return true
        }
        // Try Play Store for the package, if specified.
        val pkg = intent.`package`
        if (!pkg.isNullOrBlank()) {
            openExternal(Uri.parse("market://details?id=$pkg"))
            return true
        }
        return true
    }

    private fun showOffline() {
        binding.offlineLayout.visibility = View.VISIBLE
        swipe.visibility = View.GONE
        swipe.isRefreshing = false
    }

    private fun showWebView() {
        binding.offlineLayout.visibility = View.GONE
        swipe.visibility = View.VISIBLE
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val net = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(net) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } else {
            @Suppress("DEPRECATION")
            cm.activeNetworkInfo?.isConnected == true
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    /**
     * Notification taps re-enter MainActivity (singleTask) via onNewIntent
     * rather than onCreate. Pull the deep link out and route the WebView.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val link = extractDeepLink(intent) ?: return
        if (::webView.isInitialized) {
            navigateToDeepLink(link)
        } else {
            pendingDeepLink = link
        }
    }

    /**
     * Forward Android 13+ POST_NOTIFICATIONS result to the JS bridge so the
     * web app can update its banner / register the FCM token.
     */
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PushBridge.PERMISSION_REQUEST_CODE) {
            val granted = grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
            if (::pushBridge.isInitialized) {
                pushBridge.emitPermissionResult(granted)
            }
        }
    }

    /**
     * Pulls the deep-link path out of the launching intent — supports both
     * the `kidschedule://deepLink?path=/foo` URI form and the explicit
     * EXTRA_DEEP_LINK extra. Returns null if no deep link present.
     */
    private fun extractDeepLink(intent: Intent?): String? {
        if (intent == null) return null
        val extra = intent.getStringExtra(KidScheduleFcmService.EXTRA_DEEP_LINK)
        if (!extra.isNullOrBlank()) return extra
        val data = intent.data ?: return null
        if (data.scheme.equals("kidschedule", ignoreCase = true)) {
            return data.getQueryParameter("path")
        }
        return null
    }

    private fun drainPendingDeepLink() {
        val link = pendingDeepLink ?: return
        pendingDeepLink = null
        navigateToDeepLink(link)
    }

    private fun navigateToDeepLink(path: String) {
        val safePath = if (path.startsWith("/")) path else "/$path"
        val target = BuildConfig.WRAPPER_URL.trimEnd('/') + safePath
        webView.post { webView.loadUrl(target) }
    }
}
