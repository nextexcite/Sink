import type { Domain } from '../schemas'

const key = (hostname: string) => `domain:${hostname}`

export async function putDomain(kv: KVNamespace, domain: Domain): Promise<void> {
  await kv.put(key(domain.hostname), JSON.stringify(domain), {
    metadata: { hostname: domain.hostname, type: domain.type },
  })
}

export async function getDomain(kv: KVNamespace, hostname: string): Promise<Domain | null> {
  return kv.get<Domain>(key(hostname), { type: 'json' }) ?? null
}

export async function deleteDomain(kv: KVNamespace, hostname: string): Promise<void> {
  await kv.delete(key(hostname))
}

export interface ListDomainsResult {
  domains: Domain[]
  list_complete: boolean
  cursor?: string
}

export async function listDomains(
  kv: KVNamespace,
  options: { limit: number; cursor?: string },
): Promise<ListDomainsResult> {
  const list = await kv.list({ prefix: 'domain:', limit: options.limit, cursor: options.cursor })
  const domains = (
    await Promise.all(list.keys.map(k => kv.get<Domain>(k.name, { type: 'json' })))
  ).filter((d): d is Domain => d !== null)

  return {
    domains,
    list_complete: list.list_complete,
    cursor: list.list_complete ? undefined : (list as KVNamespaceListResult<unknown> & { cursor?: string }).cursor,
  }
}
