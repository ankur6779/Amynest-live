import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { brand } from "@/constants/colors";
import { humanizeError } from "@/utils/humanizeError";
import PhoneAuthFlow from "@/components/PhoneAuthFlow";

type ViewMode = "signin" | "reset" | "reset-sent";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [mode, setMode] = useState<ViewMode>("signin");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Reset-password state
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
      Alert.alert("Sign In Failed", humanizeError(err, "Please check your details and try again."));
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
      await sendPasswordResetEmail(firebaseAuth, resetEmail.trim());
      setMode("reset-sent");
    } catch (err: unknown) {
      setResetError(humanizeError(err, "Couldn't send reset email. Please try again."));
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
        colors={["#0D0022", "#180040", "#0A001E"]}
        style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <View style={styles.logoGlowRing}>
              <Image
                source={require("../assets/images/amynest-logo.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.sentEmoji}>📬</Text>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We've sent a reset link to{"\n"}
              <Text style={styles.resetEmailHighlight}>{resetEmail}</Text>
              {"\n"}Check spam if you don't see it.
            </Text>
            <TouchableOpacity
              onPress={() => setMode("signin")}
              activeOpacity={0.85}
              style={styles.primaryBtnWrap}
            >
              <LinearGradient
                colors={[brand.primary, "#FF4ECD"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Back to Sign in</Text>
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
        colors={["#0D0022", "#180040", "#0A001E"]}
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
            <View style={styles.logoWrap}>
              <View style={styles.logoGlowRing}>
                <Image
                  source={require("../assets/images/amynest-logo.png")}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <View style={[styles.inputWrap, resetFocused && styles.inputWrapFocused]}>
                  <Ionicons name="mail-outline" size={18} color={resetFocused ? "#A78BFA" : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="you@example.com"
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
                  <Ionicons name="alert-circle-outline" size={15} color="#FF8080" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{resetError}</Text>
                </View>
              )}

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSendReset}
                disabled={!canReset}
                activeOpacity={0.85}
                style={styles.primaryBtnWrap}
                testID="send-reset-btn"
              >
                <LinearGradient
                  colors={canReset ? [brand.primary, "#FF4ECD"] : ["rgba(60,30,100,0.6)", "rgba(60,30,100,0.6)"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryBtnText}>Send reset link</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Back link */}
              <TouchableOpacity onPress={() => setMode("signin")} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={14} color="rgba(200,180,255,0.55)" style={{ marginRight: 4 }} />
                <Text style={styles.backBtnText}>Back to Sign in</Text>
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
      colors={["#0D0022", "#180040", "#0A001E"]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoGlowRing}>
              <Image
                source={require("../assets/images/amynest-logo.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>AmyNest AI</Text>
            <Text style={styles.brandTag}>Where Smart Parenting Starts</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t("auth.welcome_back")}</Text>
            <Text style={styles.subtitle}>{t("auth.sign_in_subtitle")}</Text>

            {/* Phone OTP */}
            <PhoneAuthFlow
              onError={(msg) => Alert.alert("Sign In Failed", msg)}
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
                <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? "#A78BFA" : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder="you@example.com"
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
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrap, focusedField === "password" && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? "#A78BFA" : "rgba(200,180,255,0.40)"} style={styles.inputIcon} />
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
                colors={canSignIn ? [brand.primary, "#FF4ECD"] : ["rgba(60,30,100,0.6)", "rgba(60,30,100,0.6)"]}
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
    backgroundColor: "rgba(123,63,242,0.28)",
  },
  orb2: {
    position: "absolute", bottom: 60, left: -120,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(255,78,205,0.18)",
  },
  orb3: {
    position: "absolute", top: "45%", left: "15%",
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(80,30,180,0.16)",
  },

  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center", paddingVertical: 36 },

  logoWrap: { alignItems: "center", marginBottom: 28 },
  logoGlowRing: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: "rgba(123,63,242,0.18)",
    borderWidth: 1.5, borderColor: "rgba(123,63,242,0.55)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#7B3FF2", shadowOpacity: 0.60, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    overflow: "hidden",
  },
  logoImg: { width: 66, height: 66 },
  brandName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  brandTag: { fontSize: 12, color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular", marginTop: 2 },

  card: {
    backgroundColor: "rgba(18,4,45,0.72)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(123,63,242,0.30)",
    padding: 24,
    shadowColor: "#7B3FF2", shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    gap: 14,
  },

  title: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: "rgba(200,180,255,0.65)", fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 20 },

  sentEmoji: { fontSize: 40, textAlign: "center" },
  resetEmailHighlight: { color: "#C084FC", fontWeight: "600" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.10)" },
  dividerText: { fontSize: 12, color: "rgba(200,180,255,0.35)", fontFamily: "Inter_400Regular" },

  inputGroup: { gap: 7 },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(200,180,255,0.80)", fontFamily: "Inter_600SemiBold" },

  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C084FC",
    fontFamily: "Inter_600SemiBold",
  },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.22)",
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: "rgba(123,63,242,0.80)",
    shadowColor: "#7B3FF2", shadowOpacity: 0.30, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#F0E8FF", fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,60,60,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,60,60,0.25)",
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#FF8080",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  primaryBtnWrap: { marginTop: 4 },
  primaryBtn: {
    height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center",
    shadowColor: "#7B3FF2", shadowOpacity: 0.65, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 14,
    color: "rgba(200,180,255,0.55)",
    fontFamily: "Inter_400Regular",
  },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular", fontSize: 14 },
  linkText: { color: "#C084FC", fontWeight: "600", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
