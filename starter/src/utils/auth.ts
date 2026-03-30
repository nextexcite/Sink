import type { MiddlewareHandler } from 'hono'
import type { CloudflareEnv } from '../worker-env'
import { HTTPException } from 'hono/http-exception'

/**
 * Bearer-token authentication middleware.
 * Reads SITE_TOKEN from env and compares to the Authorization header.
 *
 * Usage: app.use('/api/*', authMiddleware)
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: CloudflareEnv }> = async (c, next) => {
  const siteToken = c.env.SITE_TOKEN
  const authHeader = c.req.header('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!siteToken || token !== siteToken) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  await next()
}
