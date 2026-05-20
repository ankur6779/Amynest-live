import UIKit

/// Forces dark interface style on all app windows so WKWebView reports
/// prefers-color-scheme: dark and native chrome matches the dark-only web UI.
enum AmyNestAppearance {
    static func forceDarkMode() {
        guard #available(iOS 13.0, *) else { return }
        if #available(iOS 15.0, *) {
            for scene in UIApplication.shared.connectedScenes {
                guard let windowScene = scene as? UIWindowScene else { continue }
                for window in windowScene.windows {
                    window.overrideUserInterfaceStyle = .dark
                }
            }
            return
        }
        for window in UIApplication.shared.windows {
            window.overrideUserInterfaceStyle = .dark
        }
    }
}
