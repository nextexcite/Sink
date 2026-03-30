/**
 * Fetch a URL and return page metadata + optional markdown content.
 * Uses the Cloudflare AI `toMarkdown()` API to convert HTML when the AI
 * binding is available.
 */

const MAX_MARKDOWN_LENGTH = 4096

function extractMeta(html: string, ...names: string[]): string | undefined {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`
      + `|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      'i',
    )
    const m = html.match(pattern)
    const value = m?.[1] ?? m?.[2]
    if (value) return value.trim()
  }
  return undefined
}

function extractTitle(html: string): string | undefined {
  return (
    extractMeta(html, 'og:title', 'twitter:title')
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
  )
}

export interface PageMeta {
  url: string
  title?: string
  description?: string
  image?: string
  markdown?: string
}

export async function extractPage(
  url: string,
  includeMarkdown: boolean,
  ai?: Ai,
): Promise<PageMeta> {
  const res = await fetch(url, {
    headers: { Accept: 'text/markdown, text/html;q=0.9, */*;q=0.8' },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const body = await res.text()

  if (!body) return { url }

  // Site returns markdown natively (e.g. AI-friendly sites)
  if (contentType.includes('text/markdown')) {
    return { url, markdown: body.slice(0, MAX_MARKDOWN_LENGTH) }
  }

  // HTML: extract OG meta tags
  const title = extractTitle(body)
  const description = extractMeta(body, 'og:description', 'twitter:description', 'description')
  const image = extractMeta(body, 'og:image', 'twitter:image')

  let markdown: string | undefined
  if (includeMarkdown && contentType.includes('text/html') && ai) {
    try {
      // ai.toMarkdown() is a built-in Cloudflare AI utility available via the AI binding.
      // Docs: https://developers.cloudflare.com/workers-ai/markdown-conversion/
      const result = await ai.toMarkdown({ name: 'page.html', blob: new Blob([body], { type: 'text/html' }) })
      if (result.format === 'markdown' && result.data) {
        markdown = result.data.slice(0, MAX_MARKDOWN_LENGTH)
      }
    }
    catch {
      // AI conversion is best-effort
    }
  }

  return { url, title, description, image, markdown }
}
