import { DomainSchema } from '#shared/schemas/domain'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Delete a registered domain',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['hostname'],
            properties: {
              hostname: { type: 'string', description: 'The hostname of the domain to delete' },
            },
          },
        },
      },
    },
  },
})

const DeleteSchema = z.object({
  hostname: DomainSchema.shape.hostname,
})

export default eventHandler(async (event) => {
  const { hostname } = await readValidatedBody(event, DeleteSchema.parse)
  const existing = await getDomain(event, hostname)
  if (!existing) {
    throw createError({ status: 404, statusText: 'Domain not found' })
  }
  await deleteDomain(event, hostname)
  setResponseStatus(event, 204)
})
