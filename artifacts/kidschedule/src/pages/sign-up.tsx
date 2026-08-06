/**
 * Keep — Safe Keeping (was Signup).
 * Question ONLY: Can what we started be held safely?
 *
 * Founder memory law:
 * A parent should never remember how they entered.
 * They should only remember why — their child.
 * Authentication exists. Authentication is never experienced.
 * Finish thinking about Google → FAIL. Finish thinking about their child → PASS.
 */

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { isEmailVerificationBypassEmail } from "@/lib/email-verification-bypass";
import { sendUserEmailVerification } from "@/lib/email-verification";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  prettyAuthError,
  stashVerificationSendError,
  logFirebaseAuthError,
} from "@/lib/auth-errors";
import { handleGoogleLogin } from "@/lib/google-auth";
import { handleAppleLogin } from "@/lib/apple-auth";
import { FacebookSignInButton } from "@/components/facebook-sign-in-button";
import PhoneAuthFlow from "@/components/phone-auth-flow";
import { PhoneRecaptchaPreload } from "@/components/phone-recaptcha-preload";
import {
  shouldShowAppleSignIn,
  shouldShowGoogleSignIn,
  shouldShowFacebookSignIn,
  shouldShowPhoneOtp,
} from "@/lib/auth-feature-flags";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { getGuestSession, resolveV2PostAuthPath } from "@/v2/guest";
import {
  V2_ATMOSPHERE,
  V2_CTA,
  V2_MEASURE,
  V2_EXIT,
  V2_FIELD,
  V2_HERO_LIGHT,
  V2_HIERARCHY_WHISPER,
  V2_INPUT,
  V2_LAYOUT,
  V2_PREPARE_COPY,
  V2_PRESS_PRIMARY,
  V2_SCROLL,
  V2_SCROLL_PAD,
  V2_SHELL,
  V2_SPACE,
  V2_TYPE,
  v2LawRole,
  v2LitProps,
} from "@/v2/craft";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { onPreSignupSignupStarted } from "@/lib/pre-signup-reengagement/orchestrator";
import { markPreSignupSignupFlowActive } from "@/lib/pre-signup-reengagement/storage";
import { trackStartupFunnel } from "@/lib/startup-funnel";
import {
  AUTH_INPUT_CLASS,
  useNativeAuthKeyboard,
} from "@/hooks/use-native-auth-keyboard";
import {
  AuthKeyboardShell,
  NATIVE_AUTH_SHELL_PADDING,
} from "@/components/auth-keyboard-shell";
import { withAuthTimeout } from "@/lib/auth-timeout";
import { Button } from "@/components/ui/button";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";

/** Mist instrument — never Soft Plate peers of the keep Bloom. */
const KEEP_MIST =
  `${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-50 bg-transparent border-0 p-0 cursor-pointer`;

function KeepShell({ children }: { children: React.ReactNode }) {
  const nativeShell = isNativeAmyNestShell();
  const { kavRef, scrollRef, keyboardOpen, handleBackgroundTap } =
    useNativeAuthKeyboard(nativeShell);
  const lit = v2LitProps(
    `${V2_SHELL} ${V2_SCROLL} ${V2_SCROLL_PAD} ${V2_ATMOSPHERE} text-foreground ${V2_LAYOUT.viewport}`,
  );

  return (
    <AuthKeyboardShell
      kavRef={nativeShell ? kavRef : undefined}
      scrollRef={nativeShell ? scrollRef : undefined}
      keyboardOpen={keyboardOpen}
      onBackgroundTap={nativeShell ? handleBackgroundTap : undefined}
      style={
        nativeShell
          ? { padding: NATIVE_AUTH_SHELL_PADDING, minHeight: undefined }
          : undefined
      }
    >
      <main
        {...lit}
        data-testid="v2-keep-shell"
        data-v2-room="keep"
        aria-labelledby="v2-keep-heading"
      >
        {children}
      </main>
    </AuthKeyboardShell>
  );
}

function QuietError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      data-testid="v2-signup-error"
      className={`${V2_TYPE.caption} text-muted-foreground`}
    >
      {children}
    </div>
  );
}

function buildKeepHero(session: ReturnType<typeof getGuestSession>): {
  title: string;
  support: string;
} {
  const name = session?.name?.trim();
  const concern =
    FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === session?.worry)?.label ??
    null;

  if (name && concern) {
    return {
      title: `Protect ${name}'s care today.`,
      support: `${concern} — what you've begun stays held, quietly.`,
    };
  }
  if (name) {
    return {
      title: `Protect ${name}'s care today.`,
      support: "What you've begun stays held — quietly.",
    };
  }
  return {
    title: "Protect today's care.",
    support: "What you've started with Amy stays held — when you're ready.",
  };
}

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  /** Spare keys stay closed — auth must not be the memory of the room. */
  const [spareOpen, setSpareOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation(resolveV2PostAuthPath("/"));
    }
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("amynest_pre_signup_started") === "1") return;
      sessionStorage.setItem("amynest_pre_signup_started", "1");
    } catch {
      /* ignore */
    }
    markPreSignupSignupFlowActive();
    onPreSignupSignupStarted();
  }, []);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await withAuthTimeout(
        createUserWithEmailAndPassword(firebaseAuth, email.trim(), password),
        "createUserWithEmailAndPassword",
      );
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          /* non-fatal */
        }
      }
      void import("@/lib/meta-attribution").then(
        ({ trackMetaCompleteRegistration }) => {
          trackMetaCompleteRegistration("email");
        },
      );
      trackStartupFunnel("account_created", { meta: { method: "email" } });
      const signupEmail = (cred.user.email ?? email.trim()).toLowerCase().trim();
      if (isEmailVerificationBypassEmail(signupEmail)) {
        try {
          await cred.user.getIdToken(true);
        } catch {
          /* non-fatal */
        }
        if (isNativeAmyNestShell()) {
          await ensureAuthContextSynced();
          navigateAfterAuth(resolveV2PostAuthPath("/"));
          return;
        }
        setLocation(resolveV2PostAuthPath("/"));
        return;
      }
      let verifySendFailed = false;
      try {
        await sendUserEmailVerification(cred.user);
      } catch (verifyErr: unknown) {
        logFirebaseAuthError("sign-up:sendEmailVerification", verifyErr);
        stashVerificationSendError(verifyErr);
        verifySendFailed = true;
      }
      const q = new URLSearchParams({ email: email.trim() });
      if (verifySendFailed) q.set("sendFailed", "1");
      else q.set("sent", "1");
      setLocation(`/verify-email?${q.toString()}`);
    } catch (err: unknown) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const runGoogle = async () => {
    if (oauthBusy) return;
    setOauthBusy("google");
    setError(null);
    try {
      const destination = await handleGoogleLogin();
      if (typeof destination === "string" && destination) {
        setLocation(destination);
        navigateAfterAuth(destination);
      }
    } catch (err: unknown) {
      logFirebaseAuthError("google:sign-in", err);
      const code = (err as { code?: string })?.code ?? "";
      const message = prettyAuthError(err);
      if (message) setError(message);
      else if (
        code !== "auth/popup-closed-by-user" &&
        code !== "app/user_cancelled"
      ) {
        setError("Google could not finish. Try again when ready.");
      }
    } finally {
      setOauthBusy(null);
    }
  };

  const runApple = async () => {
    if (oauthBusy) return;
    setOauthBusy("apple");
    setError(null);
    try {
      await handleAppleLogin();
    } catch (err: unknown) {
      logFirebaseAuthError("apple:sign-in", err);
      const message = prettyAuthError(err);
      if (message) setError(message);
    } finally {
      setOauthBusy(null);
    }
  };

  const canSubmit = Boolean(email.trim() && password.length >= 6);
  const session = getGuestSession();
  const { title, support } = buildKeepHero(session);

  const showApple = shouldShowAppleSignIn();
  const showGoogle = shouldShowGoogleSignIn();
  const showFacebook = shouldShowFacebookSignIn();
  const showPhone = shouldShowPhoneOtp();
  const showSpare = showApple || showGoogle || showFacebook || showPhone;

  return (
    <KeepShell>
      <header
        className={`${V2_SPACE.heroStack} ${V2_HERO_LIGHT}`}
        {...v2LawRole("hero")}
      >
        <p className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}>Keep</p>
        <h1
          id="v2-keep-heading"
          className={`${V2_TYPE.heroCompact} ${V2_MEASURE.hero}`}
        >
          {title}
        </h1>
        <p
          className={`${V2_TYPE.bodyMuted} ${V2_MEASURE.support}`}
          data-testid="v2-signup-continuity-subline"
          {...v2LawRole("support")}
        >
          {support}
        </p>
      </header>

      <form
        onSubmit={onEmail}
        className={`${V2_SPACE.mt4} flex ${V2_MEASURE.support} flex-col ${V2_SPACE.stack3}`}
      >
        <div className={V2_SPACE.stack2}>
          <label className="sr-only" htmlFor="keep-name">
            Name
          </label>
          <input
            id="keep-name"
            type="text"
            className={`${AUTH_INPUT_CLASS} w-full ${V2_FIELD} ${V2_SPACE.rowPad} ${V2_INPUT} ${V2_TYPE.body}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How we may know you"
            autoComplete="name"
          />

          <label className="sr-only" htmlFor="keep-email">
            Email
          </label>
          <input
            id="keep-email"
            type="email"
            required
            className={`${AUTH_INPUT_CLASS} w-full ${V2_FIELD} ${V2_SPACE.rowPad} ${V2_INPUT} ${V2_TYPE.body}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Where to reach you"
            autoComplete="email"
          />

          <div className="relative">
            <label className="sr-only" htmlFor="keep-password">
              Password
            </label>
            <input
              id="keep-password"
              type={showPass ? "text" : "password"}
              required
              minLength={6}
              className={`${AUTH_INPUT_CLASS} w-full ${V2_FIELD} ${V2_SPACE.rowPad} ${V2_INPUT} ${V2_TYPE.body}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Something only you know"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER} absolute right-4 top-1/2 -translate-y-1/2`}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error ? <QuietError>{error}</QuietError> : null}

        <Button
          type="submit"
          disabled={busy || !canSubmit}
          className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
          data-testid="v2-keep-save"
          {...v2LawRole("primary")}
        >
          {busy ? V2_PREPARE_COPY.signupBusy : "Keep this safe"}
        </Button>
      </form>

      {showSpare ? (
        <div
          className={`${V2_SPACE.mt4} ${V2_MEASURE.support} ${V2_HIERARCHY_WHISPER}`}
          data-testid="v2-keep-social-whisper"
        >
          {!spareOpen ? (
            <button
              type="button"
              className={KEEP_MIST}
              data-testid="v2-keep-other-ways"
              onClick={() => setSpareOpen(true)}
            >
              Another way
            </button>
          ) : (
            <div className={`flex flex-col items-start ${V2_SPACE.stack1}`}>
              <p className={`${V2_TYPE.caption} text-muted-foreground`}>
                Still protecting the same care.
              </p>
              {showApple ? (
                <button
                  type="button"
                  className={KEEP_MIST}
                  disabled={Boolean(oauthBusy)}
                  data-testid="button-apple-sign-in"
                  onClick={() => void runApple()}
                >
                  {oauthBusy === "apple" ? "One moment…" : "Apple"}
                </button>
              ) : null}
              {showGoogle ? (
                <button
                  type="button"
                  className={KEEP_MIST}
                  disabled={Boolean(oauthBusy)}
                  data-testid="button-google-sign-in"
                  onClick={() => void runGoogle()}
                >
                  {oauthBusy === "google" ? "One moment…" : "Google"}
                </button>
              ) : null}
              {showFacebook ? (
                <div className={V2_HIERARCHY_WHISPER}>
                  <FacebookSignInButton onError={(msg) => setError(msg)} />
                </div>
              ) : null}
              {showPhone ? (
                <div className={V2_HIERARCHY_WHISPER}>
                  <PhoneRecaptchaPreload />
                  <PhoneAuthFlow onError={(msg) => setError(msg)} />
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div
        className={`${V2_SPACE.mt4} flex flex-col items-start ${V2_SPACE.stack1} ${V2_HIERARCHY_WHISPER}`}
      >
        <Link
          href="/today"
          className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground`}
          data-testid="v2-keep-back"
        >
          {V2_EXIT.backToToday}
        </Link>
        <Link
          href="/sign-in"
          className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`}
        >
          Already held? Continue
        </Link>
        <p className={`${V2_TYPE.caption} text-muted-foreground`}>
          <Link
            href="/terms"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            Terms
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/support"
            className="underline-offset-4 hover:underline hover:text-foreground"
          >
            Support
          </Link>
        </p>
      </div>
    </KeepShell>
  );
}
