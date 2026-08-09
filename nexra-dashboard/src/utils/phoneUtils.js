/**
 * phoneUtils.js
 * Utility functions for phone number normalization and validation.
 */

/**
 * Normalizes a given phone number based on the default country code.
 * @param {string} phoneNumber - The raw phone number string from the contact book.
 * @param {string} defaultCountryCode - The default country code to prefix if missing (e.g., '+233').
 * @returns {string} The normalized phone number.
 */
export const normalizePhoneNumber = (phoneNumber, defaultCountryCode = '+233') => {
  if (!phoneNumber) return '';

  // Remove all non-numeric characters except the plus sign
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  if (!cleaned) return '';

  // If the number already starts with '+', assume it's fully qualified
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If the number starts with '00', replace it with '+'
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // If the number starts with '0', remove it and add the default country code
  // Example for Ghana: 0241234567 -> +233241234567
  if (cleaned.startsWith('0')) {
    return defaultCountryCode + cleaned.substring(1);
  }

  // If it doesn't start with 0 and doesn't start with +, just prepend the default country code
  // e.g., 241234567 -> +233241234567
  return defaultCountryCode + cleaned;
};

/**
 * Validates if the given string is a plausible international phone number.
 * @param {string} phoneNumber - The phone number to validate.
 * @returns {boolean} True if it looks like a valid international number, else false.
 */
export const isValidPhoneNumber = (phoneNumber) => {
  // A simple regex to check for international format E.164 (roughly)
  // Usually between 10 to 15 digits
  const regex = /^\+[1-9]\d{1,14}$/;
  return regex.test(phoneNumber);
};
