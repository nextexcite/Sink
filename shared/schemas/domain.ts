import { z } from 'zod'

// RFC 1123 hostname label: each part 1–63 chars, lowercase/digit/hyphen, total ≤253 chars
const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i

export const DomainSchema = z.object({
  hostname: z.string().trim().min(1).max(253).regex(hostnameRegex, {
    message: 'Invalid hostname format',
  }),
  target: z.string().trim().url().max(2048).optional(),
  type: z.enum(['redirect', 'parked']).default('redirect'),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
})

export type Domain = z.infer<typeof DomainSchema>
