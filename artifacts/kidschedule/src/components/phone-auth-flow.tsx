import { useRef, useState, useEffect } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type ApplicationVerifier,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

type Step = "idle" | "phone" | "sending" | "otp" | "verifying";

interface Props {
  onError?: (msg: string) => void;
}

export default function PhoneAuthFlow({ onError }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<ApplicationVerifier | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneFull = `+91${phone.replace(/\D/g, "")}`;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function getVerifier(): Promise<ApplicationVerifier> {
    if (recaptchaRef.current) return recaptchaRef.current;
    const v = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", { size: "invisible" });
    recaptchaRef.current = v;
    return v;
  }

  async function sendOtp(forceResend = false) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) { onError?.("Please enter a valid 10-digit phone number."); return; }
    setStep("sending");
    try {
      if (forceResend && recaptchaRef.current) {
        try { (recaptchaRef.current as RecaptchaVerifier).clear(); } catch { /* ok */ }
        recaptchaRef.current = null;
      }
      const verifier = await getVerifier();
      const result = await signInWithPhoneNumber(firebaseAuth, phoneFull, verifier);
      confirmRef.current = result;
      setOtp("");
      setStep("otp");
      startResendTimer();
    } catch (err: unknown) {
      recaptchaRef.current = null;
      onError?.(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
      setStep("phone");
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) { onError?.("Please enter the 6-digit OTP."); return; }
    if (!confirmRef.current) { onError?.("Session expired. Please resend OTP."); setStep("phone"); return; }
    setStep("verifying");
    try {
      await confirmRef.current.confirm(otp);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
      setStep("otp");
    }
  }

  const btn: React.CSSProperties = {
    width: "100%", height: "50px", borderRadius: "14px",
    background: "rgba(123,63,242,0.15)",
    border: "1px solid rgba(123,63,242,0.45)",
    color: "#C4B5FD", fontSize: "15px", fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
    cursor: "pointer", fontFamily: "inherit",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", height: "48px", padding: "0 16px",
    borderRadius: "14px", outline: "none", fontSize: "15px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(123,63,242,0.55)",
    color: "#F0E8FF", fontFamily: "inherit",
    boxSizing: "border-box",
  };
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    flex: 2, height: "46px", borderRadius: "14px",
    background: disabled ? "rgba(123,63,242,0.30)" : "#7B3FF2",
    border: "none", color: "#FFFFFF", fontSize: "15px", fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
  });

  if (step === "idle") return (
    <>
      <div id="recaptcha-container" />
      <button type="button" style={btn} onClick={() => setStep("phone")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12" y2="18"/>
        </svg>
        Continue with Phone
      </button>
    </>
  );

  if (step === "phone" || step === "sending") {
    const canSend = phone.replace(/\D/g, "").length === 10 && step !== "sending";
    return (
      <>
        <div id="recaptcha-container" />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "rgba(200,180,255,0.70)" }}>Enter your mobile number</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{
              height: "48px", padding: "0 14px", borderRadius: "14px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(123,63,242,0.25)",
              color: "#F0E8FF", fontSize: "15px", fontWeight: 600,
              display: "flex", alignItems: "center", whiteSpace: "nowrap",
            }}>+91</div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              style={{ ...inputStyle, flex: 1 }}
              autoFocus
              maxLength={10}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button"
              onClick={() => { setStep("idle"); setPhone(""); }}
              style={{
                flex: 1, height: "46px", borderRadius: "14px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(200,180,255,0.60)", fontSize: "14px", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
            <button type="button"
              onClick={() => sendOtp()}
              disabled={!canSend}
              style={primaryBtn(!canSend)}>
              {step === "sending" ? "Sending…" : "Send OTP"}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === "otp" || step === "verifying") {
    const canVerify = otp.length === 6 && step !== "verifying";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
        <label style={{ fontSize: "12px", color: "rgba(200,180,255,0.70)" }}>
          OTP sent to <span style={{ color: "#C4B5FD", fontWeight: 600 }}>{phoneFull}</span>
        </label>
        <input
          type="tel"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="• • • • • •"
          maxLength={6}
          autoFocus
          style={{ ...inputStyle, textAlign: "center", fontSize: "24px", letterSpacing: "10px" }}
        />
        <button type="button"
          onClick={verifyOtp}
          disabled={!canVerify}
          style={{ ...primaryBtn(!canVerify), flex: "unset", width: "100%" }}>
          {step === "verifying" ? "Verifying…" : "Verify & Sign In"}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          {resendTimer > 0
            ? <span style={{ color: "rgba(200,180,255,0.45)" }}>Resend in {resendTimer}s</span>
            : <button type="button" onClick={() => sendOtp(true)}
                style={{ background: "none", border: "none", color: "#A78BFA", fontWeight: 600, cursor: "pointer", fontSize: "13px", padding: 0 }}>
                Resend OTP
              </button>
          }
          <button type="button" onClick={() => { setStep("phone"); setOtp(""); }}
            style={{ background: "none", border: "none", color: "rgba(200,180,255,0.50)", cursor: "pointer", fontSize: "13px", padding: 0 }}>
            Change number
          </button>
        </div>
      </div>
    );
  }

  return null;
}
