import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from "react-native";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type ApplicationVerifier,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { brand } from "@/constants/colors";

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

  async function getOrCreateVerifier(): Promise<ApplicationVerifier> {
    if (recaptchaRef.current) return recaptchaRef.current;
    const v = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
      size: "invisible",
    });
    recaptchaRef.current = v;
    return v;
  }

  async function sendOtp(forceResend = false) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      onError?.("Please enter a valid 10-digit phone number.");
      return;
    }
    setStep("sending");
    try {
      if (forceResend && recaptchaRef.current) {
        try {
          (recaptchaRef.current as RecaptchaVerifier).clear();
        } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      const verifier = await getOrCreateVerifier();
      const result = await signInWithPhoneNumber(firebaseAuth, phoneFull, verifier);
      confirmRef.current = result;
      setOtp("");
      setStep("otp");
      startResendTimer();
    } catch (err: unknown) {
      recaptchaRef.current = null;
      const msg = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      onError?.(msg);
      setStep("phone");
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
      // Firebase auth state listener handles redirect
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      onError?.(msg);
      setStep("otp");
    }
  }

  if (step === "idle") {
    return (
      <>
        {Platform.OS === "web" && <div id="recaptcha-container" />}
        <TouchableOpacity
          style={s.btn}
          onPress={() => setStep("phone")}
          activeOpacity={0.80}
          testID="phone-auth-btn"
        >
          <Ionicons name="phone-portrait-outline" size={20} color="#A78BFA" />
          <Text style={s.btnText}>Continue with Phone</Text>
        </TouchableOpacity>
      </>
    );
  }

  if (step === "phone" || step === "sending") {
    const canSend = phone.replace(/\D/g, "").length === 10 && step !== "sending";
    return (
      <>
        {Platform.OS === "web" && <div id="recaptcha-container" />}
        <View style={s.wrap}>
          <Text style={s.stepLabel}>Enter your mobile number</Text>
          <View style={s.phoneRow}>
            <View style={s.countryCode}>
              <Text style={s.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={s.phoneInput}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="98765 43210"
              placeholderTextColor="rgba(200,180,255,0.28)"
              autoFocus
            />
          </View>
          <View style={s.rowBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setStep("idle"); setPhone(""); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
              onPress={() => sendOtp()}
              disabled={!canSend}
            >
              {step === "sending"
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.sendBtnText}>Send OTP</Text>
              }
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
        <Text style={s.stepLabel}>Enter OTP sent to</Text>
        <Text style={s.phoneDisplay}>{phoneFull}</Text>
        <TextInput
          style={s.otpInput}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="• • • • • •"
          placeholderTextColor="rgba(200,180,255,0.28)"
          autoFocus
          textAlign="center"
        />
        <TouchableOpacity
          style={[s.sendBtn, !canVerify && s.sendBtnDisabled]}
          onPress={verifyOtp}
          disabled={!canVerify}
        >
          {step === "verifying"
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.sendBtnText}>Verify & Sign In</Text>
          }
        </TouchableOpacity>
        <View style={s.resendRow}>
          {resendTimer > 0
            ? <Text style={s.resendTimer}>Resend OTP in {resendTimer}s</Text>
            : (
              <TouchableOpacity onPress={() => sendOtp(true)}>
                <Text style={s.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )
          }
          <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }}>
            <Text style={s.changePhone}>Change number</Text>
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
    backgroundColor: "rgba(123,63,242,0.15)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.40)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#C4B5FD" },

  wrap: { gap: 10 },
  stepLabel: { fontSize: 12, color: "rgba(200,180,255,0.65)", fontFamily: "Inter_400Regular" },
  phoneDisplay: { fontSize: 14, color: "#C4B5FD", fontFamily: "Inter_600SemiBold" },

  phoneRow: { flexDirection: "row", gap: 8 },
  countryCode: {
    height: 52, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  countryCodeText: { fontSize: 15, color: "#F0E8FF", fontFamily: "Inter_600SemiBold" },
  phoneInput: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.60)",
    paddingHorizontal: 14,
    fontSize: 16, color: "#F0E8FF", fontFamily: "Inter_400Regular",
  },

  otpInput: {
    height: 60, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.60)",
    fontSize: 28, color: "#F0E8FF", fontFamily: "Inter_700Bold",
    letterSpacing: 8,
  },

  rowBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  cancelText: { color: "rgba(200,180,255,0.60)", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sendBtn: {
    flex: 2, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: brand.primary,
  },
  sendBtnDisabled: { backgroundColor: "rgba(123,63,242,0.35)" },
  sendBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  resendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resendTimer: { fontSize: 12, color: "rgba(200,180,255,0.45)", fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 13, color: "#A78BFA", fontFamily: "Inter_600SemiBold" },
  changePhone: { fontSize: 13, color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular" },
});
