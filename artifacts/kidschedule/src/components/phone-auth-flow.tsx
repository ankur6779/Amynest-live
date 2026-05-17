import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useTranslation } from "react-i18next";
import { formatAuthErrorForUi, logFirebaseAuthError } from "@/lib/firebase-auth-error";
import {
  buildPhoneOtpBrowserUrl,
  detectDefaultCountry,
  filterCountries,
  formatPhoneE164,
  isValidNationalPhone,
  openPhoneOtpInExternalBrowser,
  PHONE_COUNTRIES,
  sendPhoneOtpSafely,
  shouldUseBrowserForPhoneOtp,
  warnIfPhoneAuthDomainMissingFromFirebase,
  type PhoneCountry,
} from "@workspace/phone-auth";

const SEND_OTP_DEBOUNCE_MS = 1500;

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const baseInput: React.CSSProperties = {
  height: "48px",
  padding: "0 16px",
  borderRadius: "14px",
  outline: "none",
  fontSize: "15px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(123,63,242,0.55)",
  color: "#F0E8FF",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 2,
  height: "46px",
  borderRadius: "14px",
  background: disabled ? "rgba(123,63,242,0.30)" : "hsl(var(--brand-violet-600))",
  border: "none",
  color: "#FFFFFF",
  fontSize: "15px",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "inherit",
});

const ghostBtn: React.CSSProperties = {
  flex: 1,
  height: "46px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(200,180,255,0.60)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

// ── Country picker overlay ────────────────────────────────────────────────────

function CountryPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: PhoneCountry;
  onSelect: (c: PhoneCountry) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(
    () => filterCountries(PHONE_COUNTRIES, query),
    [query],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          maxHeight: "70vh",
          background: "rgba(12,6,30,0.98)",
          border: "1px solid rgba(123,63,242,0.35)",
          borderRadius: "24px 24px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ padding: "12px 0 6px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
        </div>

        {/* Search */}
        <div style={{ padding: "8px 16px 12px" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={t("components.phone_auth_flow.country_picker_search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              ...baseInput,
              width: "100%",
              border: "1px solid rgba(123,63,242,0.40)",
              fontSize: "14px",
            }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onSelect(c); onClose(); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 20px",
                background: c.code === selected.code ? "rgba(123,63,242,0.18)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1 }}>{c.flag}</span>
              <span style={{ flex: 1, fontSize: "14px", color: "#E8D8FF" /* audit-ok: purple tint text on dark country-picker bottom-sheet, no CSS semantic token for overlay inline styles */, fontWeight: c.code === selected.code ? 700 : 500 }}>
                {c.name}
              </span>
              <span style={{ fontSize: "14px", color: "rgba(180,150,255,0.70)", fontWeight: 600 }}>
                {c.dialCode}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(200,180,255,0.40)", padding: "24px", fontSize: "14px" }}>
              {t("components.phone_auth_flow.no_country_found")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "idle" | "phone" | "sending" | "otp" | "verifying";

interface Props {
  onError?: (msg: string) => void;
}

export default function PhoneAuthFlow({ onError }: Props) {
  const { t } = useTranslation();

  const detectedCountry = useMemo(() => detectDefaultCountry(), []);

  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [country, setCountry] = useState<PhoneCountry>(detectedCountry);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [browserOtpUrl, setBrowserOtpUrl] = useState<string | null>(null);
  const chromeOtpRequired = useMemo(() => shouldUseBrowserForPhoneOtp(), []);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendInFlightRef = useRef(false);
  const lastSendAtRef = useRef(0);

  useEffect(() => {
    warnIfPhoneAuthDomainMissingFromFirebase();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const digits = phone.replace(/\D/g, "");
  const isValidPhone = isValidNationalPhone(digits, country.code);
  const phoneFull = formatPhoneE164(digits, country.code) ?? "";

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  const sendOtp = useCallback(async (forceResend = false) => {
    if (sendInFlightRef.current) return;

    const now = Date.now();
    if (!forceResend && now - lastSendAtRef.current < SEND_OTP_DEBOUNCE_MS) {
      return;
    }

    if (!phoneFull || phoneFull.length < 10 || !isValidPhone) {
      const msg = t("components.phone_auth_flow.invalid_phone");
      setPhoneError(msg);
      onError?.(msg);
      return;
    }

    if (chromeOtpRequired) {
      setBrowserOtpUrl(buildPhoneOtpBrowserUrl(phoneFull));
      setPhoneError(
        t("components.phone_auth_flow.android_pwa_hint"),
      );
      return;
    }

    sendInFlightRef.current = true;
    lastSendAtRef.current = now;
    setPhoneError(null);
    setOtpSending(true);
    if (!forceResend) {
      setStep("sending");
    }

    setBrowserOtpUrl(null);

    try {
      const res = await sendPhoneOtpSafely(firebaseAuth, phoneFull);

      if (!res.success) {
        logFirebaseAuthError("phone-auth-flow:sendOtp", new Error(res.error));
        setPhoneError(res.error);
        onError?.(res.error);
        if (res.suggestBrowser && chromeOtpRequired) {
          setBrowserOtpUrl(buildPhoneOtpBrowserUrl(phoneFull));
        }
        if (!forceResend) {
          setStep("phone");
        }
        return;
      }

      confirmRef.current = res.confirmation;
      setOtp("");
      setStep("otp");
      startResendTimer();
    } catch (err: unknown) {
      console.error("[phone-auth-flow] OTP unexpected:", err);
      const uiMsg = formatAuthErrorForUi(err);
      setPhoneError(uiMsg);
      onError?.(uiMsg);
      if (!forceResend) {
        setStep("phone");
      }
    } finally {
      sendInFlightRef.current = false;
      setOtpSending(false);
    }
  }, [chromeOtpRequired, isValidPhone, onError, phoneFull, t]);

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

  // ── Idle: "Continue with Phone" button ───────────────────────────────────

  if (step === "idle") {
    return (
      <>
        <button
          type="button"
          onClick={() => setStep("phone")}
          style={{
            width: "100%",
            height: "50px",
            borderRadius: "14px",
            background: "rgba(123,63,242,0.15)",
            border: "1px solid rgba(123,63,242,0.45)",
            color: "hsl(var(--brand-violet-300))",
            fontSize: "15px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12" y2="18" />
          </svg>
          {t("components.phone_auth_flow.continue_with_phone")}
        </button>
      </>
    );
  }

  // ── Phone input step ──────────────────────────────────────────────────────

  if (step === "phone" || step === "sending") {
    const sending = otpSending || step === "sending";
    const canSend = isValidPhone && !sending;

    return (
      <>
{pickerOpen && (
          <CountryPicker
            selected={country}
            onSelect={(c) => { setCountry(c); setPhoneError(null); }}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "rgba(200,180,255,0.70)" }}>
            {t("components.phone_auth_flow.enter_your_mobile_number")}
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              title={t("components.phone_auth_flow.country_picker_change_title")}
              style={{
                height: "48px",
                padding: "0 12px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
                border: phoneError
                  ? "1px solid rgba(239,68,68,0.55)"
                  : "1px solid rgba(123,63,242,0.45)",
                color: "#F0E8FF",
                fontSize: "15px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "18px" }}>{country.flag}</span>
              <span>{country.dialCode}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="#F0E8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 15));
                setPhoneError(null);
              }}
              placeholder={country.code === "IN" ? "98765 43210" : t("components.phone_auth_flow.phone_placeholder")}
              style={{
                ...baseInput,
                flex: 1,
                border: phoneError
                  ? "1px solid rgba(239,68,68,0.55)"
                  : baseInput.border,
              }}
              autoFocus
            />
          </div>

          {phoneError && (
            <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>{phoneError}</p>
          )}

          {browserOtpUrl && (
            <button
              type="button"
              onClick={() => openPhoneOtpInExternalBrowser(phoneFull)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(123,63,242,0.55)",
                background: "rgba(123,63,242,0.20)",
                color: "hsl(var(--brand-violet-300))",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t("components.phone_auth_flow.open_in_chrome")}
            </button>
          )}

          {chromeOtpRequired && !browserOtpUrl && (
            <p style={{ fontSize: "12px", color: "rgba(200,180,255,0.55)", margin: 0, lineHeight: 1.45 }}>
              {t("components.phone_auth_flow.android_pwa_hint")}
            </p>
          )}

          {!chromeOtpRequired && (
            <p style={{ fontSize: "11px", color: "rgba(200,180,255,0.45)", margin: 0, lineHeight: 1.4 }}>
              Complete the security check below, then tap Send OTP again if needed.
            </p>
          )}

          <p style={{ fontSize: "11px", color: "rgba(200,180,255,0.40)", margin: 0 }}>
            {country.flag} {country.name} · {t("components.phone_auth_flow.tap_flag_to_change")}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => { setStep("idle"); setPhone(""); }}
              style={ghostBtn}
            >
              {t("components.phone_auth_flow.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void sendOtp()}
              disabled={!canSend}
              aria-busy={sending}
              style={primaryBtn(!canSend)}
            >
              {sending ? "Sending…" : "Send OTP"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── OTP verification step ─────────────────────────────────────────────────

  if (step === "otp" || step === "verifying") {
    const canVerify = otp.length === 6 && step !== "verifying";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
        <label style={{ fontSize: "12px", color: "rgba(200,180,255,0.70)" }}>
          {t("components.phone_auth_flow.otp_sent_to")}{" "}
          <span style={{ color: "hsl(var(--brand-violet-300))", fontWeight: 600 }}>
            {phoneFull}
          </span>
        </label>

        <input
          type="tel"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="• • • • • •"
          maxLength={6}
          autoFocus
          style={{ ...baseInput, textAlign: "center", fontSize: "24px", letterSpacing: "10px", width: "100%" }}
        />

        <button
          type="button"
          onClick={verifyOtp}
          disabled={!canVerify}
          style={{ ...primaryBtn(!canVerify), flex: "unset", width: "100%" }}
        >
          {step === "verifying" ? "Verifying…" : "Verify & Sign In"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          {resendTimer > 0 ? (
            <span style={{ color: "rgba(200,180,255,0.45)" }}>
              {t("components.phone_auth_flow.resend_in")} {resendTimer}s
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void sendOtp(true)}
              disabled={otpSending}
              style={{
                background: "none",
                border: "none",
                color: "hsl(var(--brand-violet-400))",
                fontWeight: 600,
                cursor: otpSending ? "not-allowed" : "pointer",
                fontSize: "13px",
                padding: 0,
                fontFamily: "inherit",
                opacity: otpSending ? 0.5 : 1,
              }}
            >
              {otpSending ? "Sending…" : t("components.phone_auth_flow.resend_otp")}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setStep("phone"); setOtp(""); }}
            style={{ background: "none", border: "none", color: "rgba(200,180,255,0.50)", cursor: "pointer", fontSize: "13px", padding: 0, fontFamily: "inherit" }}
          >
            {t("components.phone_auth_flow.change_number")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
