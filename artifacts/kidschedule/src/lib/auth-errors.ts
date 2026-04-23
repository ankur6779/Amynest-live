export function prettyAuthError(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case "auth/invalid-email":
      return "That email looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a minute.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.";
    case "auth/unauthorized-domain":
      return `This domain is not authorized in Firebase. Add "${typeof window !== "undefined" ? window.location.hostname : "this domain"}" to Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "";
    case "auth/network-request-failed":
      return "Network error. Check your connection and retry.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}
