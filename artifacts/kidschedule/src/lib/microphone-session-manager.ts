import {
  closeAudioContext,
  getAudioSessionDiagnostics,
  prepareForMicrophoneAcquisition,
  resetAudioFocusForMicRetry,
  trackAudioContext,
} from "@/lib/audio-session-coordinator";
import {
  classifyMicrophoneFailure,
  isOsMicrophonePermissionDenied,
  queryOsMicrophonePermissionState,
  requestMicrophoneAccess,
  resetMicrophonePermissionCache,
  type MicrophoneRuntimeErrorCode,
} from "@/lib/microphone-permission";

export interface RecordingSessionConfig {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  timeslice?: number;
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (chunks: Blob[]) => void;
  onError?: (err: Error, mappedCode: MicrophoneRuntimeErrorCode) => void;
  onStateChange?: (state: MicrophoneSessionState) => void;
  /**
   * When true, stopRecording parks the MediaStream (keeps tracks live) so the
   * next startRecording can skip getUserMedia. Opt-in — Speech Coach leaves this
   * unset so the mic is fully released after each utterance.
   */
  keepAlive?: boolean;
}

export type MicrophoneWarmResult = {
  ok: boolean;
  reused: boolean;
  latencyMs: number;
  reason?: "permission" | "busy" | "superseded" | "unavailable";
};

export type MicrophoneSessionState =
  | "idle"
  | "preparing"      // "Preparing microphone..."
  | "reconnecting"   // "Reconnecting microphone..."
  | "refreshing"     // "Refreshing microphone..."
  | "recording"      // Active MediaRecorder
  | "error";         // Hard error

export class MicrophoneSessionManager {
  private static instance: MicrophoneSessionManager | null = null;

  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private state: MicrophoneSessionState = "idle";
  private error: string | null = null;
  private chunks: Blob[] = [];
  private currentConfig: RecordingSessionConfig | null = null;
  private activeSessionToken: string | null = null;
  private watchdogTimeoutId: any = null;
  private stateChangeCallbacks: Set<(state: MicrophoneSessionState) => void> = new Set();
  /** Opt-in persistent stream for low-latency features (Talking Amy). */
  private keepAliveEnabled = false;
  private warmConstraints: MediaTrackConstraints | null = null;
  private warmInFlight: Promise<MicrophoneWarmResult> | null = null;
  private lastStartLatencyMs: number | null = null;
  private lastStartReusedWarm = false;

  // ── Mic level meter (read-only, parasitic) ───────────────────────────────
  // A passive AnalyserNode tap on the active stream, used ONLY to expose a
  // smoothed input-volume level (0..1) for UI (e.g. a listening halo). It never
  // connects to a destination (no echo) and never touches recording: any
  // failure is swallowed so it cannot affect the mic lifecycle.
  private levelSource: MediaStreamAudioSourceNode | null = null;
  private levelAnalyser: AnalyserNode | null = null;
  private levelRaf: number | null = null;
  private micLevel = 0;
  private micLevelCallbacks: Set<(level: number) => void> = new Set();

  // Statistics for production monitoring/hardening
  private stats = {
    totalSessionsStarted: 0,
    recoveryAttempts: 0,
    recoverySuccesses: 0,
    fakePermissionErrors: 0,     // getUserMedia failed with non-NotAllowedError despite granted permissions
    resumeRelatedFailures: 0,    // Interrupted by lock / background swap
    watchdogTimeouts: 0,         // Triggered 4s watchdog on recording startup
    androidSpecificFailures: 0,  // Failed due to Android-specific signatures (NotReadable / busy)
  };

  private constructor() {
    this.wireVisibilityListeners();
  }

  public static getInstance(): MicrophoneSessionManager {
    if (!MicrophoneSessionManager.instance) {
      MicrophoneSessionManager.instance = new MicrophoneSessionManager();
    }
    return MicrophoneSessionManager.instance;
  }

  /**
   * Lazily acquires/resumes the AudioContext.
   * Crucial for Android where Web Audio gets silently suspended on lock/background.
   */
  private async destroyAudioContext(): Promise<void> {
    if (!this.audioContext) return;
    const state = this.audioContext.state;
    this.log("Destroying AudioContext before mic acquire", { state });
    await closeAudioContext(this.audioContext);
    this.audioContext = null;
  }

  private async ensureAudioContext(forceFresh = false): Promise<AudioContext | null> {
    if (typeof window === "undefined") return null;

    if (forceFresh || !this.audioContext || this.audioContext.state === "closed") {
      await this.destroyAudioContext();
      const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.audioContext = new AudioContextClass();
          trackAudioContext(this.audioContext);
          this.log("Created fresh AudioContext instance", { state: this.audioContext.state });
        } catch (e) {
          this.log("Failed to create AudioContext", e);
        }
      }
    } else if (this.audioContext.state === "suspended") {
      try {
        this.log("AudioContext is suspended — recreating instead of resuming (WebView zombie guard)");
        await this.destroyAudioContext();
        return this.ensureAudioContext(true);
      } catch (e) {
        this.log("Failed to recreate suspended AudioContext", e);
      }
    }

    return this.audioContext;
  }

  /**
   * Sets up background/foreground hooks to release mic immediately when backgrounded
   * and clean up state appropriately.
   */
  private wireVisibilityListeners(): void {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const handleVisibilityChange = async () => {
      const visibilityState = document.visibilityState;
      this.log(`Visibility state changed to: ${visibilityState}`);

      if (visibilityState === "hidden") {
        if (this.state === "recording" || this.state === "preparing" || this.state === "reconnecting" || this.state === "refreshing") {
          this.log("App backgrounded during active recording session; terminating session cleanly to release mic");
          this.stats.resumeRelatedFailures++;
          
          const err = new DOMException("Recording aborted due to app moving to background", "AbortError");
          const config = this.currentConfig;
          
          this.cleanup();
          this.updateState("idle");

          if (config?.onError) {
            config.onError(err, "stale_stream");
          }
        }
      } else if (visibilityState === "visible") {
        this.log("App returned to foreground; invalidating stale mic session after lifecycle change");
        resetMicrophonePermissionCache();
        this.reset();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handleVisibilityChange);
  }

  /**
   * Opt-in persistent mic session. When enabled, stopRecording parks the stream
   * instead of stopping tracks so the next start can hit <150ms.
   */
  public setKeepAlive(enabled: boolean): void {
    this.keepAliveEnabled = enabled;
    this.log(`Keep-alive ${enabled ? "enabled" : "disabled"}`);
    if (!enabled && this.state !== "recording" && this.mediaRecorder == null) {
      this.releaseWarmStream();
    }
  }

  public isKeepAliveEnabled(): boolean {
    return this.keepAliveEnabled;
  }

  /** True when a healthy parked stream is ready for instant MediaRecorder start. */
  public isWarmed(): boolean {
    return !!(this.stream && this.isStreamHealthy(this.stream) && this.mediaRecorder == null);
  }

  public getLastStartDiagnostics(): { latencyMs: number | null; reusedWarm: boolean } {
    return { latencyMs: this.lastStartLatencyMs, reusedWarm: this.lastStartReusedWarm };
  }

  /**
   * Acquire (or reuse) a live mic stream without starting MediaRecorder.
   * Safe to call from idle screens after a user gesture or when permission is already granted.
   */
  public async warmMicrophone(
    config?: Pick<RecordingSessionConfig, "echoCancellation" | "noiseSuppression" | "autoGainControl">,
  ): Promise<MicrophoneWarmResult> {
    if (this.warmInFlight) return this.warmInFlight;

    const run = async (): Promise<MicrophoneWarmResult> => {
      const startTimer = performance.now();
      if (this.state === "recording") {
        return { ok: true, reused: true, latencyMs: 0 };
      }
      if (this.isWarmed()) {
        this.startLevelMeter();
        return { ok: true, reused: true, latencyMs: performance.now() - startTimer };
      }

      this.keepAliveEnabled = true;
      this.warmConstraints = {
        echoCancellation: config?.echoCancellation ?? true,
        noiseSuppression: config?.noiseSuppression ?? true,
        autoGainControl: config?.autoGainControl ?? true,
      };

      this.updateState("preparing");
      this.error = null;

      try {
        await prepareForMicrophoneAcquisition();
        await this.ensureAudioContext(false);

        const access = await requestMicrophoneAccess({ forFeature: true, skipProbeStream: true });
        const osPermissionState = await queryOsMicrophonePermissionState();
        if (!access.granted && isOsMicrophonePermissionDenied(osPermissionState)) {
          this.updateState("idle");
          return {
            ok: false,
            reused: false,
            latencyMs: performance.now() - startTimer,
            reason: "permission",
          };
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: this.warmConstraints });
        if (!this.isStreamHealthy(stream)) {
          stream.getTracks().forEach((t) => t.stop());
          this.updateState("error");
          return {
            ok: false,
            reused: false,
            latencyMs: performance.now() - startTimer,
            reason: "busy",
          };
        }

        // Replace any stale stream without settling delay when we weren't recording.
        if (this.stream && this.stream !== stream) {
          this.stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {
              /* ignore */
            }
          });
        }
        this.stream = stream;
        this.startLevelMeter();
        this.updateState("idle");
        this.log("Warm mic session ready", { latencyMs: performance.now() - startTimer });
        return { ok: true, reused: false, latencyMs: performance.now() - startTimer };
      } catch (err) {
        this.log("warmMicrophone failed", err);
        this.updateState("idle");
        return {
          ok: false,
          reused: false,
          latencyMs: performance.now() - startTimer,
          reason: "unavailable",
        };
      } finally {
        this.warmInFlight = null;
      }
    };

    this.warmInFlight = run();
    return this.warmInFlight;
  }

  /** Release a parked keep-alive stream (page unmount / leave feature). */
  public releaseWarmStream(): void {
    this.log("Releasing warm mic stream");
    this.keepAliveEnabled = false;
    this.warmConstraints = null;
    this.cleanup({ releaseStream: true });
    this.updateState("idle");
  }

  /**
   * Start a reliable recording session.
   * Handles cleanup, permission checking, getUserMedia, health checks, watchdog timers,
   * and automatic recovery retries on Android failures.
   * Fast path: reuses a keep-alive warm stream (no getUserMedia) when healthy.
   */
  public async startRecording(config: RecordingSessionConfig): Promise<boolean> {
    this.stats.totalSessionsStarted++;
    this.lastStartLatencyMs = null;
    this.lastStartReusedWarm = false;

    if (config.keepAlive) {
      this.keepAliveEnabled = true;
    }

    const startTimer = performance.now();
    const canReuseWarm =
      this.keepAliveEnabled &&
      this.stream != null &&
      this.isStreamHealthy(this.stream) &&
      (this.mediaRecorder == null || this.mediaRecorder.state === "inactive");

    if (canReuseWarm) {
      this.log("Fast path: reusing warm microphone stream");
      // Tear down a leftover inactive recorder only — keep the stream.
      this.cleanup({ releaseStream: false });
      this.currentConfig = config;
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this.activeSessionToken = sessionToken;
      this.error = null;
      this.updateState("preparing");

      try {
        await this.ensureAudioContext(false);
        const success = await this.attachRecorderAndStart(config, sessionToken, this.stream!);
        if (success) {
          this.lastStartLatencyMs = performance.now() - startTimer;
          this.lastStartReusedWarm = true;
          this.log(`Warm-path recording started in ${this.lastStartLatencyMs.toFixed(1)}ms`);
          return true;
        }
      } catch (err) {
        this.log("Warm-path start failed — falling through to cold acquire", err);
        this.cleanup({ releaseStream: true });
      }
    } else {
      // 1. Single mic owner: stop previous recording; settle only when tracks are released
      const hadActiveTracks = !!(this.stream || this.mediaRecorder);
      const willRelease = !this.keepAliveEnabled || !this.isWarmed();
      if (hadActiveTracks && willRelease) {
        this.updateState("refreshing");
        this.cleanup({ releaseStream: true });
        this.log("Settle delay: Waiting 150ms for audio hardware to fully release...");
        await new Promise((resolve) => setTimeout(resolve, 150));
      } else if (this.mediaRecorder) {
        this.cleanup({ releaseStream: false });
      }
    }

    this.currentConfig = config;

    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.activeSessionToken = sessionToken;

    this.updateState("preparing");
    this.error = null;

    // 2. Global playback release + post-TTS cooldown + native session prep
    await prepareForMicrophoneAcquisition();
    await this.ensureAudioContext(true);

    this.log("Mic acquire timeline", getAudioSessionDiagnostics());
    try {
      const success = await this.attemptStartRecording(config, sessionToken);
      if (success) {
        this.lastStartLatencyMs = performance.now() - startTimer;
        this.lastStartReusedWarm = false;
        this.log(`Recording started successfully. getUserMedia latency: ${this.lastStartLatencyMs.toFixed(1)}ms`);
        return true;
      }
    } catch (err: any) {
      this.log("First attempt to start recording failed, checking for recovery potential", err);
    }

    // If session was cancelled/superseded during first attempt, do not retry
    if (this.activeSessionToken !== sessionToken) {
      this.log("Session was cancelled or superseded during first attempt; aborting start");
      return false;
    }

    // 3. AUTOMATIC MICROPHONE RECOVERY FLOW (NotReadableError / stale native focus)
    this.stats.recoveryAttempts++;
    this.log("First attempt failed. Initiating automatic microphone recovery with audio focus reset...");
    this.updateState("reconnecting");

    this.cleanup({ releaseStream: true });
    this.activeSessionToken = sessionToken;
    this.currentConfig = config;

    await resetAudioFocusForMicRetry();
    await this.ensureAudioContext(true);

    if (this.activeSessionToken !== sessionToken) {
      this.log("Session was cancelled or superseded during recovery delay; aborting start");
      return false;
    }

    try {
      this.log("Executing automatic recovery retry of getUserMedia...");
      const success = await this.attemptStartRecording(config, sessionToken);
      if (success) {
        this.stats.recoverySuccesses++;
        this.lastStartLatencyMs = performance.now() - startTimer;
        this.lastStartReusedWarm = false;
        this.log("Recovery successful: Recording started on second attempt");
        return true;
      }
    } catch (err: any) {
      this.log("Automatic recovery retry failed", err);
      await this.handleError(err, config);
    }

    return false;
  }

  /**
   * Internal wrapper to perform a single cold-start attempt (getUserMedia + recorder).
   */
  private async attemptStartRecording(config: RecordingSessionConfig, sessionToken: string): Promise<boolean> {
    // A. Perform permission/native check. Since config.forFeature is true on user action,
    // we bypass cache to ensure real permission dialog triggers if needed.
    const access = await requestMicrophoneAccess({ forFeature: true, skipProbeStream: true });
    const osPermissionState = await queryOsMicrophonePermissionState();
    this.log("Microphone access permission check result", { access, osPermissionState });
    if (!access.granted && isOsMicrophonePermissionDenied(osPermissionState)) {
      throw new DOMException("Permission denied by user or OS", "NotAllowedError");
    }

    if (this.activeSessionToken !== sessionToken) return false;

    // B. Obtain fresh media stream
    const constraints: MediaTrackConstraints = {
      echoCancellation: config.echoCancellation ?? true,
      noiseSuppression: config.noiseSuppression ?? true,
      autoGainControl: config.autoGainControl ?? true,
    };
    this.warmConstraints = constraints;

    this.log("Calling getUserMedia with fresh constraints", constraints);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    } catch (getUserMediaErr) {
      const classification = await classifyMicrophoneFailure(getUserMediaErr);
      this.log("getUserMedia failed", {
        osPermissionState: classification.osPermissionState,
        errorName: classification.errorName,
        mappedCode: classification.mappedCode,
        isTruePermissionDenial: classification.isTruePermissionDenial,
      });
      throw getUserMediaErr;
    }

    if (this.activeSessionToken !== sessionToken) {
      this.log("Session changed while calling getUserMedia; stopping new stream immediately");
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }

    this.stream = stream;

    // C. Real microphone health check (stream.active, track existence, readyState === 'live')
    if (!this.isStreamHealthy(stream)) {
      throw new DOMException(
        "Microphone stream acquired but failed health check (inactive or dead tracks)",
        "NotReadableError"
      );
    }

    return this.attachRecorderAndStart(config, sessionToken, stream);
  }

  /**
   * Attach MediaRecorder to an already-live stream and start capturing.
   * Used by both cold getUserMedia and warm keep-alive paths.
   */
  private async attachRecorderAndStart(
    config: RecordingSessionConfig,
    sessionToken: string,
    stream: MediaStream,
  ): Promise<boolean> {
    // C2. Start the read-only input-level meter (UI listening halo). Non-fatal.
    this.startLevelMeter();

    // D. Pick optimal mime type and create fresh MediaRecorder
    const mimeType = this.pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = this.createMediaRecorderInstance(stream, mimeType);
    } catch (constructionErr) {
      this.log("Failed to construct MediaRecorder instance", constructionErr);
      throw new DOMException("MediaRecorder construction rejected by browser", "InvalidStateError");
    }

    this.mediaRecorder = recorder;
    this.chunks = [];

    // E. Wire MediaRecorder event listeners
    recorder.ondataavailable = (e) => {
      if (this.activeSessionToken !== sessionToken) return;
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
        if (config.onDataAvailable) {
          try {
            config.onDataAvailable(e.data);
          } catch (callbackErr) {
            this.log("Error inside onDataAvailable callback", callbackErr);
          }
        }
      }
    };

    recorder.onerror = (e: any) => {
      if (this.activeSessionToken !== sessionToken) return;
      this.log("MediaRecorder runtime error", e);
      void this.handleError(new DOMException("MediaRecorder runtime error", "InvalidStateError"), config);
    };

    recorder.onstop = () => {
      if (this.activeSessionToken !== sessionToken) return;
      this.log("MediaRecorder stopped", { chunks: this.chunks.length });
      if (config.onStop) {
        try {
          config.onStop(this.chunks);
        } catch (callbackErr) {
          this.log("Error inside onStop callback", callbackErr);
        }
      }
    };

    // F. Setup Watchdog (Recording start timeout)
    let startedSuccessfully = false;
    this.watchdogTimeoutId = setTimeout(() => {
      if (!startedSuccessfully && this.activeSessionToken === sessionToken) {
        this.log("Watchdog triggered: MediaRecorder failed to start recording within 4 seconds");
        this.stats.watchdogTimeouts++;
        this.cleanup({ releaseStream: true });
        void this.handleError(new DOMException("Microphone start timed out", "NotReadableError"), config);
      }
    }, 4000);

    try {
      this.log("Starting MediaRecorder", { timeslice: config.timeslice ?? 400, mimeType });
      recorder.start(config.timeslice ?? 400);
      startedSuccessfully = true;

      if (this.watchdogTimeoutId !== null) {
        clearTimeout(this.watchdogTimeoutId);
        this.watchdogTimeoutId = null;
      }

      this.updateState("recording");
      return true;
    } catch (startErr) {
      if (this.watchdogTimeoutId !== null) {
        clearTimeout(this.watchdogTimeoutId);
        this.watchdogTimeoutId = null;
      }
      this.log("Failed to start MediaRecorder", startErr);
      throw new DOMException("MediaRecorder start rejected", "InvalidStateError");
    }
  }

  /**
   * Stop active recording and return the final audio Blob.
   * With keep-alive, parks the MediaStream so the next start skips getUserMedia.
   */
  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const rec = this.mediaRecorder;
      const mimeType = this.pickRecorderMimeType();
      const parkStream = this.keepAliveEnabled || !!this.currentConfig?.keepAlive;

      if (!rec || rec.state === "inactive") {
        this.log("stopRecording called but MediaRecorder is not active");
        this.cleanup({ releaseStream: !parkStream });
        this.updateState("idle");
        resolve(null);
        return;
      }

      this.updateState("idle");

      // Wrap original onStop callback to capture and resolve final Blob
      const originalOnStop = this.currentConfig?.onStop;
      rec.onstop = () => {
        this.log("MediaRecorder stopped on demand", {
          chunks: this.chunks.length,
          parkStream,
        });

        let blob: Blob | null = null;
        if (this.chunks.length > 0) {
          blob = new Blob(this.chunks, { type: mimeType });
        }

        if (originalOnStop) {
          try {
            originalOnStop(this.chunks);
          } catch (callbackErr) {
            this.log("Error inside original onStop callback", callbackErr);
          }
        }

        this.cleanup({ releaseStream: !parkStream });
        if (parkStream && this.stream && this.isStreamHealthy(this.stream)) {
          this.startLevelMeter();
        }
        resolve(blob);
      };

      try {
        if (rec.state === "recording") {
          rec.requestData();
        }
      } catch (e) {
        this.log("requestData failed or unsupported", e);
      }

      try {
        rec.stop();
      } catch (e) {
        this.log("Error stopping MediaRecorder", e);
        this.cleanup({ releaseStream: !parkStream });
        resolve(null);
      }
    });
  }

  /**
   * Cancel the current recording, discarding any recorded buffers.
   * Keep-alive parks the stream; otherwise fully releases the mic.
   */
  public cancelRecording(): void {
    this.log("Recording session cancelled on demand");
    const parkStream = this.keepAliveEnabled;
    this.cleanup({ releaseStream: !parkStream });
    if (parkStream && this.stream && this.isStreamHealthy(this.stream)) {
      this.startLevelMeter();
    }
    this.updateState("idle");
  }

  /**
   * Hard reset after native lifecycle changes — never reuse streams/contexts after pause/resume.
   */
  public reset(): void {
    this.log("reset() — invalidating mic session after native lifecycle change");
    this.keepAliveEnabled = false;
    this.warmConstraints = null;
    this.cleanup({ releaseStream: true });
    void this.destroyAudioContext();
    this.currentConfig = null;
    this.error = null;
    this.updateState("idle");
  }

  /**
   * Cleanup recorder (+ optionally stream tracks).
   * When keep-alive parks the stream, pass `{ releaseStream: false }`.
   */
  public cleanup(options?: { releaseStream?: boolean }): void {
    const releaseStream = options?.releaseStream ?? true;
    this.log("Executing cleanup of microphone session assets", { releaseStream });

    // Tear down the level meter first so its rAF/analyser release before tracks stop.
    // When parking the stream, restart the meter after recorder teardown.
    this.stopLevelMeter();

    if (this.watchdogTimeoutId !== null) {
      clearTimeout(this.watchdogTimeoutId);
      this.watchdogTimeoutId = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;

      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          this.log("Ignored MediaRecorder stop error during cleanup", e);
        }
      }
      this.mediaRecorder = null;
    }

    if (releaseStream && this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
          this.log("Stopped stream track cleanly", { label: track.label, readyState: track.readyState });
        } catch (e) {
          this.log("Ignored stream track stop error during cleanup", e);
        }
      });
      this.stream = null;
      this.warmConstraints = null;
    }

    this.chunks = [];
    this.activeSessionToken = null;
  }

  /**
   * Performs an actual audio stream usability probe
   */
  private isStreamHealthy(stream: MediaStream): boolean {
    if (!stream.active) {
      this.log("Stream health check failed: stream.active is false");
      return false;
    }
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) {
      this.log("Stream health check failed: no audio tracks found");
      return false;
    }
    const allLive = tracks.every((track) => track.readyState === "live");
    if (!allLive) {
      this.log("Stream health check failed: some audio tracks are not 'live'", 
        tracks.map((t) => ({ label: t.label, readyState: t.readyState }))
      );
      return false;
    }
    this.log("Stream health check passed: active stream with live tracks");
    return true;
  }

  /**
   * Centralized error mapping and recovery state conversion.
   * Uses OS permission truth — never maps getUserMedia failure alone to permission denied.
   */
  private async handleError(err: any, config: RecordingSessionConfig): Promise<void> {
    const classification = await classifyMicrophoneFailure(err);
    const { errorName, errorMessage, osPermissionState, mappedCode, isTruePermissionDenial } = classification;

    const trackStates = this.stream?.getAudioTracks().map((t) => ({
      label: t.label,
      readyState: t.readyState,
    }));

    this.log("Recording session failure occurred", {
      errorName,
      errorMessage,
      osPermissionState,
      isTruePermissionDenial,
      mappedCode,
      streamActive: this.stream?.active ?? null,
      trackStates,
      retryStats: this.stats,
      diagnostics: getAudioSessionDiagnostics(),
    });

    if (isTruePermissionDenial) {
      /* true OS denial */
    } else if (
      errorName === "NotAllowedError" ||
      errorName === "PermissionDeniedError" ||
      errorMessage.toLowerCase().includes("permission denied")
    ) {
      this.stats.fakePermissionErrors++;
    }

    if (mappedCode === "microphone_busy" || mappedCode === "security_error") {
      this.stats.androidSpecificFailures++;
    }

    this.error = mappedCode;
    this.updateState("error");

    if (config.onError) {
      try {
        config.onError(err || new Error(errorMessage), mappedCode);
      } catch (callbackErr) {
        this.log("Error inside onError callback", callbackErr);
      }
    }
  }

  public getRecorderMimeType(): string {
    return this.pickRecorderMimeType();
  }

  private pickRecorderMimeType(): string {
    const isIOS = typeof navigator !== "undefined" && (
      /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

    const candidates = isIOS
      ? ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

    for (const mime of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }

    return isIOS ? "audio/mp4" : "audio/webm";
  }

  private createMediaRecorderInstance(stream: MediaStream, mimeType: string): MediaRecorder {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
      try {
        return new MediaRecorder(stream, { mimeType });
      } catch (e) {
        this.log("MediaRecorder construction rejected with mimeType, falling back", { mimeType, error: e });
      }
    }
    return new MediaRecorder(stream);
  }

  private updateState(newState: MicrophoneSessionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.log(`State transition to: ${newState}`);

    if (this.currentConfig?.onStateChange) {
      try {
        this.currentConfig.onStateChange(newState);
      } catch (e) {
        this.log("Error inside onStateChange callback", e);
      }
    }

    this.stateChangeCallbacks.forEach((cb) => {
      try {
        cb(newState);
      } catch (e) {
        this.log("Error inside stateChangeCallbacks subscriber", e);
      }
    });
  }

  public subscribeStateChange(cb: (state: MicrophoneSessionState) => void): () => void {
    this.stateChangeCallbacks.add(cb);
    cb(this.state);
    return () => {
      this.stateChangeCallbacks.delete(cb);
    };
  }

  /**
   * Subscribe to the smoothed microphone input level (0..1). Emits the current
   * value immediately, then on every animation frame while a stream is live.
   * Returns an unsubscribe fn. Purely a UI signal — does not affect recording.
   */
  public subscribeMicLevel(cb: (level: number) => void): () => void {
    this.micLevelCallbacks.add(cb);
    try {
      cb(this.micLevel);
    } catch {
      /* ignore subscriber errors */
    }
    return () => {
      this.micLevelCallbacks.delete(cb);
    };
  }

  public getMicLevel(): number {
    return this.micLevel;
  }

  private setMicLevel(value: number): void {
    this.micLevel = value;
    this.micLevelCallbacks.forEach((cb) => {
      try {
        cb(value);
      } catch {
        /* a broken UI subscriber must never affect the mic */
      }
    });
  }

  /**
   * Attach a passive analyser to the active stream and stream a smoothed RMS
   * level via setMicLevel(). Read-only: the analyser is never connected to a
   * destination. Fully wrapped — any failure leaves recording untouched.
   */
  private startLevelMeter(): void {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
    try {
      this.stopLevelMeter();
      const ctx = this.audioContext;
      const stream = this.stream;
      if (!ctx || ctx.state === "closed" || !stream) return;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser); // NOTE: never connect to ctx.destination (no echo)

      this.levelSource = source;
      this.levelAnalyser = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      let smoothed = 0;
      const tick = () => {
        const a = this.levelAnalyser;
        if (!a) return;
        try {
          a.getByteTimeDomainData(buf);
          let sumSquares = 0;
          for (let i = 0; i < buf.length; i++) {
            const centered = (buf[i] - 128) / 128;
            sumSquares += centered * centered;
          }
          const rms = Math.sqrt(sumSquares / buf.length); // 0..~1, speech ~0.05-0.25
          const normalized = Math.min(1, rms * 4); // lift quiet speech, clamp
          // Asymmetric smoothing: rise fast, fall slow → lively but not jittery.
          const alpha = normalized > smoothed ? 0.5 : 0.12;
          smoothed = smoothed * (1 - alpha) + normalized * alpha;
          this.setMicLevel(smoothed);
        } catch {
          /* transient analyser read error — keep last level */
        }
        this.levelRaf = requestAnimationFrame(tick);
      };
      this.levelRaf = requestAnimationFrame(tick);
      this.log("Mic level meter started");
    } catch (e) {
      this.log("Mic level meter start failed (non-fatal)", e);
      this.stopLevelMeter();
    }
  }

  private stopLevelMeter(): void {
    if (this.levelRaf !== null) {
      try {
        cancelAnimationFrame(this.levelRaf);
      } catch {
        /* ignore */
      }
      this.levelRaf = null;
    }
    try {
      this.levelSource?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.levelAnalyser?.disconnect();
    } catch {
      /* ignore */
    }
    this.levelSource = null;
    this.levelAnalyser = null;
    if (this.micLevel !== 0) this.setMicLevel(0);
  }

  public getState(): MicrophoneSessionState {
    return this.state;
  }

  public getError(): string | null {
    return this.error;
  }

  public getStatistics() {
    return { ...this.stats };
  }

  private log(message: string, detail?: unknown): void {
    try {
      const docState = typeof document !== "undefined" ? document.visibilityState : "unknown";
      const audioState = this.audioContext ? this.audioContext.state : "no_context";
      const meta = `[state=${this.state}, doc=${docState}, audio=${audioState}]`;
      
      if (detail === undefined) {
        console.debug(`[amynest:mic-session]${meta} ${message}`);
      } else {
        console.debug(`[amynest:mic-session]${meta} ${message}`, detail);
      }
    } catch {
      // never crash on logging failures
    }
  }
}

export const microphoneSessionManager = MicrophoneSessionManager.getInstance();
