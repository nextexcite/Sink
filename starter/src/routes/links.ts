import type { CloudflareEnv } from '../worker-env'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Link } from '../schemas'
import { LinkSchema } from '../schemas'
import {
  deleteLink,
  getLink,
  linkExists,
  listLinks,
  putLink,
} from '../utils/link-store'
import { authMiddleware } from '../utils/auth'

export const linkRoutes = new Hono<{ Bindings: CloudflareEnv }>()

linkRoutes.use('*', authMiddleware)

// ── Create ────────────────────────────────────────────────────────────────────

linkRoutes.post('/create', zValidator('json', LinkSchema), async (c) => {
  const link = c.req.valid('json')
  const normalSlug = c.env.CASE_SENSITIVE === 'true' ? link.slug : link.slug.toLowerCase()
  link.slug = normalSlug

  if (await linkExists(c.env.KV, link.slug)) {
    return c.json({ error: 'Link already exists' }, 409)
  }

  await putLink(c.env.KV, link, c.env)
  return c.json({ link, shortLink: `${new URL(c.req.url).origin}/${link.slug}` }, 201)
})

// ── Upsert ────────────────────────────────────────────────────────────────────

linkRoutes.post('/upsert', zValidator('json', LinkSchema), async (c) => {
  const link = c.req.valid('json')
  const normalSlug = c.env.CASE_SENSITIVE === 'true' ? link.slug : link.slug.toLowerCase()
  link.slug = normalSlug

  const existing = await getLink(c.env.KV, link.slug)
  const status = existing ? 200 : 201

  if (existing) {
    link.createdAt = existing.createdAt
    link.updatedAt = Math.floor(Date.now() / 1000)
  }

  await putLink(c.env.KV, link, c.env)
  return c.json({ link, shortLink: `${new URL(c.req.url).origin}/${link.slug}` }, status)
})

// ── Edit ──────────────────────────────────────────────────────────────────────

linkRoutes.put('/edit', zValidator('json', LinkSchema.required({ url: true, slug: true })), async (c) => {
  const update = c.req.valid('json') as Link
  const normalSlug = c.env.CASE_SENSITIVE === 'true' ? update.slug : update.slug.toLowerCase()

  const existing = await getLink(c.env.KV, normalSlug)
  if (!existing) {
    return c.json({ error: 'Link not found' }, 404)
  }

  const link: Link = { ...update, slug: normalSlug, createdAt: existing.createdAt, updatedAt: Math.floor(Date.now() / 1000) }
  await putLink(c.env.KV, link, c.env)
  return c.json({ link, shortLink: `${new URL(c.req.url).origin}/${normalSlug}` }, 200)
})

// ── Query ─────────────────────────────────────────────────────────────────────

const QuerySchema = z.object({ slug: z.string().min(1) })

linkRoutes.get('/query', zValidator('query', QuerySchema), async (c) => {
  const { slug } = c.req.valid('query')
  const link = await getLink(c.env.KV, slug)
  if (!link) return c.json({ error: 'Link not found' }, 404)
  return c.json(link)
})

// ── List ──────────────────────────────────────────────────────────────────────

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1024).default(20),
  cursor: z.string().optional(),
})

linkRoutes.get('/list', zValidator('query', ListSchema), async (c) => {
  const { limit, cursor } = c.req.valid('query')
  return c.json(await listLinks(c.env.KV, { limit, cursor }))
})

// ── Delete ────────────────────────────────────────────────────────────────────

const DeleteSchema = z.object({ slug: z.string().min(1) })

linkRoutes.post('/delete', zValidator('json', DeleteSchema), async (c) => {
  const { slug } = c.req.valid('json')
  await deleteLink(c.env.KV, slug)
  return new Response(null, { status: 204 })
})
