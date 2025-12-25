import { getBaseEmailTemplate } from './base.template';

export function getPasswordResetEmailTemplate(
  name: string,
  resetUrl: string,
): string {
  const content = `
    <h1>Reset Your Password</h1>

    <p>Hi ${name},</p>

    <p>We received a request to reset the password for your 24Rx account. If you didn't make this request, you can safely ignore this email.</p>

    <div class="info-box">
      <p><strong>🔐 Password Reset Request</strong></p>
      <p>Click the button below to create a new password. This link will expire in <strong>1 hour</strong> for security reasons.</p>
    </div>

    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Your Password</a>
    </p>

    <p><strong>For your security:</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Never share your password with anyone</li>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Change your password regularly</li>
    </ul>

    <div class="alert-box">
      <p><strong>⚠ Didn't request this?</strong></p>
      <p>If you didn't request a password reset, please contact our support team immediately to secure your account.</p>
    </div>

    <p>If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #3B82F6; font-size: 14px;">${resetUrl}</p>

    <p>Best regards,<br>
    <strong>The 24Rx Security Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Reset Your 24Rx Password',
    preheader: 'Click here to reset your password. This link expires in 1 hour.',
    content,
  });
}
