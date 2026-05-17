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
  openPhoneOtpInExternalBrowser,
  shouldUseBrowserForPhoneOtp,
} from "./mobile-phone-environment";
export {
  FIREBASE_PHONE_AUTH_DOMAINS,
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  getCanonicalWebOrigin,
  isAmyNestProductionHost,
  logPhoneOtpDomainContext,
  redirectWwwToCanonicalApex,
  shouldRedirectWwwToApex,
  firebasePhoneAuthDomainHint,
  warnIfPhoneAuthDomainMissingFromFirebase,
} from "./site-domain";
