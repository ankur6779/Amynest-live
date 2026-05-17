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
  getPhoneRecaptchaVerifier,
  clearPhoneRecaptchaVerifier,
  logRecaptchaDebug,
  firebasePhoneAuthDomainHint,
  warnIfPhoneAuthDomainMissingFromFirebase,
  setPhoneRecaptchaMobileSheetActive,
  mountPhoneRecaptchaContainer,
  isMobilePhoneOtpEnvironment,
  shouldPreRenderPhoneRecaptcha,
} from "./phone-recaptcha";
export {
  CANONICAL_PRODUCTION_HOST,
  CANONICAL_PRODUCTION_ORIGIN,
  getCanonicalWebOrigin,
  isAmyNestProductionHost,
  logPhoneOtpDomainContext,
  redirectWwwToCanonicalApex,
  shouldRedirectWwwToApex,
} from "./site-domain";
