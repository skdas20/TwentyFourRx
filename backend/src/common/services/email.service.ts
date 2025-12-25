import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
  getPasswordChangedEmailTemplate,
  getAccountApprovedEmailTemplate,
  getPurchaseOrderEmailTemplate,
  getTaxInvoiceEmailTemplate,
} from '../email-templates';

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
      subject: '🎉 Welcome to 24Rx - Your Account Details',
      html: getWelcomeEmailTemplate(name, email, password, loginUrl),
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
      html: getPasswordResetEmailTemplate(name, resetUrl),
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
      html: getPasswordChangedEmailTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password changed confirmation sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send password changed email to ${to}:`, error);
      // Don't throw - password was already changed
    }
  }

  async sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    const mailOptions = {
      from: `24Rx Exchange <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendApprovalEmail(to: string, name: string) {
    const mailOptions = {
      from: `24Rx Exchange <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject: '✅ Your 24Rx Account Has Been Approved!',
      html: getAccountApprovedEmailTemplate(name),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Approval email sent to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send approval email to ${to}:`, error);
      // Don't throw - approval should succeed even if email fails
    }
  }
}
