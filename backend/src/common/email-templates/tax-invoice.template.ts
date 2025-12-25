import { getBaseEmailTemplate } from './base.template';

export function getTaxInvoiceEmailTemplate(
  buyerName: string,
  medicineName: string,
  quantity: number,
  unitPrice: number,
  gstPercentage: number,
  gstAmount: number,
  totalAmount: number,
  orderId: string,
): string {
  const content = `
    <h1>✅ Payment Received - Tax Invoice</h1>

    <p>Hi ${buyerName},</p>

    <p>Great news! Your payment has been received and verified. Your order is now confirmed and will be processed shortly.</p>

    <div class="success-box">
      <p><strong>✓ Payment Verified</strong></p>
      <p>Order ID: <strong>#${orderId}</strong></p>
      <p>Thank you for your payment. Your order is now being prepared for delivery.</p>
    </div>

    <h2 style="color: #1E293B; font-size: 18px; margin-top: 30px;">Invoice Summary</h2>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #F8FAFC; border-radius: 8px;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0;"><strong>Order ID</strong></td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; text-align: right;">#${orderId}</td>
      </tr>
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
      <tr style="background: #10B981; color: white;">
        <td style="padding: 16px; border-radius: 0 0 0 8px;"><strong>Total Paid</strong></td>
        <td style="padding: 16px; text-align: right; border-radius: 0 0 8px 0; font-size: 20px;"><strong>₹${totalAmount.toFixed(2)}</strong></td>
      </tr>
    </table>

    <h2 style="color: #1E293B; font-size: 18px; margin-top: 30px;">What Happens Next?</h2>

    <div class="info-box">
      <p><strong>📦 Order Processing</strong></p>
      <p>1. Your order will be prepared and quality-checked<br>
      2. You'll receive a tracking notification once shipped<br>
      3. Expected delivery: 3-5 business days<br>
      4. You can track your order status in your dashboard</p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-proposals" class="button">Track Order Status</a>
    </p>

    <p><strong>📎 Attached Documents:</strong></p>
    <ul style="color: #64748B; line-height: 1.8;">
      <li>Tax Invoice (PDF) - If uploaded by admin</li>
    </ul>

    <div class="info-box" style="background: #FEF3C7; border-left-color: #F59E0B;">
      <p><strong>💡 Need Help?</strong></p>
      <p>If you have any questions about your order or need assistance, our support team is here to help:<br>
      📧 Email: <a href="mailto:24rxmedicalsupply@gmail.com">24rxmedicalsupply@gmail.com</a><br>
      📞 Phone: <a href="tel:7004052004">7004052004</a>, <a href="tel:7070414040">7070414040</a></p>
    </div>

    <p>Thank you for your business. We appreciate your trust in 24Rx!</p>

    <p>Best regards,<br>
    <strong>The 24Rx Order Fulfillment Team</strong></p>
  `;

  return getBaseEmailTemplate({
    title: 'Payment Received - Tax Invoice',
    preheader: `Payment confirmed for Order #${orderId}. Your order is being processed.`,
    content,
  });
}
