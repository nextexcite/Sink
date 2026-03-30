/// <reference path="../../worker-configuration.d.ts" />

/**
 * Cloudflare Email Routing plugin.
 *
 * Handles incoming emails forwarded by Cloudflare Email Routing.
 * To enable, configure email routing rules in the Cloudflare dashboard
 * and add the `send_email` binding to wrangler.jsonc.
 *
 * @see https://developers.cloudflare.com/email-routing/email-workers/
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:email', async (event) => {
    const { message } = event as { message: ForwardableEmailMessage }

    const from = message.from
    const to = message.to

    console.info(`[email:routing] Received email from=${from} to=${to}`)

    // Forward email to all configured destinations.
    // Set NUXT_EMAIL_FORWARD_TO in your environment to enable forwarding.
    const config = useRuntimeConfig()
    const forwardTo = config.emailForwardTo

    if (forwardTo) {
      try {
        await message.forward(forwardTo)
        console.info(`[email:routing] Forwarded email from=${from} to=${forwardTo}`)
      }
      catch (err) {
        console.error(`[email:routing] Failed to forward email from=${from}:`, err)
        message.setReject('Internal error forwarding email')
      }
      return
    }

    // Default: reject unhandled emails gracefully
    message.setReject('Address not found')
  })
})
