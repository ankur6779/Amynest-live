import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { signInWithGoogleOneTap } from "@/utils/googleOneTap";

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

export default function SignInScreen() {
  useWarmUpBrowser();
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  useEffect(() => {
    if (Platform.OS === "web") return;
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
      } catch (err) {
        Alert.alert("Sign In Failed", humanizeError(err, "Google sign-in failed. Please try again."));
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [googleResponse, router]);

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);

    if (Platform.OS === "web") {
      if (!GOOGLE_WEB_CLIENT_ID) {
        setGoogleLoading(false);
        Alert.alert("Google Sign-In Not Configured", "Use email + password for now.");
        return;
      }
      await signInWithGoogleOneTap(
        GOOGLE_WEB_CLIENT_ID,
        setGoogleLoading,
        (msg) => Alert.alert("Sign In Failed", msg),
      );
      return;
    }

    if (!GOOGLE_WEB_CLIENT_ID) {
      setGoogleLoading(false);
      Alert.alert("Google Sign-In Not Configured", "Use email + password for now.");
      return;
    }
    try {
      await promptGoogle();
    } catch (err) {
      setGoogleLoading(false);
      Alert.alert("Sign In Failed", humanizeError(err, "Google sign-in failed. Please try again."));
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const canSignIn = !loading && !!email && !!password;

  return (
    <LinearGradient
      colors={["#0D0022", "#180040", "#0A001E"]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      {/* Ambient orbs */}
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

            {/* Google */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              testID="google-sign-in-btn"
              activeOpacity={0.80}
            >
              {googleLoading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="logo-google" size={20} color="#EA4335" />
              }
              <Text style={styles.googleBtnText}>
                {googleLoading ? t("auth.connecting") : t("auth.continue_with_google")}
              </Text>
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
              <Text style={styles.label}>{t("auth.password")}</Text>
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
  subtitle: { fontSize: 14, color: "rgba(200,180,255,0.65)", fontFamily: "Inter_400Regular", marginBottom: 4 },

  googleBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.10)" },
  dividerText: { fontSize: 12, color: "rgba(200,180,255,0.35)", fontFamily: "Inter_400Regular" },

  inputGroup: { gap: 7 },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(200,180,255,0.80)", fontFamily: "Inter_600SemiBold" },
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

  primaryBtnWrap: { marginTop: 4 },
  primaryBtn: {
    height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center",
    shadowColor: "#7B3FF2", shadowOpacity: 0.65, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: "rgba(200,180,255,0.50)", fontFamily: "Inter_400Regular", fontSize: 14 },
  linkText: { color: "#C084FC", fontWeight: "600", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
