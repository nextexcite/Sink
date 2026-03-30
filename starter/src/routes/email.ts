import type { CloudflareEnv } from '../worker-env'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { EmailSchema } from '../schemas'
import { sendEmailViaResend } from '../utils/email'
import { authMiddleware } from '../utils/auth'

export const emailRoutes = new Hono<{ Bindings: CloudflareEnv }>()

emailRoutes.use('*', authMiddleware)

/**
 * POST /api/email/send
 * Send an email via Resend. Requires RESEND_API_KEY env var.
 */
emailRoutes.post('/send', zValidator('json', EmailSchema), async (c) => {
  const email = c.req.valid('json')

  if (!c.env.RESEND_API_KEY) {
    return c.json({ error: 'Email service not configured (missing RESEND_API_KEY)' }, 503)
  }

  try {
    const result = await sendEmailViaResend(
      c.env.RESEND_API_KEY,
      email,
      c.env.EMAIL_FROM ?? 'noreply@example.com',
    )
    return c.json(result, 201)
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return c.json({ error: message }, 502)
  }
})
