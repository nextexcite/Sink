import type { CloudflareEnv } from '../worker-env'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { extractPage } from '../utils/extract'
import { authMiddleware } from '../utils/auth'

export const extractRoutes = new Hono<{ Bindings: CloudflareEnv }>()

extractRoutes.use('*', authMiddleware)

const QuerySchema = z.object({
  url: z.string().trim().url(),
  markdown: z.coerce.boolean().default(false),
})

/**
 * GET /api/extract
 * Extract OG/meta tags + optional AI markdown from any URL.
 * Useful for AI agents previewing destinations before shortening.
 */
extractRoutes.get('/', zValidator('query', QuerySchema), async (c) => {
  const { url, markdown } = c.req.valid('query')

  try {
    const meta = await extractPage(url, markdown, c.env.AI)
    return c.json(meta)
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch URL'
    return c.json({ error: message }, 422)
  }
})
