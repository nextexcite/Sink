import type { Email } from '#shared/schemas/email'
import type { H3Event } from 'h3'
import { ofetch } from 'ofetch'

export interface SendEmailResult {
  id: string
}

export async function sendEmail(event: H3Event, email: Email): Promise<SendEmailResult> {
  const { resendApiKey, emailFrom } = useRuntimeConfig(event)

  if (!resendApiKey) {
    throw createError({ status: 503, statusText: 'Email service is not configured (missing NUXT_RESEND_API_KEY)' })
  }

  const payload = {
    from: email.from || emailFrom || 'noreply@example.com',
    to: email.to,
    subject: email.subject,
    ...(email.html !== undefined && { html: email.html }),
    ...(email.text !== undefined && { text: email.text }),
    ...(email.cc !== undefined && { cc: email.cc }),
    ...(email.bcc !== undefined && { bcc: email.bcc }),
    ...(email.replyTo !== undefined && { reply_to: email.replyTo }),
    ...(email.tags !== undefined && { tags: email.tags }),
  }

  try {
    const result = await ofetch<SendEmailResult>('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    })
    return result
  }
  catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 502
    const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to send email'
    throw createError({ status, statusText: message })
  }
}
