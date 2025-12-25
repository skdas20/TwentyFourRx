import { getBaseEmailTemplate } from './base.template';

export function getPasswordChangedEmailTemplate(name: string): string {
  const content = `
    <h1>Password Changed Successfully</h1>

    <p>Hi ${name},</p>

    <p>This email confirms that your 24Rx account password was successfully changed.</p>

    <div class="success-box">
      <p><strong>✓ Password Updated</strong></p>
      <p>Your password has been changed on ${new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>

    <p>You can now use your new password to log in to your account.</p>

    <div class="alert-box">
      <p><strong>⚠ Didn't make this change?</strong></p>
      <p>If you did NOT change your password, your account may have been compromised. Please contact our support team immediately at <a href="mailto:24rxmedicalsupply@gmail.com">24rxmedicalsupply@gmail.com</a></p>
    </div>

    <p><strong>Security Tips:</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Keep your password secure and don't share it with anyone</li>
      <li>Use a unique password that you don't use on other websites</li>
      <li>Consider using a password manager</li>
      <li>Be cautious of phishing emails asking for your credentials</li>
    </ul>

    <p>If you have any questions or concerns about your account security, please don't hesitate to contact us.</p>

    <p>Best regards,<br>
    <strong>The 24Rx Security Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Your 24Rx Password Was Changed',
    preheader: 'Your password has been successfully updated.',
    content,
  });
}
