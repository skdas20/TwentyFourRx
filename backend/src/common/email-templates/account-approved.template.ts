import { getBaseEmailTemplate } from './base.template';

export function getAccountApprovedEmailTemplate(name: string): string {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const content = `
    <h1>🎉 Account Approved!</h1>

    <p>Hi ${name},</p>

    <p>Great news! Your 24Rx account has been approved and is now active. Welcome to India's premier B2B medicine trading platform!</p>

    <div class="success-box">
      <p><strong>✓ Your Account is Now Active</strong></p>
      <p>You can now access all features of 24Rx Exchange and start trading medicines with verified suppliers and buyers.</p>
    </div>

    <p style="text-align: center;">
      <a href="${loginUrl}/auth/login" class="button">Start Trading Now</a>
    </p>

    <p><strong>What you can do now:</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li><strong>Browse Medicines:</strong> Explore thousands of medicine listings from verified sellers</li>
      <li><strong>Create Listings:</strong> List your medicines for sale to reach verified buyers</li>
      <li><strong>Place Orders:</strong> Purchase medicines with competitive pricing</li>
      <li><strong>Track Portfolio:</strong> Monitor your inventory and transactions</li>
      <li><strong>Request Deliveries:</strong> Arrange secure delivery of your orders</li>
    </ul>

    <div class="info-box">
      <p><strong>💡 Pro Tip</strong></p>
      <p>Complete your profile and upload quality product images to increase your visibility and build trust with other traders.</p>
    </div>

    <p><strong>Need help getting started?</strong></p>
    <p>Check out our resources:</p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Browse our <a href="${loginUrl}/medicines">Medicine Listings</a></li>
      <li>Visit your <a href="${loginUrl}/dashboard">Dashboard</a></li>
      <li>Contact <a href="mailto:24rxmedicalsupply@gmail.com">Support</a> for any questions</li>
    </ul>

    <p>We're excited to have you as part of the 24Rx community!</p>

    <p>Best regards,<br>
    <strong>The 24Rx Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Your 24Rx Account Has Been Approved!',
    preheader: 'Welcome to 24Rx! Your account is now active. Start trading medicines today.',
    content,
  });
}
