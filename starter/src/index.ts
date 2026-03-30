/**
 * my-link-shortener — Cloudflare Workers URL shortener SaaS
 *
 * Stack:
 *  - Hono  : lightweight edge-native web framework
 *  - KV    : stores links (link:{slug}) and parked domains (domain:{hostname})
 *  - R2    : daily KV backups
 *  - Analytics Engine : click-level analytics (slug, url, country, city, UA, device …)
 *  - AI    : optional AI slug generation & HTML→markdown extraction
 *  - Resend: outgoing email via REST API
 *  - Cloudflare Email Routing: receive inbound email (forwarding)
 *
 * API (all under /api/* — requires Bearer token matching SITE_TOKEN):
 *
 *   Link management:
 *     POST   /api/links/create       create a new short link
 *     POST   /api/links/upsert       create or update
 *     PUT    /api/links/edit         update an existing link
 *     GET    /api/links/query?slug=  fetch link by slug
 *     GET    /api/links/list         paginated list
 *     POST   /api/links/delete       delete a link
 *
 *   Domain parking:
 *     POST   /api/domains/create     register a domain (redirect | parked)
 *     GET    /api/domains/query?hostname=  fetch domain
 *     GET    /api/domains/list       paginated list
 *     POST   /api/domains/delete     unregister a domain
 *
 *   Email:
 *     POST   /api/email/send         send email via Resend
 *
 *   Utilities:
 *     GET    /api/extract?url=       extract OG/meta + optional AI markdown
 *     GET    /api/verify             token health-check
 *
 *   Redirect (no auth):
 *     GET    /:slug                  follow a short link
 */

import { Hono } from 'hono'
import type { CloudflareEnv } from './worker-env'
import { getLink } from './utils/link-store'
import { writeAccessLog } from './utils/access-log'
import { authMiddleware } from './utils/auth'
import { linkRoutes } from './routes/links'
import { domainRoutes } from './routes/domains'
import { emailRoutes } from './routes/email'
import { extractRoutes } from './routes/extract'

const app = new Hono<{ Bindings: CloudflareEnv }>()

// ── Health / token verify ─────────────────────────────────────────────────────

app.get('/api/verify', authMiddleware, c => c.json({ ok: true }))

// ── API routes ────────────────────────────────────────────────────────────────

app.route('/api/links', linkRoutes)
app.route('/api/domains', domainRoutes)
app.route('/api/email', emailRoutes)
app.route('/api/extract', extractRoutes)

// ── Redirect handler ─────────────────────────────────────────────────────────

/**
 * Very fast: KV lookup (edge-cached) → 301/302 redirect.
 * Writes an Analytics Engine data point (fire-and-forget, zero latency impact).
 */
app.get('/:slug{[a-zA-Z0-9\\-_/]+}', async (c) => {
  const slug = c.env.CASE_SENSITIVE === 'true'
    ? c.req.param('slug')
    : c.req.param('slug').toLowerCase()

  const cacheTtl = Number(c.env.LINK_CACHE_TTL || 60)
  const link = await getLink(c.env.KV, slug, cacheTtl)

  if (!link) {
    return c.json({ error: 'Link not found' }, 404)
  }

  // Fire-and-forget analytics write — never blocks the redirect
  if (c.env.ANALYTICS && c.env.DISABLE_BOT_LOG !== 'true') {
    try {
      writeAccessLog(c.env.ANALYTICS, c, slug, link.url)
    }
    catch {
      // analytics errors must not affect redirects
    }
  }

  const status = Number(c.env.REDIRECT_STATUS_CODE || 301)
  return c.redirect(link.url, status as 301 | 302)
})

// ── Cloudflare Email Routing (inbound) ────────────────────────────────────────

/**
 * Cloudflare calls this handler for every inbound email routed to your Worker.
 * Configure your Email Routing destination to "Send to a Worker" in the dashboard.
 * Docs: https://developers.cloudflare.com/email-routing/email-workers/
 */
async function emailHandler(
  message: ForwardableEmailMessage,
  env: CloudflareEnv,
): Promise<void> {
  console.info(`[email] received from=${message.from} to=${message.to}`)

  if (env.EMAIL_FORWARD_TO) {
    try {
      await message.forward(env.EMAIL_FORWARD_TO)
      console.info(`[email] forwarded to ${env.EMAIL_FORWARD_TO}`)
    }
    catch (err) {
      console.error('[email] forward failed:', err)
      message.setReject('Internal error — could not forward email')
    }
    return
  }

  // No forwarding configured — reject gracefully
  message.setReject('Address not found')
}

// ── Scheduled backup ──────────────────────────────────────────────────────────

/**
 * Dumps all KV link data to R2 as a JSON file once per day.
 * Triggered by the cron in wrangler.jsonc: "0 0 * * *"
 */
async function scheduledHandler(
  _controller: ScheduledController,
  env: CloudflareEnv,
): Promise<void> {
  if (!env.R2) return

  let cursor: string | undefined
  const links = []

  do {
    const page = await env.KV.list({ prefix: 'link:', cursor, limit: 500 })
    const values = await Promise.all(
      page.keys.map(k => env.KV.get(k.name, { type: 'json' })),
    )
    links.push(...values.filter(Boolean))
    cursor = page.list_complete ? undefined : (page as KVNamespaceListResult<unknown> & { cursor?: string }).cursor
  } while (cursor)

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  await env.R2.put(`backups/links-${ts}.json`, JSON.stringify({ exportedAt: ts, count: links.length, links }, null, 2))
  console.info(`[backup] wrote ${links.length} links to R2`)
}

// ── Worker export ─────────────────────────────────────────────────────────────

export default {
  fetch: app.fetch,
  email: emailHandler,
  scheduled: scheduledHandler,
} satisfies ExportedHandler<CloudflareEnv>
