const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!

function emailHtml(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">T</div>
            <span style="color:#F1F5F9;font-size:18px;font-weight:600">TaxOS</span>
          </div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#1E293B;border:1px solid #1F2C42;border-radius:20px;padding:32px">
          <h1 style="margin:0 0 8px;color:#F1F5F9;font-size:20px;font-weight:600">${title}</h1>
          <p style="margin:0 0 24px;color:#94A3B8;font-size:14px;line-height:1.6">${body}</p>
          ${cta ? `<a href="${cta.url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600">${cta.label} →</a>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;color:#475569;font-size:12px">
          Sent by TaxOS · Your ITR filing portal
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
  } catch { /* non-critical */ }
}

// ── Admin emails ──────────────────────────────────────────────────────────────

export async function emailAdminNewLead(name: string, phone: string, itr: string): Promise<void> {
  const html = emailHtml(
    '🧾 New lead from assessment',
    `<strong>${name}</strong> completed the ITR assessment.<br><br>
     Phone: ${phone}<br>
     Recommended: <strong>${itr}</strong>`,
    { label: 'View leads', url: `${window.location.origin}/admin/leads` }
  )
  await sendEmail(ADMIN_EMAIL, `New lead: ${name} · ${itr}`, html)
}

export async function emailAdminDocUploaded(clientName: string, docName: string, clientId: string): Promise<void> {
  const html = emailHtml(
    '📄 Document uploaded',
    `<strong>${clientName}</strong> uploaded a new document:<br><br>
     <strong>${docName}</strong><br><br>
     Please review and approve or request resubmission.`,
    { label: 'Review document', url: `${window.location.origin}/admin/clients/${clientId}` }
  )
  await sendEmail(ADMIN_EMAIL, `Document uploaded: ${docName} by ${clientName}`, html)
}

export async function emailAdminNewMessage(clientName: string, message: string, clientId: string): Promise<void> {
  const html = emailHtml(
    '💬 New message from client',
    `<strong>${clientName}</strong> sent you a message:<br><br>
     <em style="color:#CBD5E1">"${message.slice(0, 200)}${message.length > 200 ? '…' : ''}"</em>`,
    { label: 'Reply in portal', url: `${window.location.origin}/admin/clients/${clientId}` }
  )
  await sendEmail(ADMIN_EMAIL, `Message from ${clientName}`, html)
}

export async function emailAdminPaymentSubmitted(clientName: string, amount: number, utr: string, mode: string, clientId: string): Promise<void> {
  const html = emailHtml(
    '💰 Payment submitted for verification',
    `<strong>${clientName}</strong> submitted a payment:<br><br>
     Amount: <strong>₹${amount.toLocaleString('en-IN')}</strong><br>
     Mode: ${mode.toUpperCase()}<br>
     UTR: <code style="font-family:monospace;background:#141E33;color:#94A3B8;padding:2px 6px;border-radius:4px">${utr}</code><br><br>
     Please verify in your bank/UPI app and approve.`,
    { label: 'Approve payment', url: `${window.location.origin}/admin/clients/${clientId}` }
  )
  await sendEmail(ADMIN_EMAIL, `Payment submitted: ₹${amount.toLocaleString('en-IN')} by ${clientName}`, html)
}

// ── Client emails ─────────────────────────────────────────────────────────────

export async function emailClientDocApproved(clientEmail: string, clientName: string, docName: string): Promise<void> {
  const html = emailHtml(
    '✅ Document approved',
    `Hi ${clientName},<br><br>
     Your document <strong>${docName}</strong> has been reviewed and approved.<br><br>
     Your consultant will move forward with your ITR filing.`,
    { label: 'View your portal', url: `${window.location.origin}/dashboard/documents` }
  )
  await sendEmail(clientEmail, `Document approved: ${docName}`, html)
}

export async function emailClientDocRejected(clientEmail: string, clientName: string, docName: string, reason: string): Promise<void> {
  const html = emailHtml(
    '⚠️ Document needs resubmission',
    `Hi ${clientName},<br><br>
     Your document <strong>${docName}</strong> needs to be resubmitted.<br><br>
     Reason: <em>${reason}</em><br><br>
     Please upload the correct document at your earliest convenience.`,
    { label: 'Upload now', url: `${window.location.origin}/dashboard/documents` }
  )
  await sendEmail(clientEmail, `Please resubmit: ${docName}`, html)
}

export async function emailClientNewMessage(clientEmail: string, clientName: string, message: string): Promise<void> {
  const html = emailHtml(
    '💬 New message from your consultant',
    `Hi ${clientName},<br><br>
     Your tax consultant sent you a message:<br><br>
     <em style="color:#CBD5E1">"${message.slice(0, 200)}${message.length > 200 ? '…' : ''}"</em>`,
    { label: 'Reply in portal', url: `${window.location.origin}/dashboard/messages` }
  )
  await sendEmail(clientEmail, 'New message from your consultant', html)
}

export async function emailClientPaymentApproved(clientEmail: string, clientName: string, amount: number): Promise<void> {
  const html = emailHtml(
    '✅ Payment confirmed',
    `Hi ${clientName},<br><br>
     Your payment of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been verified and recorded.<br><br>
     Thank you! Your consultant will continue working on your ITR filing.`,
    { label: 'View payment details', url: `${window.location.origin}/dashboard/payments` }
  )
  await sendEmail(clientEmail, `Payment confirmed: ₹${amount.toLocaleString('en-IN')}`, html)
}

export async function emailClientPaymentRejected(clientEmail: string, clientName: string, amount: number, reason: string): Promise<void> {
  const html = emailHtml(
    '⚠️ Payment could not be verified',
    `Hi ${clientName},<br><br>
     We were unable to verify your payment of <strong>₹${amount.toLocaleString('en-IN')}</strong>.<br><br>
     Reason: <em>${reason}</em><br><br>
     Please resubmit your UTR or contact your consultant.`,
    { label: 'Resubmit payment', url: `${window.location.origin}/dashboard/payments` }
  )
  await sendEmail(clientEmail, 'Payment verification failed', html)
}
