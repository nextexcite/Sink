import type { CloudflareEnv } from '../worker-env'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { DomainSchema } from '../schemas'
import { deleteDomain, getDomain, listDomains, putDomain } from '../utils/domain-store'
import { authMiddleware } from '../utils/auth'

export const domainRoutes = new Hono<{ Bindings: CloudflareEnv }>()

domainRoutes.use('*', authMiddleware)

// ── Create ────────────────────────────────────────────────────────────────────

domainRoutes.post('/create', zValidator('json', DomainSchema), async (c) => {
  const domain = c.req.valid('json')

  if (domain.type === 'redirect' && !domain.target) {
    return c.json({ error: 'target URL is required for redirect domains' }, 400)
  }

  const existing = await getDomain(c.env.KV, domain.hostname)
  if (existing) return c.json({ error: 'Domain already exists' }, 409)

  await putDomain(c.env.KV, domain)
  return c.json({ domain }, 201)
})

// ── Query ─────────────────────────────────────────────────────────────────────

const QuerySchema = z.object({ hostname: DomainSchema.shape.hostname })

domainRoutes.get('/query', zValidator('query', QuerySchema), async (c) => {
  const { hostname } = c.req.valid('query')
  const domain = await getDomain(c.env.KV, hostname)
  if (!domain) return c.json({ error: 'Domain not found' }, 404)
  return c.json(domain)
})

// ── List ──────────────────────────────────────────────────────────────────────

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1024).default(20),
  cursor: z.string().optional(),
})

domainRoutes.get('/list', zValidator('query', ListSchema), async (c) => {
  const { limit, cursor } = c.req.valid('query')
  return c.json(await listDomains(c.env.KV, { limit, cursor }))
})

// ── Delete ────────────────────────────────────────────────────────────────────

const DeleteSchema = z.object({ hostname: DomainSchema.shape.hostname })

domainRoutes.post('/delete', zValidator('json', DeleteSchema), async (c) => {
  const { hostname } = c.req.valid('json')
  const existing = await getDomain(c.env.KV, hostname)
  if (!existing) return c.json({ error: 'Domain not found' }, 404)
  await deleteDomain(c.env.KV, hostname)
  return new Response(null, { status: 204 })
})
