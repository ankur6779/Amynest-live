import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import {
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BRAND_GRADIENT, BRAND_GRADIENT_DISABLED, brandAlpha, brand } from "@/constants/colors";
import { useTranslation } from "react-i18next";
import {
  detectDefaultCountry,
  formatPhoneE164,
  isValidNationalPhone,
  openPhoneOtpInExternalBrowser,
  sendPhoneOtpSafely,
  shouldUseBrowserForPhoneOtp,
  redirectWwwToCanonicalApex,
  warnIfPhoneAuthDomainMissingFromFirebase,
  type PhoneCountry,
} from "@workspace/phone-auth";
import CountryPickerModal from "@/components/CountryPickerModal";

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

  const confirmRef = useRef<ConfirmationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendInFlightRef = useRef(false);

  const digits = phone.replace(/\D/g, "");
  const isValidPhone = isValidNationalPhone(digits, country.code);
  const phoneFull = formatPhoneE164(digits, country.code) ?? "";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function sendOtp(forceResend = false) {
    if (sendInFlightRef.current) return;
    if (!phoneFull || phoneFull.length < 10 || !isValidPhone) {
      const msg = t("components.phone_auth_flow.invalid_phone");
      setPhoneError(msg);
      onError?.(msg);
      return;
    }
    if (Platform.OS === "web" && redirectWwwToCanonicalApex()) return;

    sendInFlightRef.current = true;
    setPhoneError(null);
    if (!forceResend) {
      setStep("sending");
    }
    try {
      let result: ConfirmationResult;

      if (Platform.OS === "web") {
        if (shouldUseBrowserForPhoneOtp()) {
          openPhoneOtpInExternalBrowser(phoneFull);
          return;
        }
        const res = await sendPhoneOtpSafely(firebaseAuth, phoneFull);
        if (!res.success) {
          throw new Error(res.error);
        }
        result = res.confirmation;
      } else {
        result = await (signInWithPhoneNumber as unknown as (
          auth: Auth, phone: string
        ) => Promise<ConfirmationResult>)(firebaseAuth, phoneFull);
      }

      confirmRef.current = result;
      setOtp("");
      setStep("otp");
      startResendTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      console.error("[PhoneAuthFlow] OTP Error:", err);
      onError?.(msg);
      if (!forceResend) {
        setStep("phone");
      }
    } finally {
      sendInFlightRef.current = false;
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      onError?.("Please enter the 6-digit OTP.");
      return;
    }
    if (!confirmRef.current) {
      onError?.("Session expired. Please resend OTP.");
      setStep("phone");
      return;
    }
    setStep("verifying");
    try {
      await confirmRef.current.confirm(otp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      onError?.(msg);
      setStep("otp");
    }
  }

  if (step === "idle") {
    return (
      <>
        <TouchableOpacity
          style={s.btn}
          onPress={() => setStep("phone")}
          activeOpacity={0.80}
          testID="phone-auth-btn"
        >
          <Ionicons name="phone-portrait-outline" size={20} color={brand.violet400} />
          <Text style={s.btnText}>{t("components.phone_auth_flow.continue_with_phone")}</Text>
        </TouchableOpacity>
      </>
    );
  }

  if (step === "phone" || step === "sending") {
    const canSend = isValidPhone && step !== "sending";
    return (
      <>
        <CountryPickerModal
          visible={pickerOpen}
          selected={country}
          onSelect={(c) => { setCountry(c); setPhoneError(null); }}
          onClose={() => setPickerOpen(false)}
        />
        <View style={s.wrap}>
          <Text style={s.stepLabel}>{t("components.phone_auth_flow.enter_your_mobile_number")}</Text>
          <View style={s.phoneRow}>
            <TouchableOpacity
              style={[s.countryCode, phoneError && s.countryCodeError]}
              onPress={() => setPickerOpen(true)}
              accessibilityLabel={t("components.phone_auth_flow.country_picker_change_title")}
            >
              <Text style={s.countryFlag}>{country.flag}</Text>
              <Text style={s.countryCodeText}>{country.dialCode}</Text>
              <Ionicons name="chevron-down" size={12} color="rgba(240,232,255,0.5)" />
            </TouchableOpacity>
            <TextInput
              style={[s.phoneInput, phoneError && s.phoneInputError]}
              value={phone}
              onChangeText={(v) => {
                setPhone(v.replace(/\D/g, "").slice(0, 15));
                setPhoneError(null);
              }}
              keyboardType="phone-pad"
              maxLength={15}
              placeholder={country.code === "IN" ? "98765 43210" : t("components.phone_auth_flow.phone_placeholder")}
              placeholderTextColor="rgba(200,180,255,0.28)"
              autoFocus
            />
          </View>
          {phoneError ? (
            <Text style={s.phoneErrorText}>{phoneError}</Text>
          ) : (
            <Text style={s.hint}>
              {country.flag} {country.name} · {t("components.phone_auth_flow.tap_flag_to_change")}
            </Text>
          )}
          <View style={s.rowBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setStep("idle"); setPhone(""); setPhoneError(null); }}>
              <Text style={s.cancelText}>{t("components.phone_auth_flow.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.sendBtnWrap}
              onPress={() => sendOtp()}
              disabled={!canSend}
            >
              <LinearGradient
                colors={canSend ? BRAND_GRADIENT : BRAND_GRADIENT_DISABLED}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.sendBtn}
              >
                {step === "sending"
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.sendBtnText}>{t("components.phone_auth_flow.send_otp")}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  if (step === "otp" || step === "verifying") {
    const canVerify = otp.length === 6 && step !== "verifying";
    return (
      <View style={s.wrap}>
        <Text style={s.stepLabel}>{t("components.phone_auth_flow.enter_otp_sent_to")}</Text>
        <Text style={s.phoneDisplay}>{phoneFull}</Text>
        <TextInput
          style={s.otpInput}
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="• • • • • •"
          placeholderTextColor="rgba(200,180,255,0.28)"
          autoFocus
          textAlign="center"
        />
        <TouchableOpacity
          style={s.verifyBtnWrap}
          onPress={verifyOtp}
          disabled={!canVerify}
        >
          <LinearGradient
            colors={canVerify ? BRAND_GRADIENT : BRAND_GRADIENT_DISABLED}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.sendBtn}
          >
            {step === "verifying"
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.sendBtnText}>{t("components.phone_auth_flow.verify_sign_in")}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
        <View style={s.resendRow}>
          {resendTimer > 0
            ? <Text style={s.resendTimer}>Resend OTP in {resendTimer}s</Text>
            : (
              <TouchableOpacity onPress={() => sendOtp(true)}>
                <Text style={s.resendLink}>{t("components.phone_auth_flow.resend_otp")}</Text>
              </TouchableOpacity>
            )
          }
          <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }}>
            <Text style={s.changePhone}>{t("components.phone_auth_flow.change_number")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  btn: {
    height: 52, borderRadius: 14,
    backgroundColor: brandAlpha.purple500_15,
    borderWidth: 1, borderColor: brandAlpha.purple500_40,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: brand.violet300 },

  wrap: { gap: 10 },
  stepLabel: { fontSize: 12, color: "rgba(200,180,255,0.65)", fontFamily: "Inter_400Regular" },
  phoneDisplay: { fontSize: 14, color: brand.violet300, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 11, color: "rgba(200,180,255,0.40)", fontFamily: "Inter_400Regular" },
  phoneErrorText: { fontSize: 12, color: "#f87171", fontFamily: "Inter_400Regular" },

  phoneRow: { flexDirection: "row", gap: 8 },
  countryCode: {
    height: 52, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: brandAlpha.purple500_45,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  countryCodeError: { borderColor: "rgba(239,68,68,0.55)" },
  countryFlag: { fontSize: 18 },
  countryCodeText: { fontSize: 15, color: "#F0E8FF", fontFamily: "Inter_600SemiBold" },
  phoneInput: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: brandAlpha.purple500_60,
    paddingHorizontal: 14,
    fontSize: 16, color: "#F0E8FF", fontFamily: "Inter_400Regular",
    outlineWidth: 0,
  },
  phoneInputError: { borderColor: "rgba(239,68,68,0.55)" },

  otpInput: {
    height: 60, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: brandAlpha.purple500_60,
    fontSize: 28, color: "#F0E8FF", fontFamily: "Inter_700Bold",
    letterSpacing: 8,
    outlineWidth: 0,
  },

  rowBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  cancelText: { color: "rgba(200,180,255,0.60)", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sendBtnWrap: { flex: 2, borderRadius: 14, overflow: "hidden" },
  verifyBtnWrap: { borderRadius: 14, overflow: "hidden" },
  sendBtn: {
    height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  sendBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  resendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resendTimer: { fontSize: 12, color: "rgba(200,180,255,0.45)", fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 13, color: brand.violet400, fontFamily: "Inter_600SemiBold" },
  changePhone: { fontSize: 13, color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular" },
});
