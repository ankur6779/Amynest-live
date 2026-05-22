import UIKit

/// Forces dark interface style on all app windows so WKWebView reports
/// prefers-color-scheme: dark and native chrome matches the dark-only web UI.
enum AmyNestAppearance {
    static func forceDarkMode() {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                window.overrideUserInterfaceStyle = .dark
            }
        }
    }
}
