import { getBaseEmailTemplate } from './base.template';

export function getWelcomeEmailTemplate(
  name: string,
  email: string,
  password: string,
  loginUrl: string,
): string {
  const content = `
    <h1>Welcome to 24Rx, ${name}!</h1>

    <p>Thank you for registering with 24Rx Exchange - India's leading B2B medicine trading platform. Your account has been successfully created and is now pending approval from our team.</p>

    <div class="success-box">
      <p><strong>✓ Registration Successful</strong></p>
      <p>Your account will be reviewed by our team shortly. You'll receive an email once your account is approved.</p>
    </div>

    <p>Here are your login credentials:</p>

    <div class="info-box">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>
    </div>

    <div class="alert-box">
      <p><strong>⚠ Important Security Information</strong></p>
      <p>Please change your password immediately after your first login for security purposes.</p>
    </div>

    <p style="text-align: center;">
      <a href="${loginUrl}" class="button">Login to Your Account</a>
    </p>

    <p><strong>What happens next?</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Our team will review your registration and supporting documents</li>
      <li>You'll receive an approval email within 24-48 hours</li>
      <li>Once approved, you can start trading medicines on our platform</li>
    </ul>

    <p><strong>Need help?</strong></p>
    <p>If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:24rxmedicalsupply@gmail.com">24rxmedicalsupply@gmail.com</a></p>

    <p>Best regards,<br>
    <strong>The 24Rx Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Welcome to 24Rx Exchange',
    preheader: 'Your account has been created successfully. Please save your login credentials.',
    content,
  });
}
