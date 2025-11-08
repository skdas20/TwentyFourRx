import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configure Gmail transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'), // Use app-specific password
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string, email: string, password: string) {
    const loginUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const mailOptions = {
      from: `24Rx Exchange <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '🎉 Welcome to 24Rx - Your Login Credentials',
      html: this.getWelcomeEmailTemplate(name, email, password, loginUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${to}:`, error);
      throw error; // Throw error so registration can handle it
    }
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: `24Rx Exchange <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '🔐 Reset Your 24Rx Password',
      html: this.getPasswordResetEmailTemplate(name, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  async sendPasswordChangedEmail(to: string, name: string) {
    const mailOptions = {
      from: `24Rx Exchange <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '✅ Your 24Rx Password Was Changed',
      html: this.getPasswordChangedEmailTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password changed confirmation sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send password changed email to ${to}:`, error);
      // Don't throw - password was already changed
    }
  }

  async sendApprovalEmail(to: string, name: string) {
    const mailOptions = {
      from: `24Rx Medicine Trading <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '✅ Your 24Rx Account Has Been Approved!',
      html: this.getApprovalEmailTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Approval email sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send approval email to ${to}:`, error);
      // Don't throw - approval should succeed even if email fails
    }
  }

  private getWelcomeEmailTemplate(name: string, email: string, password: string, loginUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to 24Rx</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
                24<span style="color: #60a5fa;">Rx</span>
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">World's Only Med-Trade Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Welcome to 24Rx, ${name}!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your account has been created successfully. Here are your login credentials:
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 0; color: #1f2937; font-size: 14px;"><strong>Password:</strong> <code style="background-color: #dbeafe; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px;">${password}</code></p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      <strong>Important:</strong> Please change your password after your first login for security purposes. Your account is pending admin approval.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}/auth/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't create this account, please ignore this email or contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                © 2024 24Rx Exchange. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                World's Only Med-Trade Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getApprovalEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f0f4f8;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 50px 30px;
      text-align: center;
    }
    .checkmark {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .title {
      color: white;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      color: #4a5568;
      line-height: 1.8;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background: #f7fafc;
      padding: 30px;
      text-align: center;
      color: #718096;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="checkmark">✅</div>
      <h1 class="title">Account Approved!</h1>
    </div>

    <div class="content">
      <div class="message">
        <strong>Hi ${name},</strong><br><br>

        Great news! Your 24Rx account has been <strong>approved by our admin team</strong>.
        You can now access all features of our B2B medicine trading platform.
        <br><br>

        <strong>What you can do now:</strong>
        <ul style="line-height: 2;">
          <li>🏪 Create medicine listings</li>
          <li>💰 Place holds and orders</li>
          <li>📊 View price trends and analytics</li>
          <li>📦 Manage your inventory</li>
        </ul>
      </div>

      <center>
        <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/login"
           class="button">
          Login to Your Account →
        </a>
      </center>
    </div>

    <div class="footer">
      <p>© 2024 24Rx Medicine Trading Platform. All rights reserved.</p>
      <p>Questions? Contact us at <a href="mailto:support@24rx.com" style="color: #667eea;">support@24rx.com</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
                24<span style="color: #60a5fa;">Rx</span>
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">World's Only Med-Trade Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Reset Your Password</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      <strong>⏰ This link expires in 1 hour</strong><br>
                      For security reasons, this password reset link will expire in 1 hour.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
              </p>

              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                © 2024 24Rx Exchange. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                World's Only Med-Trade Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getPasswordChangedEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Password Changed Successfully
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your 24Rx password has been changed successfully. You can now log in with your new password.
              </p>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                      <strong>🔒 Security Notice</strong><br>
                      If you didn't make this change, please contact our support team immediately at support@24rx.com
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/auth/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                © 2024 24Rx Exchange. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                World's Only Med-Trade Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
