import { customAlphabet } from 'nanoid'
import { z } from 'zod'

// ── Helpers ───────────────────────────────────────────────────────────────────

const nanoid = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6)

/** Slugs: alphanumeric + hyphens + slashes (for path-nested slugs) */
export const SLUG_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9\-_/]*[a-zA-Z0-9])?$/

/** RFC 1123 hostname label regex */
const HOSTNAME_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i

// ── Link ─────────────────────────────────────────────────────────────────────

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(() => nanoid()),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(SLUG_REGEX).default(() => nanoid()),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().default(() => Math.floor(Date.now() / 1000)),
  /** Unix timestamp — link expires at this time */
  expiration: z.number().int().refine(v => v > Math.floor(Date.now() / 1000), {
    message: 'expiration must be in the future',
  }).optional(),
  /** OG/preview metadata */
  title: z.string().trim().max(256).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().max(512).optional(),
  /** Mobile deep-link redirects */
  apple: z.string().trim().url().max(2048).optional(),
  google: z.string().trim().url().max(2048).optional(),
  /** Wrap destination in an iframe (hide the actual URL) */
  cloaking: z.boolean().optional(),
  /** Pass through query string parameters to destination */
  redirectWithQuery: z.boolean().optional(),
  /** Require a password before following the link */
  password: z.string().trim().min(1).max(128).optional(),
  /** Show a phishing/safety warning before redirect */
  unsafe: z.boolean().optional(),
})

export type Link = z.infer<typeof LinkSchema>

// ── Domain parking ────────────────────────────────────────────────────────────

export const DomainSchema = z.object({
  hostname: z.string().trim().min(1).max(253).regex(HOSTNAME_REGEX, { message: 'Invalid hostname' }),
  /** Where to redirect — required when type is "redirect" */
  target: z.string().trim().url().max(2048).optional(),
  type: z.enum(['redirect', 'parked']).default('redirect'),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().default(() => Math.floor(Date.now() / 1000)),
})

export type Domain = z.infer<typeof DomainSchema>

// ── Email ─────────────────────────────────────────────────────────────────────

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
}).refine(d => d.html !== undefined || d.text !== undefined, {
  message: 'At least one of html or text must be provided',
  path: ['html'],
})

export type Email = z.infer<typeof EmailSchema>
