import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * SMS Service with DLT Template Support
 * Use this after you have DLT template IDs
 */

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly peNumber: string;
  private readonly apiUrl = 'https://2factor.in/API/V1';
  
  private readonly templates = {
    proposalCreated: '',
    proposalApproved: '',
    buyRequest: '',
    delivery: '',
    accountApproved: '',
    otp: '',
  };

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TWOFACTOR_API_KEY') || '';
    this.senderId = this.configService.get<string>('TWOFACTOR_SENDER_ID') || '24RXMD';
    this.peNumber = this.configService.get<string>('TWOFACTOR_PE_NUMBER') || '';
    
    this.templates.proposalCreated = this.configService.get<string>('TWOFACTOR_TEMPLATE_PROPOSAL_CREATED') || '';
    this.templates.proposalApproved = this.configService.get<string>('TWOFACTOR_TEMPLATE_PROPOSAL_APPROVED') || '';
    this.templates.buyRequest = this.configService.get<string>('TWOFACTOR_TEMPLATE_BUY_REQUEST') || '';
    this.templates.delivery = this.configService.get<string>('TWOFACTOR_TEMPLATE_DELIVERY') || '';
    this.templates.accountApproved = this.configService.get<string>('TWOFACTOR_TEMPLATE_ACCOUNT_APPROVED') || '';
    this.templates.otp = this.configService.get<string>('TWOFACTOR_TEMPLATE_OTP') || '';
  }

  private cleanPhoneNumber(phoneNumber: string): string | null {
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length !== 10) {
      this.logger.warn(`Invalid phone number format: ${phoneNumber} (cleaned: ${cleanPhone})`);
      return null;
    }
    return cleanPhone;
  }

  async sendSmsWithTemplate(
    phoneNumber: string,
    templateId: string,
    variables: string[],
  ): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      if (!cleanPhone) {
        return false;
      }

      if (!templateId) {
        this.logger.error('❌ Template ID not provided');
        return false;
      }

      this.logger.log(`📱 Sending SMS to +91${cleanPhone} using template ${templateId}`);

      const url = `${this.apiUrl}/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;

      const payload: any = {
        From: this.senderId,
        To: cleanPhone,
        TemplateName: templateId,
      };

      variables.forEach((value, index) => {
        payload[`VAR${index + 1}`] = value;
      });

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.Status === 'Success') {
        this.logger.log(`✅ SMS sent successfully to +91${cleanPhone}`);
        return true;
      } else {
        this.logger.error(`❌ SMS API Error for +91${cleanPhone}:`);
        this.logger.error(`Response: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ SMS Exception for ${phoneNumber}:`, error.message);
      if (error.response) {
        this.logger.error(`API Response: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  async sendBuyProposalCreatedSms(
    phoneNumber: string,
    medicineName: string,
    proposalId: string,
  ): Promise<boolean> {
    if (!this.templates.proposalCreated) {
      this.logger.warn('⚠️  Template ID for Proposal Created not configured');
      return false;
    }
    return this.sendSmsWithTemplate(
      phoneNumber,
      this.templates.proposalCreated,
      [medicineName, proposalId],
    );
  }

  async sendBuyProposalApprovedSms(
    phoneNumber: string,
    medicineName: string,
    proposalLink: string,
  ): Promise<boolean> {
    if (!this.templates.proposalApproved) {
      this.logger.warn('⚠️  Template ID for Proposal Approved not configured');
      return false;
    }
    return this.sendSmsWithTemplate(
      phoneNumber,
      this.templates.proposalApproved,
      [medicineName, proposalLink],
    );
  }

  async sendBuyRequestReceivedSms(
    phoneNumber: string,
    medicineName: string,
    uploadLink: string,
  ): Promise<boolean> {
    if (!this.templates.buyRequest) {
      this.logger.warn('⚠️  Template ID for Buy Request not configured');
      return false;
    }
    return this.sendSmsWithTemplate(
      phoneNumber,
      this.templates.buyRequest,
      [medicineName, uploadLink],
    );
  }

  async sendDeliveryRequestedSms(
    phoneNumber: string,
    medicineName: string,
    uploadLink: string,
  ): Promise<boolean> {
    if (!this.templates.delivery) {
      this.logger.warn('⚠️  Template ID for Delivery not configured');
      return false;
    }
    return this.sendSmsWithTemplate(
      phoneNumber,
      this.templates.delivery,
      [medicineName, uploadLink],
    );
  }

  isDltConfigured(): boolean {
    return !!(
      this.peNumber &&
      this.templates.proposalCreated &&
      this.templates.proposalApproved &&
      this.templates.buyRequest &&
      this.templates.delivery
    );
  }
}
