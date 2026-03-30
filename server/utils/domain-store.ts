import type { Domain } from '#shared/schemas/domain'
import type { H3Event } from 'h3'

export async function putDomain(event: H3Event, domain: Domain): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.put(`domain:${domain.hostname}`, JSON.stringify(domain), {
    metadata: {
      hostname: domain.hostname,
      type: domain.type,
      comment: domain.comment,
    },
  })
}

export async function getDomain(event: H3Event, hostname: string): Promise<Domain | null> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  return await KV.get(`domain:${hostname}`, { type: 'json' }) as Domain | null
}

export async function deleteDomain(event: H3Event, hostname: string): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  await KV.delete(`domain:${hostname}`)
}

export async function domainExists(event: H3Event, hostname: string): Promise<boolean> {
  const domain = await getDomain(event, hostname)
  return domain !== null
}

interface ListDomainsOptions {
  limit: number
  cursor?: string
}

interface ListDomainsResult {
  domains: (Domain | null)[]
  list_complete: boolean
  cursor?: string
}

export async function listDomains(event: H3Event, options: ListDomainsOptions): Promise<ListDomainsResult> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const list = await KV.list({
    prefix: 'domain:',
    limit: options.limit,
    cursor: options.cursor || undefined,
  })

  const domains = await Promise.all(
    (list.keys || []).map(async (key: { name: string }) => {
      return await KV.get(key.name, { type: 'json' }) as Domain | null
    }),
  )

  return {
    domains,
    list_complete: list.list_complete,
    cursor: 'cursor' in list ? list.cursor : undefined,
  }
}
