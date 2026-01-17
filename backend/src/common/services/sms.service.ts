import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly apiUrl = 'https://2factor.in/API/V1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TWOFACTOR_API_KEY') || '';
    this.senderId = this.configService.get<string>('TWOFACTOR_SENDER_ID') || '24RXMD';
  }

  /**
   * Send SMS using 2Factor API (without DLT template)
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Remove +91 prefix if present and validate
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // If starts with 91, remove it (country code)
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.substring(2);
      }
      
      // Validate phone number (should be 10 digits for India)
      if (cleanPhone.length !== 10) {
        this.logger.warn(`Invalid phone number format: ${phoneNumber} (cleaned: ${cleanPhone})`);
        return false;
      }

      this.logger.log(`📱 Attempting to send SMS to +91${cleanPhone}`);
      this.logger.log(`📝 Message: ${message}`);

      // 2Factor API endpoint for transactional SMS
      const url = `${this.apiUrl}/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;

      const response = await axios.post(url, {
        From: this.senderId,
        To: cleanPhone,
        Msg: message,
      }, {
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
        this.logger.warn(`⚠️  DLT templates may be required. See SMS_DLT_SETUP_REQUIRED.md`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ SMS Exception for ${phoneNumber}:`, error.message);
      if (error.response) {
        this.logger.error(`API Response: ${JSON.stringify(error.response.data)}`);
        this.logger.warn(`⚠️  This usually means DLT templates are not registered. See SMS_DLT_SETUP_REQUIRED.md`);
      }
      return false;
    }
  }

  /**
   * Send Buy Proposal Created SMS to Buyer
   */
  async sendBuyProposalCreatedSms(
    phoneNumber: string,
    medicineName: string,
    proposalId: string,
  ): Promise<boolean> {
    const message = `Your buy proposal for ${medicineName} has been created successfully on 24Rx. Proposal ID: ${proposalId}. We will notify you once admin reviews it. - 24Rx`;
    return this.sendSms(phoneNumber, message);
  }

  /**
   * Send Buy Proposal Approved SMS to Buyer
   */
  async sendBuyProposalApprovedSms(
    phoneNumber: string,
    medicineName: string,
    proposalLink: string,
  ): Promise<boolean> {
    const message = `Great news! Your buy proposal for ${medicineName} has been approved on 24Rx. The seller will contact you soon. Check details: ${proposalLink} - 24Rx`;
    return this.sendSms(phoneNumber, message);
  }

  /**
   * Send Buy Request Received SMS to Seller
   */
  async sendBuyRequestReceivedSms(
    phoneNumber: string,
    medicineName: string,
    uploadLink: string,
  ): Promise<boolean> {
    const message = `You have a new buy request for ${medicineName} on 24Rx. Please upload invoice to proceed: ${uploadLink} - 24Rx`;
    return this.sendSms(phoneNumber, message);
  }

  /**
   * Send Delivery Requested SMS to Seller
   */
  async sendDeliveryRequestedSms(
    phoneNumber: string,
    medicineName: string,
    uploadLink: string,
  ): Promise<boolean> {
    const message = `Delivery requested for ${medicineName} on 24Rx. Please upload courier invoice: ${uploadLink} - 24Rx`;
    return this.sendSms(phoneNumber, message);
  }
}
