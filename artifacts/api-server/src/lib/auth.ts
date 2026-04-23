import type { Request } from "express";

/**
 * Auth payload attached to every authenticated request by `requireAuth`.
 * Mirrors the shape Clerk's `getAuth(req)` used to return so call sites
 * (`const { userId } = getAuth(req)`) keep working.
 */
export interface AuthPayload {
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

const EMPTY: AuthPayload = {
  userId: null,
  email: null,
  emailVerified: false,
  name: null,
  picture: null,
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      firebaseAuth?: AuthPayload;
    }
  }
}

/**
 * Drop-in replacement for Clerk's `getAuth(req)`. Reads the auth payload
 * that `requireAuth` attached to the request after verifying the Firebase
 * ID token. Returns an empty payload (userId: null) on unauthenticated
 * requests so existing destructuring doesn't crash.
 */
export function getAuth(req: Request): AuthPayload {
  return req.firebaseAuth ?? EMPTY;
}
