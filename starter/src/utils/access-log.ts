import type { Context } from 'hono'
import type { CloudflareEnv } from '../worker-env'

/**
 * Write a single click event to Cloudflare Analytics Engine.
 * Each row maps to the "links" dataset configured in wrangler.jsonc.
 *
 * Blob columns (strings): slug, url, country, city, referer, ua, device, os, browser
 * Double columns (numbers): latitude, longitude
 */
export function writeAccessLog(
  analytics: AnalyticsEngineDataset,
  c: Context<{ Bindings: CloudflareEnv }>,
  slug: string,
  url: string,
): void {
  const cf = c.req.raw.cf as Record<string, string | number | undefined> | undefined
  const ua = c.req.header('user-agent') ?? ''
  const referer = c.req.header('referer') ?? ''

  analytics.writeDataPoint({
    blobs: [
      slug,
      url,
      String(cf?.country ?? ''),
      String(cf?.city ?? ''),
      referer,
      ua,
      String(cf?.deviceType ?? ''),
    ],
    doubles: [
      Number(cf?.latitude ?? 0),
      Number(cf?.longitude ?? 0),
    ],
    indexes: [slug],
  })
}
