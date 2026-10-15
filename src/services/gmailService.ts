import { getAccessToken } from './firebaseAuth';

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

/**
 * Encodes a MIME UTF-8 string to RFC 2822 Web-safe Base64
 */
function encodeBase64UrlSafe(str: string): string {
  // Convert UTF-8 string into UTF-8 byte array, then Base64, then URL-safe
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds an RFC 2822 formatted raw email message
 */
function buildRawEmail({
  to,
  from,
  subject,
  bodyHtml,
  bodyText
}: {
  to: string;
  from?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}): string {
  const boundary = `====_NextPart_${Date.now().toString(16)}_====`;
  const plain = bodyText || bodyHtml?.replace(/<[^>]+>/g, ' ') || '';
  const html = bodyHtml || `<p>${plain.replace(/\n/g, '<br/>')}</p>`;

  const headers = [
    to ? `To: ${to}` : '',
    from ? `From: ${from}` : '',
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    ''
  ].filter(Boolean).join('\r\n');

  const partPlain = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    plain,
    ''
  ].join('\r\n');

  const partHtml = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    ''
  ].join('\r\n');

  const closing = `--${boundary}--\r\n`;

  return headers + partPlain + partHtml + closing;
}

export const gmailService = {
  /**
   * Directly sends an email via the Gmail REST API v1
   */
  sendEmail: async ({
    to,
    subject,
    bodyText,
    bodyHtml
  }: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'No active Google OAuth access token found. Please sign in with Google to enable Gmail dispatch.'
        };
      }

      const rawEmail = buildRawEmail({
        to,
        subject,
        bodyHtml,
        bodyText
      });

      const encodedMessage = encodeBase64UrlSafe(rawEmail);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `Gmail API failed with status ${response.status}`;
        console.error('Gmail send error:', errMsg);
        return { success: false, error: errMsg };
      }

      const result = await response.json();
      return { success: true, messageId: result.id };
    } catch (err: any) {
      console.error('Gmail dispatch exception:', err);
      return {
        success: false,
        error: err.message || 'Failed to send message via Gmail API'
      };
    }
  },

  /**
   * Helper to format and dispatch a login notification email
   */
  sendLoginNotificationEmail: async ({
    recipientEmail,
    userName,
    employeeId,
    role,
    loginTime,
    ipAddress,
    companyName
  }: {
    recipientEmail: string;
    userName: string;
    employeeId: string;
    role: string;
    loginTime: string;
    ipAddress?: string;
    companyName?: string;
  }): Promise<{ success: boolean; error?: string; messageId?: string }> => {
    const org = companyName || 'Cost and Planning Database System';
    const subject = `[Security Alert] Successful Login to ${org}`;
    
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <div style="border-bottom: 2px solid #003049; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #003049; margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">${org}</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Security & Account Authentication Alert</p>
        </div>

        <p style="font-size: 15px; margin-top: 0; line-height: 1.5;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          This is an automated notification confirming that a successful session login was just established on your enterprise account.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Employee ID:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${employeeId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${role}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${loginTime}</td>
            </tr>
            ${ipAddress ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Network IP:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; font-family: monospace;">${ipAddress}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Authentication:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #16a34a;">Verified (Google OAuth / Single Sign-On)</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If you performed this sign-in, you may safely disregard this notification. If you did not authorize this access, please immediately reset your password or alert your System Administrator.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent securely via integrated Google Workspace Gmail Service.
        </div>
      </div>
    `;

    return gmailService.sendEmail({
      to: recipientEmail,
      subject,
      bodyHtml
    });
  },

  /**
   * Helper to format and dispatch an account recovery email with temporary password
   */
  sendPasswordRecoveryEmail: async ({
    recipientEmail,
    userName,
    employeeId,
    tempPassword,
    companyName
  }: {
    recipientEmail: string;
    userName: string;
    employeeId: string;
    tempPassword: string;
    companyName?: string;
  }): Promise<{ success: boolean; error?: string; messageId?: string }> => {
    const org = companyName || 'Cost and Planning Database System';
    const subject = `[Account Recovery] Temporary Password for ${org}`;

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
        <div style="border-bottom: 2px solid #780000; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #003049; margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">${org}</h2>
          <p style="margin: 0; color: #780000; font-size: 13px; font-weight: 600;">Account Password Recovery Request</p>
        </div>

        <p style="font-size: 15px; margin-top: 0; line-height: 1.5;">Hello <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          We received a request to recover your credentials and reset the access key for account <strong>${employeeId}</strong>.
        </p>

        <p style="font-size: 14px; color: #334155;">
          An automated temporary password has been generated for your login:
        </p>

        <div style="background-color: #fef2f2; border: 1.5px dashed #f87171; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #991b1b; font-weight: 600; margin-bottom: 6px;">Your Temporary Password</div>
          <div style="font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-size: 24px; font-weight: 700; color: #b91c1c; letter-spacing: 3px;">${tempPassword}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for single-session authentication. Please update your password immediately upon login.</div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 12px; color: #475569;">
          <strong>Quick Login Steps:</strong>
          <ol style="margin: 6px 0 0 16px; padding: 0; line-height: 1.6;">
            <li>Navigate to the login screen of the application.</li>
            <li>Enter your employee ID (<code>${employeeId}</code>) or email (<code>${recipientEmail}</code>).</li>
            <li>Input the temporary password shown above.</li>
            <li>Access your profile under <em>Settings</em> to configure a permanent credential.</li>
          </ol>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
          If you did not initiate this recovery request, please report this immediately to your enterprise administrator.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent securely via integrated Google Workspace Gmail Service.
        </div>
      </div>
    `;

    return gmailService.sendEmail({
      to: recipientEmail,
      subject,
      bodyHtml
    });
  }
};
