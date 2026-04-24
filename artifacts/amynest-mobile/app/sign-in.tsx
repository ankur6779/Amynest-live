import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
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
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { humanizeError } from "@/utils/humanizeError";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
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
  const c = useColors();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(c, mode), [c, mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      // AuthGate in _layout.tsx handles navigation once Firebase auth state updates.
      // Do NOT call router.replace here — it races with AuthGate and causes +not-found.
    } catch (err: unknown) {
      console.error("[sign-in] failed", err);
      Alert.alert("Sign In Failed", humanizeError(err, "Please check your details and try again."));
    } finally {
      setLoading(false);
    }
  };

  // Complete Google sign-in once expo-auth-session returns an idToken.
  useEffect(() => {
    const r = googleResponse as { type?: string; params?: Record<string, string> } | null;
    if (r?.type !== "success") {
      if (r && r.type !== "success") setGoogleLoading(false);
      return;
    }
    const idToken = (r.params as { id_token?: string } | undefined)?.id_token;
    if (!idToken) {
      setGoogleLoading(false);
      Alert.alert("Sign In Failed", "Google did not return an ID token.");
      return;
    }
    (async () => {
      try {
        const cred = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, cred);
        // AuthGate handles navigation once Firebase auth state updates.
      } catch (err) {
        console.error("[sign-in] google credential failed", err);
        Alert.alert("Sign In Failed", humanizeError(err, "Google sign-in failed. Please try again."));
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [googleResponse, router]);

  const handleGoogleSignIn = async () => {
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
      console.error("[sign-in] google prompt failed", err);
      setGoogleLoading(false);
      Alert.alert("Sign In Failed", humanizeError(err, "Google sign-in failed. Please try again."));
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Sign-in gets the theme's ambient gradient. Dark mode keeps the original
  // brand-night look; light mode shifts to a soft violet wash.
  const bgGradient: readonly [string, string, string] =
    mode === "dark"
      ? (["#0f0c29", "#1a1040", "#0c1220"] as const)
      : theme.gradient;

  return (
    <LinearGradient
      colors={bgGradient}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      {/* Ambient orbs — brand colours, opacity tuned per mode */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>AmyNest AI</Text>
            <Text style={styles.brandTag}>Where Smart Parenting Starts</Text>
          </View>

          <Text style={styles.title}>{t("auth.welcome_back")}</Text>
          <Text style={styles.subtitle}>{t("auth.sign_in_subtitle")}</Text>

          <View style={styles.form}>
            {/* Google button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              testID="google-sign-in-btn"
              activeOpacity={0.85}
            >
              <View style={styles.googleBtnInner}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={c.foreground} />
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
              <Text style={styles.dividerText}>{t("auth.or_email")}</Text>
              <View style={styles.divider} />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={c.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder="you@example.com"
                  placeholderTextColor={c.textDim}
                  testID="email-input"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("auth.password")}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={c.textDim} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                  placeholder="••••••••"
                  placeholderTextColor={c.textDim}
                  testID="password-input"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn} hitSlop={8}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={c.textDim} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading || !email || !password}
              activeOpacity={0.85}
              testID="sign-in-btn"
            >
              <LinearGradient
                colors={(loading || !email || !password) ? ["#4B4B6B", "#4B4B6B"] : [brand.primary, "#FF4ECD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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

function makeStyles(c: ReturnType<typeof useColors>, mode: "light" | "dark") {
  const inputBg = mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.04)";
  const inputBorder = mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
  const dividerBg = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const orb1Bg = mode === "dark" ? "rgba(123,63,242,0.18)" : "rgba(123,63,242,0.10)";
  const orb2Bg = mode === "dark" ? "rgba(255,78,205,0.12)" : "rgba(255,78,205,0.08)";

  return StyleSheet.create({
    container: { flex: 1 },
    orb1: {
      position: "absolute", top: -80, right: -60,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: orb1Bg,
    },
    orb2: {
      position: "absolute", bottom: 80, left: -80,
      width: 180, height: 180, borderRadius: 90,
      backgroundColor: orb2Bg,
    },
    scroll: { flexGrow: 1, paddingHorizontal: 28, justifyContent: "center", paddingVertical: 32 },
    brandRow: { flexDirection: "column", gap: 2, marginBottom: 36 },
    brandName: { fontSize: 28, fontWeight: "800", color: c.foreground, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    brandTag: { fontSize: 12, color: c.textMuted, fontFamily: "Inter_400Regular" },
    title: { fontSize: 30, fontWeight: "700", color: c.foreground, fontFamily: "Inter_700Bold", marginBottom: 6 },
    subtitle: { fontSize: 15, color: c.textMuted, fontFamily: "Inter_400Regular", marginBottom: 32 },
    form: { gap: 16 },
    googleBtn: {
      height: 56, borderRadius: 16,
      backgroundColor: inputBg,
      borderWidth: 1, borderColor: inputBorder,
      overflow: "hidden",
    },
    googleBtnInner: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    },
    googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    divider: { flex: 1, height: 1, backgroundColor: dividerBg },
    dividerText: { fontSize: 12, color: c.textDim, fontFamily: "Inter_400Regular" },
    inputGroup: { gap: 7 },
    label: { fontSize: 13, fontWeight: "600", color: c.textBody, fontFamily: "Inter_600SemiBold" },
    inputWrap: {
      flexDirection: "row", alignItems: "center",
      height: 54, borderRadius: 14,
      backgroundColor: inputBg,
      borderWidth: 1, borderColor: inputBorder,
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1, fontSize: 15, color: c.foreground, fontFamily: "Inter_400Regular",
    },
    eyeBtn: { padding: 4 },
    primaryBtn: {
      height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center",
      shadowColor: brand.primary, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
    footerText: { color: c.textMuted, fontFamily: "Inter_400Regular" },
    linkText: { color: brand.violet400, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}
