package com.amynest.app

import android.net.Uri

/**
 * Trusted WebView origins for the AmyNest production site.
 *
 * The SPA canonical host is www; apex redirects there. Native bridges must
 * allow both so billing/push work after redirect and when the wrapper URL
 * is configured as either host.
 */
object WebViewOrigins {
    const val CANONICAL_WRAPPER_URL = "https://www.amynest.in"

    private val PRODUCTION_ORIGIN_RULES: Set<String> = linkedSetOf(
        "https://www.amynest.in",
        "https://amynest.in",
    )

    fun originRulesForWrapperUrl(wrapperUrl: String): Set<String> {
        val rules = linkedSetOf<String>()
        toOriginRule(wrapperUrl)?.let { rules.add(it) }
        rules.addAll(PRODUCTION_ORIGIN_RULES)
        return rules
    }

    fun isTrustedAmyNestHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return false
        return host.equals("amynest.in", ignoreCase = true) ||
            host.equals("www.amynest.in", ignoreCase = true) ||
            host.endsWith(".amynest.in", ignoreCase = true)
    }

    fun toOriginRule(url: String): String? {
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
