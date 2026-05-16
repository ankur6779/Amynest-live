/**
 * Public Firebase web client config (safe to ship in the bundle).
 * Vite env vars override these at build time when set on Render/CI.
 */
export const firebaseWebDefaults = {
  apiKey: "AIzaSyBjmRgm4uGfSs_hVXN1pSgyncKn_A7T6uo",
  authDomain: "amynest-836ff.firebaseapp.com",
  projectId: "amynest-836ff",
  appId: "1:573340015027:web:1d05e678f1ba90dca293c6",
  messagingSenderId: "573340015027",
} as const;
