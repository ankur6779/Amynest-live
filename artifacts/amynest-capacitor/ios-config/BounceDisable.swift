import UIKit

/// Disables rubber-band bounce on WKWebView's internal UIScrollView.
enum AmyNestBounceDisable {
    static func apply(to window: UIWindow?) {
        guard let window else { return }
        disableBounce(in: window)
    }

    static func applyToAllWindows() {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                disableBounce(in: window)
            }
        }
    }

    private static func disableBounce(in root: UIView) {
        func walk(_ view: UIView) {
            if let scrollView = view as? UIScrollView {
                scrollView.bounces = false
                scrollView.alwaysBounceVertical = false
                scrollView.alwaysBounceHorizontal = false
            }
            for subview in view.subviews {
                walk(subview)
            }
        }
        walk(root)
    }
}
