import * as crypto from 'crypto';

/**
 * Generates a secure random password
 * @returns A password with 12-16 characters including uppercase, lowercase, numbers, and special characters
 */
export function generateSecurePassword(): string {
  const length = 12 + Math.floor(Math.random() * 5); // 12-16 characters
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one character from each category
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 3) - 1)
    .join('');
}

/**
 * Generates a cryptographically secure reset token
 * @returns A 32-character hexadecimal token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token for secure storage
 * @param token The plain token to hash
 * @returns The hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validates a token against its hash
 * @param token The plain token to validate
 * @param hashedToken The stored hash to compare against
 * @returns True if the token matches the hash
 */
export function validateToken(token: string, hashedToken: string): boolean {
  const hash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
}
