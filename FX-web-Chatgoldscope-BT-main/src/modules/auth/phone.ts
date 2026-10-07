/**
 * Single source of truth for phone / country-code
 * normalisation. Signup, login, OTP and password reset
 * must all produce the SAME stored value, otherwise a
 * user can register but never log in.
 */
export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneValidationError";
  }
}

const DEFAULT_COUNTRY_CODE = "+91";

export function normalizeCountryCode(
  countryCode?: string,
): string {
  const rawCountryCode =
    countryCode?.trim() ||
    DEFAULT_COUNTRY_CODE;

  const digits =
    rawCountryCode.replace(/\D/g, "");

  if (!digits || digits.length > 4) {
    throw new PhoneValidationError(
      "Invalid country code.",
    );
  }

  return `+${digits}`;
}

/**
 * Returns country-code digits + national number,
 * without "+", e.g. 919174148169.
 */
export function normalizePhone(
  countryCode: string,
  phone: string,
): string {
  const countryCodeDigits =
    countryCode.replace(/\D/g, "");

  let phoneDigits =
    phone.replace(/\D/g, "");

  phoneDigits =
    phoneDigits.replace(/^0+/, "");

  /*
   * Accept numbers typed with the country code
   * already included (e.g. 919174148169).
   */
  if (
    phoneDigits.startsWith(
      countryCodeDigits,
    ) &&
    phoneDigits.length > 10
  ) {
    phoneDigits = phoneDigits.slice(
      countryCodeDigits.length,
    );
  }

  if (
    phoneDigits.length < 7 ||
    phoneDigits.length > 12
  ) {
    throw new PhoneValidationError(
      "Invalid mobile number.",
    );
  }

  const completePhone =
    countryCodeDigits + phoneDigits;

  if (
    completePhone.length < 8 ||
    completePhone.length > 15
  ) {
    throw new PhoneValidationError(
      "Invalid mobile number.",
    );
  }

  return completePhone;
}
