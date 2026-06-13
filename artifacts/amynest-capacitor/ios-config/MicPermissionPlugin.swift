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
        CAPPluginMethod(name: "prepareAudioSessionForRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareAudioSessionForPlayback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise)
    ]

    @objc func getMicrophoneStatus(_ call: CAPPluginCall) {
        call.resolve(["status": statusString()])
    }

    @objc func prepareAudioSessionForRecording(_ call: CAPPluginCall) {
        activateRecordingSession()
        call.resolve(["ok": true])
    }

    /// White noise, lullabies, and Web Audio need an active playback session in WKWebView.
    @objc func prepareAudioSessionForPlayback(_ call: CAPPluginCall) {
        activatePlaybackSession()
        call.resolve(["ok": true])
    }

    @objc func requestMicrophonePermission(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        switch session.recordPermission {
        case .granted:
            activateRecordingSession()
            call.resolve(["status": "granted"])
        case .denied:
            call.resolve(["status": "denied"])
        case .undetermined:
            session.requestRecordPermission { granted in
                DispatchQueue.main.async {
                    if granted {
                        self.activateRecordingSession()
                    }
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

    /// WKWebView getUserMedia needs an active playAndRecord session (especially after TTS playback).
    private func activateRecordingSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetoothHFP, .mixWithOthers]
            )
            try session.setActive(true, options: [])
        } catch {
            NSLog("[MicPermission] AVAudioSession activate failed: \(error.localizedDescription)")
        }
    }

    private func activatePlaybackSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true, options: [])
        } catch {
            NSLog("[MicPermission] AVAudioSession playback activate failed: \(error.localizedDescription)")
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
