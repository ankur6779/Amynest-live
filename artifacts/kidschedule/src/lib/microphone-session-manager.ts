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
}

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
   * Start a reliable recording session.
   * Handles cleanup, permission checking, getUserMedia, health checks, watchdog timers,
   * and automatic recovery retries on Android failures.
   */
  public async startRecording(config: RecordingSessionConfig): Promise<boolean> {
    this.stats.totalSessionsStarted++;
    
    // 1. Single mic owner: completely stop any previous recording & invalidate token
    const hadActiveTracks = !!(this.stream || this.mediaRecorder);
    if (hadActiveTracks) {
      this.updateState("refreshing");
      this.cleanup();
      // Android audio hardware releases slowly. Add ~150ms settle delay after track.stop() before next getUserMedia
      this.log("Settle delay: Waiting 150ms for audio hardware to fully release...");
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      this.cleanup();
    }

    this.currentConfig = config;

    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.activeSessionToken = sessionToken;

    this.updateState("preparing");
    this.error = null;

    // 2. Global playback release + post-TTS cooldown + native session prep
    await prepareForMicrophoneAcquisition();
    await this.ensureAudioContext(true);

    const startTimer = performance.now();
    this.log("Mic acquire timeline", getAudioSessionDiagnostics());
    try {
      const success = await this.attemptStartRecording(config, sessionToken);
      if (success) {
        const latency = performance.now() - startTimer;
        this.log(`Recording started successfully. getUserMedia latency: ${latency.toFixed(1)}ms`);
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

    this.cleanup();
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
   * Internal wrapper to perform a single startup attempt
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
        this.cleanup();
        void this.handleError(new DOMException("Microphone start timed out", "NotReadableError"), config);
      }
    }, 4000);

    try {
      this.log("Starting MediaRecorder", { timeslice: config.timeslice ?? 400, mimeType });
      recorder.start(config.timeslice ?? 400);
      startedSuccessfully = true;
      
      // Clear watchdog timer once recording has actually started
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
   * Stop active recording and return the final audio Blob
   */
  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const rec = this.mediaRecorder;
      const mimeType = this.pickRecorderMimeType();

      if (!rec || rec.state === "inactive") {
        this.log("stopRecording called but MediaRecorder is not active");
        this.cleanup();
        this.updateState("idle");
        resolve(null);
        return;
      }

      this.updateState("idle");

      // Wrap original onStop callback to capture and resolve final Blob
      const originalOnStop = this.currentConfig?.onStop;
      rec.onstop = () => {
        this.log("MediaRecorder stopped on demand", { chunks: this.chunks.length });
        
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

        this.cleanup();
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
        this.cleanup();
        resolve(null);
      }
    });
  }

  /**
   * Cancel the current recording, discarding any recorded buffers and cleaning up fully.
   */
  public cancelRecording(): void {
    this.log("Recording session cancelled on demand");
    this.cleanup();
    this.updateState("idle");
  }

  /**
   * Hard reset after native lifecycle changes — never reuse streams/contexts after pause/resume.
   */
  public reset(): void {
    this.log("reset() — invalidating mic session after native lifecycle change");
    this.cleanup();
    void this.destroyAudioContext();
    this.currentConfig = null;
    this.error = null;
    this.updateState("idle");
  }

  /**
   * Deep cleanup of old tracks, event listeners, and media objects
   */
  public cleanup(): void {
    this.log("Executing deep cleanup of microphone session assets");

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

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
          this.log("Stopped stream track cleanly", { label: track.label, readyState: track.readyState });
        } catch (e) {
          this.log("Ignored stream track stop error during cleanup", e);
        }
      });
      this.stream = null;
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
