import { createContext } from "react";

// This file holds ONLY the React context + types — no components, no hooks.
//
// Why a separate file: @vitejs/plugin-react's Fast Refresh requires every
// `.tsx` module to export ONLY components. If `firebase-auth.tsx` (the
// components file) also exported the context object or the types, every HMR
// update would invalidate the file and cascade-invalidate ~35 dependent
// pages, forcing a full re-render. During that storm React's dispatcher
// could end up referencing a stale module instance and "Invalid hook call"
// would surface in <FirebaseAuthProvider>.
//
// Keeping the context here means firebase-auth.tsx stays a clean component
// boundary and HMR can fast-refresh it in place.

export interface ShimEmailAddress {
  emailAddress: string;
}

export interface ShimUser {
  id: string;
  uid: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  emailAddresses: ShimEmailAddress[];
  primaryEmailAddress: ShimEmailAddress | null;
  primaryPhoneNumber: { phoneNumber: string } | null;
  /** Stub — Firebase Auth alone can't host avatars. */
  setProfileImage: (args: { file: File }) => Promise<void>;
}

export interface AuthState {
  user: ShimUser | null;
  isLoaded: boolean;
}

export type Listener = (snapshot: { user: ShimUser | null }) => void;

export interface AuthContextValue extends AuthState {
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>;
  signOut: (opts?: { redirectUrl?: string }) => Promise<void>;
  addListener: (cb: Listener) => () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
