import React, {  useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { humanizeError } from "@/utils/humanizeError";
import { API_BASE_URL } from "@/constants/api";
import PhoneAuthFlow from "@/components/PhoneAuthFlow";
import NeonRingHero from "@/components/NeonRingHero";
import { BRAND_GRADIENT, BRAND_GRADIENT_DISABLED, brand, brandAlpha, brandExtended } from "@/constants/colors";

type ViewMode = "signin" | "reset" | "reset-sent";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [mode, setMode] = useState<ViewMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState("");
  const [resetFocused, setResetFocused] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    } catch (err: unknown) {
      Alert.alert(t("alerts.signin.failed_title"), humanizeError(err, t("alerts.signin.failed_default")));
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetEmail(email);
    setResetError(null);
    setMode("reset");
  };

  const handleSendReset = async () => {
    if (!resetEmail.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResetLoading(true);
    setResetError(null);
    try {
      const checkRes = await fetch(`${API_BASE_URL}/api/auth/check-reset-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const checkData = (await checkRes.json()) as { exists?: boolean };
      if (!checkData.exists) {
        setResetError(t("screens.sign_in.reset_not_found"));
        return;
      }
      await sendPasswordResetEmail(firebaseAuth, resetEmail.trim());
      setMode("reset-sent");
    } catch (err: unknown) {
      setResetError(humanizeError(err, t("screens.sign_in.couldnt_send_reset")));
    } finally {
      setResetLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const canSignIn = !loading && !!email && !!password;
  const canReset = !resetLoading && !!resetEmail.trim();

  // ─── Reset-sent confirmation ────────────────────────────────────────────────
  if (mode === "reset-sent") {
    return (
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]} // audit-ok: intentional dark bg / custom color
        style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroWrap}>
            <NeonRingHero />
          </View>
          <View style={styles.card}>
            <Text style={styles.sentEmoji}>📬</Text>
            <Text style={styles.title}>{t("screens.sign_in.check_your_inbox")}</Text>
            <Text style={styles.subtitle}>
              {t("screens.sign_in.inbox_body_before")}{"\n"}
              <Text style={styles.resetEmailHighlight}>{resetEmail}</Text>
              {"\n"}{t("screens.sign_in.inbox_body_after")}
            </Text>
            <TouchableOpacity
              onPress={() => setMode("signin")}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={BRAND_GRADIENT}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{t("screens.sign_in.back_to_sign_in")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ─── Forgot-password form ────────────────────────────────────────────────────
  if (mode === "reset") {
    return (
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]} // audit-ok: intentional dark bg / custom color
        style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroWrap}>
              <NeonRingHero />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>{t("screens.sign_in.reset_password")}</Text>
              <Text style={styles.subtitle}>{t("screens.sign_in.enter_your_email_and_we_ll_send_you_a_re")}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <View style={[styles.inputWrap, resetFocused && styles.inputWrapFocused]}>
                  <Ionicons name="mail-outline" size={18} color={resetFocused ? brand.violet400 : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder={t("screens.sign_in.you_example_com")}
                    placeholderTextColor="rgba(200,180,255,0.28)"
                    onFocus={() => setResetFocused(true)}
                    onBlur={() => setResetFocused(false)}
                    autoFocus
                    testID="reset-email-input"
                  />
                </View>
              </View>

              {resetError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={brandExtended.errorSoft} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{resetError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSendReset}
                disabled={!canReset}
                activeOpacity={0.85}
                style={styles.primaryBtnWrap}
                testID="send-reset-btn"
              >
                <LinearGradient
                  colors={canReset ? BRAND_GRADIENT : BRAND_GRADIENT_DISABLED}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryBtnText}>{t("screens.sign_in.send_reset_link")}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode("signin")} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={14} color="rgba(200,180,255,0.55)" style={{ marginRight: 4 }} />
                <Text style={styles.backBtnText}>{t("screens.sign_in.back_to_sign_in")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ─── Normal sign-in form ─────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={["#0f0c29", "#302b63", "#24243e"]} // audit-ok: intentional dark bg / custom color
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Neon ring hero */}
          <View style={styles.heroWrap}>
            <NeonRingHero />
          </View>

          {/* Platform glow under ring */}
          <View style={styles.platformGlow} />

          {/* Glass card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t("auth.welcome_back")}</Text>
            <Text style={styles.subtitle}>{t("auth.sign_in_subtitle")}</Text>

            {/* Phone OTP */}
            <PhoneAuthFlow
              onError={(msg) => Alert.alert(t("alerts.signin.failed_title"), msg)}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t("auth.or_email")}</Text>
              <View style={styles.divider} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <View style={[styles.inputWrap, focusedField === "email" && styles.inputWrapFocused]}>
                <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? brand.violet400 : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder={t("screens.sign_in.you_example_com")}
                  placeholderTextColor="rgba(200,180,255,0.28)"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  testID="email-input"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>{t("auth.password")}</Text>
                <TouchableOpacity onPress={openReset} hitSlop={8} testID="forgot-password-btn">
                  <Text style={styles.forgotLink}>{t("screens.sign_in.forgot_password")}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? brand.violet400 : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                  placeholder="••••••••"
                  placeholderTextColor="rgba(200,180,255,0.28)"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  testID="password-input"
                />
                <TouchableOpacity onPress={() => setShowPass(s => !s)} hitSlop={10} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(200,180,255,0.45)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={!canSignIn}
              activeOpacity={0.85}
              testID="sign-in-btn"
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={canSignIn ? BRAND_GRADIENT : BRAND_GRADIENT_DISABLED}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.primaryBtnText}>{t("auth.sign_in")}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t("auth.no_account")} </Text>
              <Link href="/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>{t("auth.sign_up")}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <Text style={styles.tagline}>{t("screens.sign_in.where_smart_parenting_begins")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  orb1: {
    position: "absolute", top: -140, right: -100,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: "rgba(100,40,200,0.20)",
  },
  orb2: {
    position: "absolute", bottom: 60, left: -120,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: brandAlpha.purple500_10,
  },

  scroll: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", paddingVertical: 36 },

  heroWrap: { alignItems: "center", marginBottom: 0 },

  platformGlow: {
    width: 130,
    height: 22,
    marginTop: -4,
    marginBottom: 8,
    borderRadius: 65,
    backgroundColor: brandAlpha.purple500_30,
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(12,6,30,0.78)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_28,
    padding: 24,
    shadowColor: BRAND_GRADIENT[0],
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
    gap: 14,
  },

  title: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: "rgba(200,180,255,0.65)", fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 20 },

  sentEmoji: { fontSize: 40, textAlign: "center" },
  resetEmailHighlight: { color: brand.purple400, fontWeight: "600" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: brandAlpha.purple500_15 },
  dividerText: { fontSize: 12, color: "rgba(255,255,255,0.30)", fontFamily: "Inter_400Regular" },

  inputGroup: { gap: 7 },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(200,180,255,0.80)", fontFamily: "Inter_600SemiBold" },

  passwordLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  forgotLink: { fontSize: 12, fontWeight: "600", color: BRAND_GRADIENT[0], fontFamily: "Inter_600SemiBold" },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 52, borderRadius: 14,
    backgroundColor: "rgba(10,6,26,0.72)",
    borderWidth: 1, borderColor: brandAlpha.purple500_25,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: brandAlpha.purple500_75,
    shadowColor: BRAND_GRADIENT[0], shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: brandExtended.softPurple, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "rgba(255,60,60,0.12)",
    borderWidth: 1, borderColor: "rgba(255,60,60,0.25)",
    borderRadius: 12, padding: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: brandExtended.errorSoft, fontFamily: "Inter_400Regular", lineHeight: 18 },

  primaryBtnWrap: { marginTop: 4 },
  primaryBtn: {
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND_GRADIENT[1],
    shadowOpacity: 0.50,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },

  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4, paddingVertical: 6 },
  backBtnText: { fontSize: 14, color: "rgba(200,180,255,0.55)", fontFamily: "Inter_400Regular" },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular", fontSize: 14 },
  linkText: { color: BRAND_GRADIENT[0], fontWeight: "600", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  tagline: { marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.22)", fontFamily: "Inter_400Regular" },
});
