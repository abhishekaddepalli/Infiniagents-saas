/**
 * Email templates.
 *
 * Plain functions returning HTML and a text fallback — no template engine, so
 * you can restyle them by editing the markup directly. Colours and the product
 * name are passed in, so branding set in the admin panel carries into email.
 */
export type BrandContext = {
  appName: string
  appUrl: string
  supportEmail: string
}

function layout(brand: BrandContext, heading: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${brand.appName}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#111827;font-weight:600;">${heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#4b5563;">${body}</div>
        </td></tr>
        ${
          cta
            ? `<tr><td style="padding:24px 32px 0;">
                 <a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9px;font-size:15px;font-weight:500;">${cta.label}</a>
               </td></tr>
               <tr><td style="padding:16px 32px 0;">
                 <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">If the button does not work, copy this link into your browser:<br>
                 <span style="color:#6b7280;word-break:break-all;">${cta.url}</span></p>
               </td></tr>`
            : ''
        }
        <tr><td style="padding:28px 32px 32px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
            Sent by ${brand.appName}. Questions? Reply to this email or contact
            <a href="mailto:${brand.supportEmail}" style="color:#6b7280;">${brand.supportEmail}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function verifyEmailTemplate(brand: BrandContext, name: string, url: string) {
  return {
    subject: `Confirm your email address`,
    html: layout(
      brand,
      `Welcome, ${name}`,
      `<p style="margin:0 0 12px;">Confirm this address to finish setting up your ${brand.appName} account.</p>
       <p style="margin:0;">This link expires in 24 hours.</p>`,
      { label: 'Confirm email address', url },
    ),
    text: `Welcome, ${name}\n\nConfirm your email address to finish setting up your ${brand.appName} account:\n\n${url}\n\nThis link expires in 24 hours.`,
  }
}

export function resetPasswordTemplate(brand: BrandContext, url: string) {
  return {
    subject: 'Reset your password',
    html: layout(
      brand,
      'Reset your password',
      `<p style="margin:0 0 12px;">We received a request to reset the password on your ${brand.appName} account.</p>
       <p style="margin:0;">This link expires in one hour. If you did not request it, you can safely ignore this email — your password will not change.</p>`,
      { label: 'Choose a new password', url },
    ),
    text: `Reset your password\n\nWe received a request to reset the password on your ${brand.appName} account:\n\n${url}\n\nThis link expires in one hour. If you did not request it, ignore this email.`,
  }
}

export function welcomeTemplate(brand: BrandContext, name: string) {
  return {
    subject: `Welcome to ${brand.appName}`,
    html: layout(
      brand,
      `You're all set, ${name}`,
      `<p style="margin:0 0 12px;">Your ${brand.appName} account is ready.</p>
       <p style="margin:0 0 12px;">A good first step is to open the template library and turn one of the ready-made agents into your own, then test it in the playground.</p>`,
      { label: 'Open your dashboard', url: `${brand.appUrl}/dashboard` },
    ),
    text: `You're all set, ${name}\n\nYour ${brand.appName} account is ready.\n\nOpen your dashboard: ${brand.appUrl}/dashboard`,
  }
}

export function invitationTemplate(
  brand: BrandContext,
  options: { inviterName: string; workspaceName: string; url: string },
) {
  return {
    subject: `${options.inviterName} invited you to ${options.workspaceName}`,
    html: layout(
      brand,
      `Join ${options.workspaceName}`,
      `<p style="margin:0 0 12px;"><strong>${options.inviterName}</strong> has invited you to collaborate in the
        <strong>${options.workspaceName}</strong> workspace on ${brand.appName}.</p>
       <p style="margin:0;">This invitation expires in 7 days.</p>`,
      { label: 'Accept invitation', url: options.url },
    ),
    text: `${options.inviterName} invited you to join the ${options.workspaceName} workspace on ${brand.appName}.\n\nAccept: ${options.url}\n\nThis invitation expires in 7 days.`,
  }
}

/** Used by the SEND_EMAIL automation node. */
export function automationTemplate(brand: BrandContext, subject: string, body: string) {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
  return {
    subject,
    html: layout(brand, subject, `<p style="margin:0;">${escaped}</p>`),
    text: body,
  }
}
