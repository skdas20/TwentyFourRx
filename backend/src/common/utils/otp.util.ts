/**
 * OTP (One-Time Password) Utility Functions
 * Generates and validates 6-digit OTPs for delivery confirmation
 */

/**
 * Generates a random 6-digit OTP
 * @returns {string} 6-digit OTP as a string
 */
export function generateOtp(): string {
  // Generate a random 6-digit number (100000 to 999999)
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

/**
 * Generates OTP expiry timestamp
 * @param {number} hoursValid - Number of hours the OTP is valid (default: 24 hours)
 * @returns {Date} Expiry timestamp
 */
export function generateOtpExpiry(hoursValid: number = 24): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hoursValid);
  return expiryDate;
}

/**
 * Validates if OTP is still valid (not expired)
 * @param {Date | null} expiresAt - OTP expiry timestamp
 * @returns {boolean} True if OTP is still valid, false if expired or null
 */
export function isOtpValid(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() < new Date(expiresAt);
}

/**
 * Validates if the provided OTP matches the stored OTP and is not expired
 * @param {string} providedOtp - OTP provided by user
 * @param {string | null} storedOtp - OTP stored in database
 * @param {Date | null} expiresAt - OTP expiry timestamp
 * @returns {boolean} True if OTP matches and is valid
 */
export function validateOtp(
  providedOtp: string,
  storedOtp: string | null,
  expiresAt: Date | null,
): boolean {
  if (!storedOtp || !providedOtp) return false;
  if (!isOtpValid(expiresAt)) return false;
  return providedOtp.trim() === storedOtp.trim();
}
