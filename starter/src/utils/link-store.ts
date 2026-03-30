import type { CloudflareEnv } from '../worker-env'
import type { Link } from '../schemas'

// ── KV key helpers ────────────────────────────────────────────────────────────

const key = (slug: string) => `link:${slug}`

// ── Persistence ───────────────────────────────────────────────────────────────

export async function putLink(kv: KVNamespace, link: Link, _env: CloudflareEnv): Promise<void> {
  await kv.put(key(link.slug), JSON.stringify(link), {
    // KV native expiration (Unix timestamp) — auto-deletes expired links
    ...(link.expiration !== undefined && { expiration: link.expiration }),
    metadata: { url: link.url, comment: link.comment, expiration: link.expiration },
  })
}

export async function getLink(kv: KVNamespace, slug: string, cacheTtl?: number): Promise<Link | null> {
  return kv.get<Link>(key(slug), { type: 'json', cacheTtl }) ?? null
}

export async function deleteLink(kv: KVNamespace, slug: string): Promise<void> {
  await kv.delete(key(slug))
}

export async function linkExists(kv: KVNamespace, slug: string): Promise<boolean> {
  const v = await kv.get(key(slug))
  return v !== null
}

export interface ListLinksResult {
  links: Link[]
  list_complete: boolean
  cursor?: string
}

export async function listLinks(
  kv: KVNamespace,
  options: { limit: number; cursor?: string },
): Promise<ListLinksResult> {
  const list = await kv.list({ prefix: 'link:', limit: options.limit, cursor: options.cursor })
  const links = (
    await Promise.all(list.keys.map(k => kv.get<Link>(k.name, { type: 'json' })))
  ).filter((l): l is Link => l !== null)

  return {
    links,
    list_complete: list.list_complete,
    cursor: list.list_complete ? undefined : (list as KVNamespaceListResult<unknown> & { cursor?: string }).cursor,
  }
}
