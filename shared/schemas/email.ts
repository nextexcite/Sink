import { z } from 'zod'

const emailOrArray = z.union([
  z.string().trim().email(),
  z.array(z.string().trim().email()).min(1),
])

export const EmailSchema = z.object({
  to: emailOrArray,
  from: z.string().trim().email().optional(),
  subject: z.string().trim().min(1).max(998),
  html: z.string().optional(),
  text: z.string().optional(),
  cc: emailOrArray.optional(),
  bcc: emailOrArray.optional(),
  replyTo: z.string().trim().email().optional(),
  tags: z.array(z.object({
    name: z.string().trim().min(1).max(256),
    value: z.string().trim().min(1).max(256),
  })).optional(),
}).refine(data => data.html !== undefined || data.text !== undefined, {
  message: 'Either html or text must be provided',
  path: ['html'],
})

export type Email = z.infer<typeof EmailSchema>
