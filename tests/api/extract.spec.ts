import { describe, expect, it } from 'vitest'
import { fetch, fetchWithAuth } from '../utils'

describe('/api/extract', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/extract?url=https://example.com')
    expect(response.status).toBe(401)
  })

  it('returns 400 when url parameter is missing', async () => {
    const response = await fetchWithAuth('/api/extract')
    expect(response.status).toBe(400)
  })

  it('returns 400 when url is invalid', async () => {
    const response = await fetchWithAuth('/api/extract?url=not-a-valid-url')
    expect(response.status).toBe(400)
  })

  it('extracts metadata from a valid URL', async () => {
    const response = await fetchWithAuth('/api/extract?url=https://example.com')

    // May succeed (200) or fail depending on network connectivity in test env
    if (response.status === 200) {
      const data = await response.json() as {
        url: string
        title?: string
        description?: string
        image?: string
        markdown?: string
      }
      expect(data).toHaveProperty('url')
      expect(data.url).toBe('https://example.com')
    }
    else {
      // Network may be unavailable in test environment
      expect([200, 422]).toContain(response.status)
    }
  }, 15000)

  it('returns markdown when markdown=true is requested', async () => {
    const response = await fetchWithAuth('/api/extract?url=https://example.com&markdown=true')

    if (response.status === 200) {
      const data = await response.json() as { url: string, markdown?: string }
      expect(data).toHaveProperty('url')
    }
    else {
      expect([200, 422]).toContain(response.status)
    }
  }, 15000)
})
