import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { brand } from "@/constants/colors";
import { humanizeError } from "@/utils/humanizeError";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const isLoaded = true;
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSignUp = async () => {
    if (firstName.trim().length < 2) {
      Alert.alert("Invalid Name", "Please enter your first name (at least 2 characters).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      try {
        await updateProfile(cred.user, { displayName: firstName.trim() });
      } catch {
        /* non-fatal */
      }
      // AuthGate in _layout.tsx handles navigation once Firebase auth state updates.
      // Do NOT call router.replace here — it races with AuthGate and causes +not-found.
    } catch (err: unknown) {
      console.error("[sign-up] create failed", err);
      Alert.alert("Sign Up Failed", humanizeError(err, "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    // Firebase Auth doesn't require an email verification code to sign in.
    // AuthGate handles navigation automatically once auth state is updated.
  };

  // Complete Google sign-up once expo-auth-session returns an idToken.
  useEffect(() => {
    const r = googleResponse as { type?: string; params?: Record<string, string> } | null;
    if (r?.type !== "success") {
      if (r && r.type !== "success") setGoogleLoading(false);
      return;
    }
    const idToken = (r.params as { id_token?: string } | undefined)?.id_token;
    if (!idToken) {
      setGoogleLoading(false);
      Alert.alert("Sign Up Failed", "Google did not return an ID token.");
      return;
    }
    (async () => {
      try {
        const cred = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, cred);
        // AuthGate handles navigation once Firebase auth state updates.
      } catch (err) {
        console.error("[sign-up] google credential failed", err);
        Alert.alert("Sign Up Failed", humanizeError(err, "Google sign-in failed. Please try again."));
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [googleResponse, router]);

  const handleGoogleSignUp = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        "Google Sign-In Not Configured",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing. Use email + password for now.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      await promptGoogle();
    } catch (err) {
      console.error("[sign-up] google prompt failed", err);
      setGoogleLoading(false);
      Alert.alert("Sign Up Failed", humanizeError(err, "Google sign-in failed. Please try again."));
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <LinearGradient
      colors={["#0f0c29", "#1a1040", "#0c1220"]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      {/* Ambient orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>AmyNest AI</Text>
            <Text style={styles.brandTag}>Where Smart Parenting Starts</Text>
          </View>

          {step === "form" ? (
            <>
              <Text style={styles.title}>{t("auth.create_account")}</Text>
              <Text style={styles.subtitle}>{t("auth.sign_up_subtitle")}</Text>

              <View style={styles.form}>
                {/* Google button */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleSignUp}
                  disabled={googleLoading}
                  testID="google-sign-up-btn"
                  activeOpacity={0.85}
                >
                  <View style={styles.googleBtnInner}>
                    {googleLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    )}
                    <Text style={styles.googleBtnText}>
                      {googleLoading ? t("auth.connecting") : t("auth.continue_with_google")}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>{t("auth.or_email_signup")}</Text>
                  <View style={styles.divider} />
                </View>

                {/* First Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("auth.first_name")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Your first name"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      autoComplete="given-name"
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("auth.email")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("auth.password")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn} hitSlop={8}>
                      <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Create account button */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={loading || !email || !password || !firstName}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={(loading || !email || !password || !firstName) ? ["#4B4B6B", "#4B4B6B"] : [brand.primary, "#FF4ECD"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.primaryBtnText}>{t("auth.create_account")}</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>{t("auth.have_account")} </Text>
                  <Link href="/sign-in" asChild>
                    <TouchableOpacity><Text style={styles.linkText}>{t("auth.sign_in")}</Text></TouchableOpacity>
                  </Link>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t("auth.check_email")}</Text>
              <Text style={styles.subtitle}>{t("auth.verify_subtitle")}{"\n"}{email}</Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("auth.verification_code")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      placeholder="6-digit code"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={loading || !code}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={(loading || !code) ? ["#4B4B6B", "#4B4B6B"] : [brand.primary, "#FF4ECD"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.primaryBtnText}>{t("auth.verify_email")}</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep("form")} style={{ alignItems: "center", marginTop: 4 }}>
                  <Text style={styles.linkText}>← Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: {
    position: "absolute", top: -80, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(123,63,242,0.18)",
  },
  orb2: {
    position: "absolute", bottom: 80, left: -80,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,78,205,0.12)",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 28, justifyContent: "center", paddingVertical: 32 },
  brandRow: { flexDirection: "column", gap: 2, marginBottom: 36 },
  brandName: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  brandTag: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  title: { fontSize: 30, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", marginBottom: 32 },
  form: { gap: 16 },
  googleBtn: {
    height: 56, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  googleBtnInner: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter_400Regular" },
  inputGroup: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)", fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
    shadowColor: brand.primary, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
  footerText: { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" },
  linkText: { color: brand.violet400, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
