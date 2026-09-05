import { FastifyInstance } from 'fastify'

function getManifest(configStr?: string) {
  const hasConfig = !!configStr
  let decoded: any = null
  if (configStr) {
    try { decoded = JSON.parse(Buffer.from(configStr, 'base64').toString('utf-8')) } catch {}
  }
  return {
    id: 'com.embedded-translate',
    version: '0.1.0',
    name: 'Embedded Translate',
    description: 'Extract built-in subs and translate via OpenAI-compatible API. Perfect sync.',
    resources: ['subtitle'],
    types: ['movie','series'],
    idPrefixes: ['tt'],
    behaviorHints: { configurable: true, configurationRequired: !hasConfig },
    config: [{ key: 'config', type: 'text', title: 'Config (base64 from /configure)' }],
    catalogs: []
  }
}

export default async function manifestRoutes(app: FastifyInstance) {
  app.get('/manifest.json', async (req, reply) => {
    const { config } = req.query as any
    const accept = (req.headers.accept || '') as string
    // If browser visits manifest.json?config= directly, redirect to /configure?config= for auto-parse UX
    if (config && accept.includes('text/html')) {
      return reply.redirect(`/configure?config=${encodeURIComponent(config)}`, 302)
    }
    const manifest = getManifest(config)
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Content-Type', 'application/json')
    return manifest
  })
}
