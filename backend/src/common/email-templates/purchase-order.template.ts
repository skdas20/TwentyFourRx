import { getBaseEmailTemplate } from './base.template';

export function getPurchaseOrderEmailTemplate(
  buyerName: string,
  medicineName: string,
  quantity: number,
  unitPrice: number,
  gstPercentage: number,
  gstAmount: number,
  totalAmount: number,
): string {
  const content = `
    <h1>Purchase Order Received</h1>

    <p>Hi ${buyerName},</p>

    <p>Thank you for your order! We have received your purchase request and a quotation has been sent to you as an attachment.</p>

    <div class="success-box">
      <p><strong>✓ Order Confirmed</strong></p>
      <p>Your purchase order has been created successfully. Please review the attached quotation and proceed with payment.</p>
    </div>

    <h2 style="color: #1E293B; font-size: 18px; margin-top: 30px;">Order Summary</h2>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F8FAFC; border-radius: 8px;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;"><strong>Medicine</strong></td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">${medicineName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;"><strong>Quantity</strong></td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">${quantity} units</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;"><strong>Unit Price</strong></td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${unitPrice.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;"><strong>GST (${gstPercentage}%)</strong></td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${gstAmount.toFixed(2)}</td>
      </tr>
      <tr style="background: #3B82F6; color: white;">
        <td style="padding: 16px; border-radius: 0 0 0 8px;"><strong>Total Amount</strong></td>
        <td style="padding: 16px; text-align: right; border-radius: 0 0 8px 0; font-size: 20px;"><strong>₹${totalAmount.toFixed(2)}</strong></td>
      </tr>
    </table>

    <h2 style="color: #1E293B; font-size: 18px; margin-top: 30px;">Payment Details</h2>

    <div class="info-box">
      <p><strong>Bank Name:</strong> BANK OF BARODA</p>
      <p><strong>Branch:</strong> RANCHI</p>
      <p><strong>Account No:</strong> 10170200001128</p>
      <p><strong>IFSC Code:</strong> BARB0RANCHI</p>
      <p><strong>Account Name:</strong> 24RX MEDICAL ENTERPRISES</p>
    </div>

    <div class="alert-box">
      <p><strong>⚠ Important: Next Steps</strong></p>
      <p>1. Transfer the amount to the above bank account<br>
      2. Upload your payment receipt in the order portal<br>
      3. Our team will verify and process your order within 24 hours</p>
    </div>

    <div class="info-box" style="background: #FEF3C7; border-left: 4px solid #F59E0B; margin: 20px 0;">
      <p style="color: #92400E; margin: 0;"><strong>📦 Note:</strong> Delivery Charges Shall Apply</p>
    </div>

    <p><strong>📎 Attached Documents:</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Detailed Quotation (PDF)</li>
    </ul>

    <p>For any questions or assistance, please contact us at <a href="mailto:24rxmedicalsupply@gmail.com">24rxmedicalsupply@gmail.com</a> or call us at <a href="tel:7004052004">7004052004</a>.</p>

    <p>Thank you for choosing 24Rx!</p>

    <p>Best regards,<br>
    <strong>The 24Rx Sales Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Purchase Order - 24Rx Exchange',
    preheader: `Your order for ${medicineName} (${quantity} units) - Total: ₹${totalAmount.toFixed(2)}`,
    content,
  });
}
