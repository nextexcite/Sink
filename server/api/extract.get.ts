import { ofetch } from 'ofetch'
import { z } from 'zod'

const MAX_MARKDOWN_LENGTH = 4096

defineRouteMeta({
  openAPI: {
    description: 'Extract metadata and content from a URL. Useful for AI agents to preview pages before shortening.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'url',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'The URL to extract metadata from',
      },
      {
        name: 'markdown',
        in: 'query',
        required: false,
        schema: { type: 'boolean', default: false },
        description: 'Whether to include page content as markdown (requires AI binding)',
      },
    ],
  },
})

const ExtractQuerySchema = z.object({
  url: z.string().trim().url(),
  markdown: z.coerce.boolean().default(false),
})

function extractMetaContent(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1])
      return match[1].trim()
  }
  return undefined
}

function extractTitle(html: string): string | undefined {
  const ogTitle = extractMetaContent(html, 'og:title')
  if (ogTitle)
    return ogTitle
  const twitterTitle = extractMetaContent(html, 'twitter:title')
  if (twitterTitle)
    return twitterTitle
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim()
}

export default eventHandler(async (event) => {
  const { url, markdown: includeMarkdown } = await getValidatedQuery(event, ExtractQuerySchema.parse)

  const reqHeaders = Object.fromEntries(
    Object.entries(getHeaders(event)).filter(([_, v]) => v !== undefined),
  ) as Record<string, string>

  try {
    const response = await ofetch.raw(url, {
      headers: {
        ...reqHeaders,
        Accept: 'text/markdown, text/html;q=0.9, */*;q=0.8',
      },
      timeout: 8000,
      responseType: 'text',
    })

    const contentType = response.headers.get('content-type') || ''
    const body = response._data as string

    if (!body) {
      return { url, title: undefined, description: undefined, image: undefined, markdown: undefined }
    }

    // If site returns markdown directly, use it
    if (contentType.includes('text/markdown')) {
      return {
        url,
        title: undefined,
        description: undefined,
        image: undefined,
        markdown: body.slice(0, MAX_MARKDOWN_LENGTH),
      }
    }

    // Extract OG/meta tags from HTML
    const title = extractTitle(body)
    const description = extractMetaContent(body, 'og:description')
      ?? extractMetaContent(body, 'twitter:description')
      ?? extractMetaContent(body, 'description')
    const image = extractMetaContent(body, 'og:image')
      ?? extractMetaContent(body, 'twitter:image')

    let markdownContent: string | undefined
    if (includeMarkdown && contentType.includes('text/html')) {
      const { cloudflare } = event.context
      if (cloudflare?.env?.AI) {
        markdownContent = (await fetchPageMarkdown(event, url, cloudflare.env.AI)) ?? undefined
      }
    }

    return { url, title, description, image, markdown: markdownContent }
  }
  catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status) {
      throw createError({ status, statusText: `Failed to fetch URL: HTTP ${status}` })
    }
    throw createError({ status: 422, statusText: 'Failed to fetch URL' })
  }
})
