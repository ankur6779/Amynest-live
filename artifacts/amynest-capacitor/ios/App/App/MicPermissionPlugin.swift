import AVFoundation
import Capacitor
import UIKit

@objc(MicPermissionPlugin)
public class MicPermissionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MicPermissionPlugin"
    public let jsName = "MicPermission"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getMicrophoneStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestMicrophonePermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise)
    ]

    @objc func getMicrophoneStatus(_ call: CAPPluginCall) {
        call.resolve(["status": statusString()])
    }

    @objc func requestMicrophonePermission(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        switch session.recordPermission {
        case .granted:
            call.resolve(["status": "granted"])
        case .denied:
            call.resolve(["status": "denied"])
        case .undetermined:
            session.requestRecordPermission { granted in
                DispatchQueue.main.async {
                    call.resolve(["status": granted ? "granted" : "denied"])
                }
            }
        @unknown default:
            call.resolve(["status": "unknown"])
        }
    }

    @objc func openAppSettings(_ call: CAPPluginCall) {
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            call.resolve()
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { _ in
                call.resolve()
            }
        }
    }

    private func statusString() -> String {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            return "granted"
        case .denied:
            return "denied"
        case .undetermined:
            return "undetermined"
        @unknown default:
            return "unknown"
        }
    }
}
