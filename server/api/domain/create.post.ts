import { DomainSchema } from '#shared/schemas/domain'

defineRouteMeta({
  openAPI: {
    description: 'Register a domain for parking or redirect',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['hostname'],
            properties: {
              hostname: { type: 'string', description: 'The domain hostname to register (e.g. example.com)' },
              target: { type: 'string', description: 'Target URL for redirect type domains' },
              type: { type: 'string', enum: ['redirect', 'parked'], description: 'Domain type', default: 'redirect' },
              comment: { type: 'string', description: 'Optional comment' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const domain = await readValidatedBody(event, DomainSchema.parse)

  const existing = await getDomain(event, domain.hostname)
  if (existing) {
    throw createError({ status: 409, statusText: 'Domain already exists' })
  }

  if (domain.type === 'redirect' && !domain.target) {
    throw createError({ status: 400, statusText: 'Target URL is required for redirect domains' })
  }

  await putDomain(event, domain)
  setResponseStatus(event, 201)
  return { domain }
})
