/**
 * Base Email Template with 24Rx Branding
 * Provides consistent header, footer, and styling across all emails
 */

export interface EmailTemplateData {
  title: string;
  preheader?: string;
  content: string;
}

export function getBaseEmailTemplate(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${data.preheader ? `<meta name="description" content="${data.preheader}">` : ''}
  <title>${data.title}</title>
  <style>
    /* Reset styles */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1E293B;
      background-color: #F8FAFC;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }
    a {
      color: #3B82F6;
      text-decoration: none;
    }

    /* Container styles */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
    }

    /* Header styles */
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      font-weight: bold;
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -1px;
    }
    .logo-x {
      color: #FFFFFF;
      opacity: 0.9;
    }
    .tagline {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-top: 8px;
    }

    /* Content styles */
    .content {
      padding: 40px 30px;
    }
    .content h1 {
      color: #1E293B;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }
    .content p {
      color: #64748B;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    /* Button styles */
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #3B82F6;
      color: #FFFFFF !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #2563EB;
    }

    /* Info box styles */
    .info-box {
      background-color: #F8FAFC;
      border-left: 4px solid #3B82F6;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      color: #1E293B;
    }
    .info-box strong {
      color: #3B82F6;
    }

    /* Alert box styles */
    .alert-box {
      background-color: #FEF2F2;
      border-left: 4px solid: #EF4444;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-box p {
      margin: 0;
      color: #991B1B;
    }

    /* Success box styles */
    .success-box {
      background-color: #F0FDF4;
      border-left: 4px solid #10B981;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box p {
      margin: 0;
      color: #065F46;
    }

    /* Footer styles */
    .footer {
      background-color: #F8FAFC;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E2E8F0;
    }
    .footer p {
      color: #64748B;
      font-size: 14px;
      margin: 8px 0;
    }
    .footer a {
      color: #3B82F6;
      text-decoration: underline;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #64748B;
      text-decoration: none;
    }

    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 30px 20px !important;
      }
      .header {
        padding: 30px 20px !important;
      }
      .logo {
        font-size: 36px !important;
      }
    }
  </style>
</head>
<body>
  ${data.preheader ? `
  <!-- Preheader text (hidden, but shown in email client preview) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${data.preheader}
  </div>
  ` : ''}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px 0;">
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">

          <!-- Header -->
          <tr>
            <td class="header">
              <h1 class="logo">24R<span class="logo-x">x</span></h1>
              <p class="tagline">Empowering B2B Medicine Trading</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">
              ${data.content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p><strong>24Rx Medical Enterprises</strong></p>
              <p>2ND STREET CHURCH ROAD, KADRU, RANCHI<br>
              RANCHI-834001 (JHARKHAND)</p>
              <p>Phone: <a href="tel:7004052004">7004052004</a>, <a href="tel:7070414040">7070414040</a></p>
              <p>Email: <a href="mailto:24rxmedicalsupply@gmail.com">24rxmedicalsupply@gmail.com</a></p>

              <div class="social-links">
                <a href="https://24rxexchange.com">Visit Website</a> •
                <a href="mailto:24rxmedicalsupply@gmail.com">Contact Support</a>
              </div>

              <p style="font-size: 12px; color: #9AA3AE; margin-top: 20px;">
                © ${new Date().getFullYear()} 24Rx Medical Enterprises. All rights reserved.
              </p>
              <p style="font-size: 12px; color: #9AA3AE;">
                This email was sent to you because you have an account with 24Rx Exchange.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
