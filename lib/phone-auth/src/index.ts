export {
  PHONE_COUNTRIES,
  DEFAULT_COUNTRY_CODE,
  countryCodeToFlag,
  getCountryByCode,
  getDefaultCountry,
  type PhoneCountry,
} from "./countries";
export { detectDefaultCountry } from "./detect-country";
export {
  formatPhoneE164,
  isValidNationalPhone,
  filterCountries,
} from "./validate";
export {
  RECAPTCHA_CONTAINER_ID,
  applyRecaptchaContainerLayout,
  ensureRecaptchaContainer,
  getRecaptcha,
  getRecaptchaVerifierForSend,
  isRecaptchaReady,
  preloadInvisibleRecaptcha,
  prepareRecaptchaForSend,
  resetRecaptcha,
  logRecaptchaState,
} from "./recaptcha";
export {
  sendPhoneOtp,
  sendPhoneOtpSafely,
  type SendPhoneOtpResult,
} from "./send-phone-otp";
export {
  buildPhoneOtpBrowserUrl,
  canRunInAppPhoneRecaptcha,
  isAndroidPwa,
  isMobilePhoneOtpEnvironment,
  isStandalonePwa,
  openPhoneOtpInExternalBrowser,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
export {
  APEX_PRODUCTION_HOST,
  FIREBASE_PHONE_AUTH_DOMAINS,
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  PRODUCTION_COOKIE_DOMAIN,
  getCanonicalWebOrigin,
  isAmyNestProductionHost,
  logPhoneOtpDomainContext,
  redirectApexToCanonicalWww,
  redirectWwwToCanonicalApex,
  shouldRedirectWwwToApex,
  firebasePhoneAuthDomainHint,
  warnIfPhoneAuthDomainMissingFromFirebase,
} from "./site-domain";
