import type { Email } from '../schemas'

export interface SendEmailResult {
  id: string
}

/**
 * Send an email via the Resend REST API.
 * Requires RESEND_API_KEY to be set in the environment.
 */
export async function sendEmailViaResend(
  resendApiKey: string,
  email: Email,
  defaultFrom: string,
): Promise<SendEmailResult> {
  const payload = {
    from: email.from || defaultFrom,
    to: email.to,
    subject: email.subject,
    ...(email.html !== undefined && { html: email.html }),
    ...(email.text !== undefined && { text: email.text }),
    ...(email.cc !== undefined && { cc: email.cc }),
    ...(email.bcc !== undefined && { bcc: email.bcc }),
    ...(email.replyTo !== undefined && { reply_to: email.replyTo }),
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `Resend returned HTTP ${res.status}`)
  }

  return res.json() as Promise<SendEmailResult>
}
