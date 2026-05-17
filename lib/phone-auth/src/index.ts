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
  FIREBASE_PHONE_AUTH_DOMAINS,
  ensureRecaptchaContainer,
  getRecaptcha,
  ensureRecaptchaReady,
  setupPhoneRecaptcha,
  getPhoneRecaptchaVerifier,
  clearRecaptchaOnFailure,
  destroyPhoneRecaptchaVerifier,
  clearPhoneRecaptchaVerifier,
  resetPhoneRecaptchaWidget,
  logRecaptchaDebug,
  firebasePhoneAuthDomainHint,
  warnIfPhoneAuthDomainMissingFromFirebase,
  setPhoneRecaptchaMobileSheetActive,
  mountPhoneRecaptchaContainer,
  prepareMobilePhoneOtpVerifier,
  awaitMobileRecaptchaVerification,
  createStaticRecaptchaVerifier,
  isAndroidPwa,
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
  shouldUseBrowserForPhoneOtp,
  buildPhoneOtpBrowserUrl,
  hardResetRecaptcha,
  initRecaptcha,
} from "./phone-recaptcha";
export {
  sendPhoneOtpSafely,
  PHONE_OTP_SEND_TIMEOUT_MS,
  type SendPhoneOtpResult,
} from "./phone-otp-send";
export {
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  getCanonicalWebOrigin,
  isAmyNestProductionHost,
  logPhoneOtpDomainContext,
  redirectWwwToCanonicalApex,
  shouldRedirectWwwToApex,
} from "./site-domain";
