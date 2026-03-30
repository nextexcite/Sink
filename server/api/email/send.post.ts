import { EmailSchema } from '#shared/schemas/email'

defineRouteMeta({
  openAPI: {
    description: 'Send an email via Resend. Requires NUXT_RESEND_API_KEY to be configured.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            required: ['to', 'subject'],
            properties: {
              to: { type: 'string' as const, description: 'Recipient email address(es) — single address or JSON array of addresses' },
              from: { type: 'string' as const, description: 'Sender email (uses NUXT_EMAIL_FROM if not provided)' },
              subject: { type: 'string' as const, description: 'Email subject' },
              html: { type: 'string' as const, description: 'HTML email body' },
              text: { type: 'string' as const, description: 'Plain text email body' },
              cc: { type: 'string' as const, description: 'CC recipient(s)' },
              bcc: { type: 'string' as const, description: 'BCC recipient(s)' },
              replyTo: { type: 'string' as const, description: 'Reply-to address' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const email = await readValidatedBody(event, EmailSchema.parse)
  const result = await sendEmail(event, email)
  setResponseStatus(event, 201)
  return result
})
