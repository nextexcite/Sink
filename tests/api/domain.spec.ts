import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth, postJson } from '../utils'

const testDomain = {
  hostname: 'test-domain.example.com',
  target: 'https://example.com',
  type: 'redirect' as const,
  comment: 'Test domain',
}

describe.sequential('/api/domain/create', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/domain/create', {}, false)
    expect(response.status).toBe(401)
  })

  it('returns 400 when hostname is missing', async () => {
    const response = await postJson('/api/domain/create', { type: 'redirect', target: 'https://example.com' })
    expect(response.status).toBe(400)
  })

  it('returns 400 when redirect type has no target', async () => {
    const response = await postJson('/api/domain/create', {
      hostname: 'no-target.example.com',
      type: 'redirect',
    })
    expect(response.status).toBe(400)
  })

  it('creates a domain with valid data', async () => {
    const response = await postJson('/api/domain/create', testDomain)
    expect(response.status).toBe(201)

    const data = await response.json() as { domain: typeof testDomain }
    expect(data.domain).toBeDefined()
    expect(data.domain.hostname).toBe(testDomain.hostname)
    expect(data.domain.target).toBe(testDomain.target)
    expect(data.domain.type).toBe('redirect')
  })

  it('returns 409 when domain already exists', async () => {
    const response = await postJson('/api/domain/create', testDomain)
    expect(response.status).toBe(409)
  })

  it('creates a parked domain without target', async () => {
    const response = await postJson('/api/domain/create', {
      hostname: 'parked.example.com',
      type: 'parked',
    })
    expect(response.status).toBe(201)
  })
})

describe.sequential('/api/domain/query', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await fetch(`/api/domain/query?hostname=${testDomain.hostname}`)
    expect(response.status).toBe(401)
  })

  it('returns domain data for valid hostname', async () => {
    const response = await fetchWithAuth(`/api/domain/query?hostname=${testDomain.hostname}`)
    expect(response.status).toBe(200)

    const data = await response.json() as { hostname: string, target: string }
    expect(data.hostname).toBe(testDomain.hostname)
    expect(data.target).toBe(testDomain.target)
  })

  it('returns 404 for non-existent domain', async () => {
    const response = await fetchWithAuth('/api/domain/query?hostname=nonexistent.example.com')
    expect(response.status).toBe(404)
  })

  it('returns 400 when hostname is missing', async () => {
    const response = await fetchWithAuth('/api/domain/query')
    expect(response.status).toBe(400)
  })
})

describe.sequential('/api/domain/list', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/domain/list')
    expect(response.status).toBe(401)
  })

  it('returns paginated domain list', async () => {
    const response = await fetchWithAuth('/api/domain/list')
    expect(response.status).toBe(200)

    const data = await response.json() as { domains: unknown[], list_complete: boolean }
    expect(data).toHaveProperty('domains')
    expect(data).toHaveProperty('list_complete')
    expect(data.domains).toBeInstanceOf(Array)
    expect(data.domains.length).toBeGreaterThanOrEqual(1)
  })

  it('supports limit parameter', async () => {
    const response = await fetchWithAuth('/api/domain/list?limit=5')
    expect(response.status).toBe(200)

    const data = await response.json() as { domains: unknown[] }
    expect(data.domains.length).toBeLessThanOrEqual(5)
  })
})

describe.sequential('/api/domain/delete', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/domain/delete', {}, false)
    expect(response.status).toBe(401)
  })

  it('returns 400 when hostname is missing', async () => {
    const response = await postJson('/api/domain/delete', {})
    expect(response.status).toBe(400)
  })

  it('returns 404 for non-existent domain', async () => {
    const response = await postJson('/api/domain/delete', { hostname: 'nonexistent.example.com' })
    expect(response.status).toBe(404)
  })

  it('deletes a domain with valid hostname', async () => {
    const response = await postJson('/api/domain/delete', { hostname: testDomain.hostname })
    expect(response.status).toBe(204)
  })

  it('deletes parked domain', async () => {
    const response = await postJson('/api/domain/delete', { hostname: 'parked.example.com' })
    expect(response.status).toBe(204)
  })
})
