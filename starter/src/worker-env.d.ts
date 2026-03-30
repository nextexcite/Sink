/**
 * Cloudflare Workers environment bindings.
 * Keep this in sync with wrangler.jsonc.
 * Regenerate with: npm run types
 */
export interface CloudflareEnv {
  // ── Cloudflare bindings ──────────────────────────────────────────────────
  KV: KVNamespace
  R2: R2Bucket
  ANALYTICS: AnalyticsEngineDataset
  AI: Ai
  EMAIL_SENDER: SendEmail

  // ── Secrets / env vars ───────────────────────────────────────────────────
  /** Bearer token required on every API request */
  SITE_TOKEN: string
  /** Resend API key — required to enable /api/email/send */
  RESEND_API_KEY?: string
  /** Default from address for outgoing email */
  EMAIL_FROM?: string
  /** Forward incoming email to this verified address */
  EMAIL_FORWARD_TO?: string
  /** DNS-over-HTTPS endpoint for phishing detection */
  SAFE_BROWSING_DOH?: string

  // ── Vars (wrangler.jsonc [vars]) ─────────────────────────────────────────
  REDIRECT_STATUS_CODE: string
  CASE_SENSITIVE: string
  DISABLE_BOT_LOG: string
  LINK_CACHE_TTL: string
}
