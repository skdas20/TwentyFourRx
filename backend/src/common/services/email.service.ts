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
    const mailOptions = {
      from: `24Rx Medicine Trading <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '🎉 Welcome to 24Rx - Your Account is Pending Approval',
      html: this.getWelcomeEmailTemplate(name, email, password),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${to}:`, error);
      // Don't throw error - registration should succeed even if email fails
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
    }
  }

  private getWelcomeEmailTemplate(name: string, email: string, password: string): string {
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header {
      background: rgba(255,255,255,0.1);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin-bottom: 10px;
    }
    .subtitle {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
    }
    .content {
      background: white;
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      color: #1a202c;
      margin-bottom: 20px;
    }
    .message {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .credentials-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      color: white;
    }
    .credential-label {
      font-weight: 600;
      opacity: 0.9;
    }
    .credential-value {
      font-family: 'Courier New', monospace;
      background: rgba(255,255,255,0.2);
      padding: 5px 15px;
      border-radius: 6px;
      font-weight: bold;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      color: #92400e;
      margin: 20px 0;
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
      <div class="logo">🏥 24Rx</div>
      <div class="subtitle">B2B Medicine Trading Platform</div>
    </div>
    
    <div class="content">
      <div class="greeting">Welcome, ${name}! 🎉</div>
      
      <div class="message">
        Thank you for registering with <strong>24Rx</strong>, India's premier B2B medicine trading platform. 
        Your account has been created successfully and is currently <strong>pending admin approval</strong>.
      </div>

      <div class="credentials-box">
        <h3 style="color: white; margin-top: 0;">📧 Your Login Credentials</h3>
        <div class="credential-row">
          <span class="credential-label">Email:</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password:</span>
          <span class="credential-value">${password}</span>
        </div>
      </div>

      <div class="warning">
        ⚠️ <strong>Security Note:</strong> Please change your password after your first login. 
        Keep these credentials secure and do not share them with anyone.
      </div>

      <div class="message">
        <strong>Next Steps:</strong>
        <ol style="color: #4a5568; line-height: 2;">
          <li>Wait for admin approval (typically within 24 hours)</li>
          <li>You'll receive another email once approved</li>
          <li>Login and start trading medicines!</li>
        </ol>
      </div>

      <center>
        <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/login" 
           class="button">
          Go to Login Page →
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
}
