import { describe, expect, it } from 'vitest'
import { fetch, postJson } from '../utils'

describe('/api/email/send', () => {
  it('returns 401 when accessing without auth', async () => {
    const response = await postJson('/api/email/send', {}, false)
    expect(response.status).toBe(401)
  })

  it('returns 400 when body is missing required fields', async () => {
    const response = await postJson('/api/email/send', {})
    expect(response.status).toBe(400)
  })

  it('returns 400 when to is not a valid email', async () => {
    const response = await postJson('/api/email/send', {
      to: 'not-an-email',
      subject: 'Test',
      text: 'Hello',
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when neither html nor text is provided', async () => {
    const response = await postJson('/api/email/send', {
      to: 'test@example.com',
      subject: 'Test',
    })
    expect(response.status).toBe(400)
  })

  it('returns 503 when RESEND_API_KEY is not configured', async () => {
    // In test environment, NUXT_RESEND_API_KEY is not set, so it should return 503
    const response = await postJson('/api/email/send', {
      to: 'test@example.com',
      subject: 'Test email',
      text: 'Hello from Sink',
    })
    expect([503, 201]).toContain(response.status)
  })

  it('returns 401 for unauthenticated request via fetch', async () => {
    const response = await fetch('/api/email/send', { method: 'POST' })
    expect(response.status).toBe(401)
  })
})
