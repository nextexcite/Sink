import { DomainSchema } from '#shared/schemas/domain'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Query a domain by hostname',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'hostname',
        in: 'query',
        required: true,
        schema: { type: 'string' },
        description: 'The domain hostname to query',
      },
    ],
  },
})

const QuerySchema = z.object({
  hostname: DomainSchema.shape.hostname,
})

export default eventHandler(async (event) => {
  const { hostname } = await getValidatedQuery(event, QuerySchema.parse)

  const domain = await getDomain(event, hostname)
  if (!domain) {
    throw createError({ status: 404, statusText: 'Domain not found' })
  }

  return domain
})
