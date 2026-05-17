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
  hardResetRecaptcha,
  initRecaptcha,
  warmUpRecaptcha,
  resetRecaptchaOnFailure,
  logRecaptchaState,
  setupRecaptcha,
} from "./phone-recaptcha";
export {
  isAndroidPwa,
  isMobilePhoneOtpEnvironment,
  canRunInAppPhoneRecaptcha,
  shouldPreRenderPhoneRecaptcha,
  shouldUseBrowserForPhoneOtp,
  buildPhoneOtpBrowserUrl,
  openPhoneOtpInExternalBrowser,
} from "./mobile-phone-environment";
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
