import { useRef, useState, useEffect, useMemo } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type ApplicationVerifier } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useTranslation } from "react-i18next";

// ── Country data ──────────────────────────────────────────────────────────────

type Country = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  /** IANA timezone strings that map to this country (first match wins). */
  timezones: string[];
};

const COUNTRIES: Country[] = [
  { code: "IN", name: "India",           dialCode: "+91",  flag: "🇮🇳", timezones: ["Asia/Kolkata","Asia/Calcutta"] },
  { code: "US", name: "United States",   dialCode: "+1",   flag: "🇺🇸", timezones: ["America/New_York","America/Chicago","America/Los_Angeles","America/Denver","America/Phoenix","America/Anchorage","Pacific/Honolulu"] },
  { code: "GB", name: "United Kingdom",  dialCode: "+44",  flag: "🇬🇧", timezones: ["Europe/London"] },
  { code: "AE", name: "UAE",             dialCode: "+971", flag: "🇦🇪", timezones: ["Asia/Dubai"] },
  { code: "CA", name: "Canada",          dialCode: "+1",   flag: "🇨🇦", timezones: ["America/Toronto","America/Vancouver","America/Edmonton","America/Winnipeg","America/Halifax"] },
  { code: "AU", name: "Australia",       dialCode: "+61",  flag: "🇦🇺", timezones: ["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Perth","Australia/Adelaide"] },
  { code: "SG", name: "Singapore",       dialCode: "+65",  flag: "🇸🇬", timezones: ["Asia/Singapore"] },
  { code: "MY", name: "Malaysia",        dialCode: "+60",  flag: "🇲🇾", timezones: ["Asia/Kuala_Lumpur"] },
  { code: "NZ", name: "New Zealand",     dialCode: "+64",  flag: "🇳🇿", timezones: ["Pacific/Auckland"] },
  { code: "PK", name: "Pakistan",        dialCode: "+92",  flag: "🇵🇰", timezones: ["Asia/Karachi"] },
  { code: "BD", name: "Bangladesh",      dialCode: "+880", flag: "🇧🇩", timezones: ["Asia/Dhaka"] },
  { code: "LK", name: "Sri Lanka",       dialCode: "+94",  flag: "🇱🇰", timezones: ["Asia/Colombo"] },
  { code: "NP", name: "Nepal",           dialCode: "+977", flag: "🇳🇵", timezones: ["Asia/Kathmandu"] },
  { code: "SA", name: "Saudi Arabia",    dialCode: "+966", flag: "🇸🇦", timezones: ["Asia/Riyadh"] },
  { code: "QA", name: "Qatar",           dialCode: "+974", flag: "🇶🇦", timezones: ["Asia/Qatar"] },
  { code: "KW", name: "Kuwait",          dialCode: "+965", flag: "🇰🇼", timezones: ["Asia/Kuwait"] },
  { code: "BH", name: "Bahrain",         dialCode: "+973", flag: "🇧🇭", timezones: ["Asia/Bahrain"] },
  { code: "OM", name: "Oman",            dialCode: "+968", flag: "🇴🇲", timezones: ["Asia/Muscat"] },
  { code: "DE", name: "Germany",         dialCode: "+49",  flag: "🇩🇪", timezones: ["Europe/Berlin"] },
  { code: "FR", name: "France",          dialCode: "+33",  flag: "🇫🇷", timezones: ["Europe/Paris"] },
  { code: "IT", name: "Italy",           dialCode: "+39",  flag: "🇮🇹", timezones: ["Europe/Rome"] },
  { code: "ES", name: "Spain",           dialCode: "+34",  flag: "🇪🇸", timezones: ["Europe/Madrid"] },
  { code: "NL", name: "Netherlands",     dialCode: "+31",  flag: "🇳🇱", timezones: ["Europe/Amsterdam"] },
  { code: "CH", name: "Switzerland",     dialCode: "+41",  flag: "🇨🇭", timezones: ["Europe/Zurich"] },
  { code: "SE", name: "Sweden",          dialCode: "+46",  flag: "🇸🇪", timezones: ["Europe/Stockholm"] },
  { code: "NO", name: "Norway",          dialCode: "+47",  flag: "🇳🇴", timezones: ["Europe/Oslo"] },
  { code: "ZA", name: "South Africa",    dialCode: "+27",  flag: "🇿🇦", timezones: ["Africa/Johannesburg"] },
  { code: "NG", name: "Nigeria",         dialCode: "+234", flag: "🇳🇬", timezones: ["Africa/Lagos"] },
  { code: "KE", name: "Kenya",           dialCode: "+254", flag: "🇰🇪", timezones: ["Africa/Nairobi"] },
  { code: "JP", name: "Japan",           dialCode: "+81",  flag: "🇯🇵", timezones: ["Asia/Tokyo"] },
  { code: "KR", name: "South Korea",     dialCode: "+82",  flag: "🇰🇷", timezones: ["Asia/Seoul"] },
  { code: "CN", name: "China",           dialCode: "+86",  flag: "🇨🇳", timezones: ["Asia/Shanghai","Asia/Beijing"] },
  { code: "PH", name: "Philippines",     dialCode: "+63",  flag: "🇵🇭", timezones: ["Asia/Manila"] },
  { code: "ID", name: "Indonesia",       dialCode: "+62",  flag: "🇮🇩", timezones: ["Asia/Jakarta"] },
  { code: "TH", name: "Thailand",        dialCode: "+66",  flag: "🇹🇭", timezones: ["Asia/Bangkok"] },
  { code: "VN", name: "Vietnam",         dialCode: "+84",  flag: "🇻🇳", timezones: ["Asia/Ho_Chi_Minh"] },
  { code: "BR", name: "Brazil",          dialCode: "+55",  flag: "🇧🇷", timezones: ["America/Sao_Paulo","America/Manaus"] },
  { code: "MX", name: "Mexico",          dialCode: "+52",  flag: "🇲🇽", timezones: ["America/Mexico_City"] },
  { code: "IR", name: "Ireland",         dialCode: "+353", flag: "🇮🇪", timezones: ["Europe/Dublin"] },
];

// Build timezone → country map (first entry wins for shared timezones)
const TZ_MAP = new Map<string, Country>();
for (const c of COUNTRIES) {
  for (const tz of c.timezones) {
    if (!TZ_MAP.has(tz)) TZ_MAP.set(tz, c);
  }
}

const INDIA = COUNTRIES.find((c) => c.code === "IN")!;
const INDIA_TZS = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

function detectCountry(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_MAP.get(tz) ?? COUNTRIES[0];
  } catch {
    return INDIA;
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
  selected: Country;
  onSelect: (c: Country) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? COUNTRIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.dialCode.includes(q) ||
            c.code.toLowerCase().includes(q),
        )
      : COUNTRIES;
  }, [query]);

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
            placeholder="Search country or dial code…"
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
              <span style={{ flex: 1, fontSize: "14px", color: "#E8D8FF", fontWeight: 500 }}>
                {c.name}
              </span>
              <span style={{ fontSize: "14px", color: "rgba(180,150,255,0.70)", fontWeight: 600 }}>
                {c.dialCode}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(200,180,255,0.40)", padding: "24px", fontSize: "14px" }}>
              No country found
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

  // Detect country once on mount
  const detectedCountry = useMemo(() => detectCountry(), []);
  const isIndia = INDIA_TZS.has(
    (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })()
  );

  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [country, setCountry] = useState<Country>(detectedCountry);
  const [pickerOpen, setPickerOpen] = useState(false);

  const confirmRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<ApplicationVerifier | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Validation: India = exactly 10 digits, others = 6–15
  const digits = phone.replace(/\D/g, "");
  const isValidPhone = isIndia || country.code === "IN"
    ? digits.length === 10
    : digits.length >= 6 && digits.length <= 15;

  const phoneFull = `${country.dialCode}${digits}`;

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
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
    if (!isValidPhone) {
      onError?.(
        country.code === "IN"
          ? "Please enter a valid 10-digit phone number."
          : "Please enter a valid phone number.",
      );
      return;
    }
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

  // ── Idle: "Continue with Phone" button ───────────────────────────────────

  if (step === "idle") {
    return (
      <>
        <div id="recaptcha-container" />
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
    const canSend = isValidPhone && step !== "sending";

    return (
      <>
        <div id="recaptcha-container" />

        {pickerOpen && (
          <CountryPicker
            selected={country}
            onSelect={setCountry}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "rgba(200,180,255,0.70)" }}>
            {t("components.phone_auth_flow.enter_your_mobile_number")}
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Country code button — clickable only for non-India */}
            {isIndia ? (
              <div style={{
                height: "48px",
                padding: "0 14px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(123,63,242,0.25)",
                color: "#F0E8FF",
                fontSize: "15px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}>
                🇮🇳 +91
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                title="Change country"
                style={{
                  height: "48px",
                  padding: "0 12px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(123,63,242,0.45)",
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
                {/* Caret */}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="#F0E8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            <input
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, isIndia || country.code === "IN" ? 10 : 15),
                )
              }
              placeholder={isIndia || country.code === "IN" ? "98765 43210" : "Phone number"}
              style={{ ...baseInput, flex: 1 }}
              autoFocus
            />
          </div>

          {/* Helper for non-India countries */}
          {!isIndia && (
            <p style={{ fontSize: "11px", color: "rgba(200,180,255,0.40)", margin: 0 }}>
              Detected: {country.flag} {country.name} · Tap {country.dialCode} to change
            </p>
          )}

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
              onClick={() => sendOtp()}
              disabled={!canSend}
              style={primaryBtn(!canSend)}
            >
              {step === "sending" ? "Sending…" : "Send OTP"}
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
              onClick={() => sendOtp(true)}
              style={{ background: "none", border: "none", color: "hsl(var(--brand-violet-400))", fontWeight: 600, cursor: "pointer", fontSize: "13px", padding: 0, fontFamily: "inherit" }}
            >
              {t("components.phone_auth_flow.resend_otp")}
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
